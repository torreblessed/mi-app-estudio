export const maxDuration = 60

import { extractText, detectGradeContent, findRutInText, truncateExtracted } from '@/lib/pdf-extractor'

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalizeMime(raw) {
  const m = (raw || '').toLowerCase()
  if (m.includes('pdf'))                       return 'application/pdf'
  if (m.startsWith('text/'))                   return m.split(';')[0].trim()
  if (m.includes('wordprocessingml.document')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  if (m.includes('presentationml.presentation')) return 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  if (m.includes('spreadsheetml.sheet'))       return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  if (m.includes('ms-excel') || m.includes('vnd.ms-excel')) return 'application/vnd.ms-excel'
  if (m.includes('rtf'))                       return 'application/rtf'
  return null
}

function isTextMime(mime, fileName) {
  const m = (mime || '').toLowerCase()
  const n = (fileName || '').toLowerCase()
  return m.startsWith('text/') || n.endsWith('.txt') || n.endsWith('.md') || n.endsWith('.rtf')
}

function isPresentationMime(mime, fileName) {
  const m = (mime || '').toLowerCase()
  const n = (fileName || '').toLowerCase()
  return m.includes('presentationml') || n.endsWith('.pptx') || n.endsWith('.ppt')
}

function extractJson(text) {
  if (!text) return null
  try { return JSON.parse(text.trim()) } catch {}
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fence) { try { return JSON.parse(fence[1].trim()) } catch {} }
  const start = text.indexOf('{')
  const end   = text.lastIndexOf('}')
  if (start !== -1 && end > start) {
    try { return JSON.parse(text.slice(start, end + 1)) } catch {}
  }
  return null
}

// ── Prompts ───────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Eres un asistente académico experto. Analiza el siguiente material universitario y devuelve SOLO JSON válido con esta estructura exacta:
{
  "tipo_material": "temario|ppt|guía|ayudantía|apunte|otro",
  "temas_principales": ["tema 1", "tema 2"],
  "conceptos_clave": [
    {"concepto": "nombre", "explicacion_breve": "una línea"}
  ],
  "fechas_evaluaciones": [
    {"tipo": "prueba|control|quiz|entrega|tarea|examen", "fecha": "YYYY-MM-DD", "temas_incluidos": ["tema1"], "descripcion": "Prueba 2 — Integración", "ponderacion": 25}
  ],
  "preguntas_practica": [
    {"pregunta": "texto completo", "respuesta_correcta": "respuesta detallada de 2-4 líneas explicando el por qué", "dificultad": "facil|medio|dificil"}
  ],
  "flashcards": [
    {"frente": "pregunta o concepto", "reverso": "respuesta o definición completa"}
  ],
  "resumen": "Resumen completo de 5-8 líneas cubriendo los temas y conceptos principales del material"
}

Reglas:
- Genera MÍNIMO 8 flashcards variadas (conceptos, definiciones, fórmulas, aplicaciones, ejemplos)
- Genera MÍNIMO 5 preguntas de práctica con respuestas detalladas que expliquen el razonamiento
- El campo "ponderacion" es el % de la nota final (ej: 25 para 25%); inclúyelo si aparece en el material, omítelo si no
- Si el campo "fecha" no es claro, usa el formato YYYY-MM-DD con tu mejor estimación o déjalo vacío
- Devuelve ÚNICAMENTE el JSON, sin texto adicional, sin comentarios, sin markdown`

const PROMPT_STANDARD = `Analiza este material académico. Devuelve ÚNICAMENTE el JSON especificado, sin texto adicional.`

const PROMPT_CRONOGRAMA = `Este es un cronograma, programa o syllabus de un curso universitario.

Tu tarea PRINCIPAL es extraer TODAS las fechas de evaluaciones, controles, pruebas, entregas, quizzes y actividades evaluadas. Para cada una incluye:
- tipo (prueba/control/quiz/entrega/tarea/examen)
- fecha exacta en formato YYYY-MM-DD
- temas que entran o contenido evaluado
- ponderación como porcentaje si aparece (ej: ponderacion: 25 para 25%)
- descripción completa (nombre oficial de la evaluación)

También extrae hitos importantes: inicio de semestre, semana de exámenes, fechas de entrega de proyectos.

Devuelve ÚNICAMENTE el JSON especificado.`

const PROMPT_NOTAS = `Este archivo contiene calificaciones o resultados de evaluaciones.

Extrae todas las calificaciones que encuentres. Ignora RUTs, nombres de personas y cualquier dato personal identificable.
Para cada evaluación encontrada, incluye en "fechas_evaluaciones":
- tipo: "resultado"
- descripcion: nombre de la evaluación
- temas_incluidos: ["promedio del curso: X.X"] si aparece el promedio

Si encuentras el promedio del curso, agrégalo en "conceptos_clave" como {"concepto": "Promedio curso", "explicacion_breve": "X.X / 7.0"}.

Devuelve ÚNICAMENTE el JSON especificado.`

function buildNotasPromptWithRut(userRut) {
  if (!userRut) return PROMPT_NOTAS
  return `${PROMPT_NOTAS}

IMPORTANTE: El RUT del estudiante es "${userRut}". Si encuentras este RUT en el documento, extrae TODAS las calificaciones asociadas a esa fila/persona específicamente, e inclúyelas en "conceptos_clave" como: {"concepto": "Mi nota — <nombre evaluación>", "explicacion_breve": "<nota> / <nota_maxima>"}.`
}

const MAX_TEXT_CHARS = 15_000
const MIN_TEXT_CHARS = 100

// ── Gemini call ───────────────────────────────────────────────────────────────

async function callGemini(apiKey, parts, systemPrompt) {
  const body = {
    contents: [{ parts }],
    system_instruction: { parts: [{ text: systemPrompt }] },
    generationConfig: {
      maxOutputTokens: 8192,
      temperature: 0.1,
      responseMimeType: 'application/json',
    },
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 25_000)
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: controller.signal }
    )
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error?.message || `Gemini error ${res.status}`)
    }
    const data = await res.json()
    return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
  } finally {
    clearTimeout(timer)
  }
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(request) {
  try {
    const { fileUrl, fileText, mimeType, fileName, materia, fileSize, promptType, userRut } = await request.json()
    const canvasToken = request.headers.get('x-canvas-token')
    const apiKey      = process.env.GEMINI_API_KEY

    if (!apiKey)               return Response.json({ error: 'GEMINI_API_KEY no configurada.' }, { status: 500 })
    if (!fileUrl && !fileText) return Response.json({ error: 'fileUrl o fileText requerido.' }, { status: 400 })
    if (!canvasToken)          return Response.json({ error: 'x-canvas-token requerido.' }, { status: 400 })

    const MAX_BYTES = 10 * 1024 * 1024
    if (fileSize && fileSize > MAX_BYTES) {
      return Response.json({ error: `Archivo demasiado grande (${Math.round(fileSize / 1024 / 1024)} MB > 10 MB).` }, { status: 422 })
    }

    // ── Path 1: fileText directo (páginas Canvas HTML) ─────────────────────
    if (fileText) {
      const text = String(fileText).slice(0, MAX_TEXT_CHARS)
      const resolvedPromptType = promptType || (detectGradeContent(text) ? 'notas' : null)
      const filePrompt = resolvedPromptType === 'cronograma' ? PROMPT_CRONOGRAMA
                       : resolvedPromptType === 'notas'      ? buildNotasPromptWithRut(userRut)
                       : PROMPT_STANDARD
      const parts = [{ text: `Nombre: "${fileName}"\nMateria: "${materia}"\n\nContenido:\n${text}\n\n${filePrompt}` }]

      let analysis = null, lastErr = null
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const rawText = await callGemini(apiKey, parts, SYSTEM_PROMPT)
          analysis = extractJson(rawText)
          if (analysis) break
        } catch (err) {
          lastErr = err
          if (attempt === 0) await new Promise(r => setTimeout(r, 2000))
        }
      }
      if (!analysis) return Response.json({ error: lastErr?.message || 'Sin respuesta' }, { status: 422 })
      return Response.json({
        ...analysis,
        _charCount:   text.length,
        _truncated:   fileText.length > MAX_TEXT_CHARS,
        _extractMethod: 'page-html',
        _isGrades:    resolvedPromptType === 'notas',
      })
    }

    // ── Download from Canvas ───────────────────────────────────────────────
    const fileRes = await fetch(fileUrl, {
      headers: { 'Authorization': `Bearer ${canvasToken}` },
      redirect: 'follow',
    })
    if (!fileRes.ok) {
      return Response.json({ error: `No se pudo descargar el archivo (HTTP ${fileRes.status}).` }, { status: 422 })
    }

    const buffer = Buffer.from(await fileRes.arrayBuffer())
    if (buffer.byteLength > MAX_BYTES) {
      return Response.json({ error: `Archivo demasiado grande (${Math.round(buffer.byteLength / 1024 / 1024)} MB > 10 MB).` }, { status: 422 })
    }

    const mime = normalizeMime(mimeType)
    if (!mime) {
      return Response.json({ error: `Tipo de archivo no soportado: ${mimeType}` }, { status: 422 })
    }

    // ── Path 2: extract text locally (PDF / DOCX / XLSX / text) ───────────
    const extracted = await extractText(buffer, mime, fileName)
    const extractedOk = extracted?.text && extracted.text.length >= MIN_TEXT_CHARS

    if (extractedOk) {
      const rawText      = extracted.text
      // Detect grade content from actual text, regardless of filename
      const isGradeByContent  = detectGradeContent(rawText)
      const isGradeByFilename = promptType === 'notas'
      const isGrades          = isGradeByContent || isGradeByFilename
      const hasUserGrade      = isGrades && findRutInText(rawText, userRut)

      const resolvedPromptType = promptType === 'cronograma' ? 'cronograma'
                               : isGrades                    ? 'notas'
                               : null

      const filePrompt = resolvedPromptType === 'cronograma' ? PROMPT_CRONOGRAMA
                       : resolvedPromptType === 'notas'      ? buildNotasPromptWithRut(hasUserGrade ? userRut : null)
                       : PROMPT_STANDARD

      const { finalText, truncated } = truncateExtracted(rawText)

      const parts = [{
        text: `Nombre del archivo: "${fileName}"\nMateria: "${materia}"\nMétodo extracción: ${extracted.method}${extracted.pages ? `, ${extracted.pages} páginas` : ''}\n\nContenido:\n${finalText}\n\n${filePrompt}`,
      }]

      console.log(
        `[analizar-material] ${fileName} | ${extracted.method} | ${extracted.charCount} chars` +
        `${isGrades ? ' | GRADES' : ''}${hasUserGrade ? ' | RUT_FOUND' : ''}${truncated ? ' | truncated' : ''}`
      )

      let analysis = null, lastErr = null
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const rawResp = await callGemini(apiKey, parts, SYSTEM_PROMPT)
          analysis = extractJson(rawResp)
          if (analysis) break
        } catch (err) {
          lastErr = err
          if (attempt === 0) await new Promise(r => setTimeout(r, 2000))
        }
      }
      if (!analysis) return Response.json({ error: lastErr?.message || 'Gemini no respondió.' }, { status: 422 })

      return Response.json({
        ...analysis,
        _charCount:     extracted.charCount,
        _truncated:     truncated,
        _extractMethod: extracted.method,
        _isGrades:      isGrades,
        _hasUserGrade:  hasUserGrade,
      })
    }

    // ── Path 3: fallback to Gemini inlineData (PPTX, images, image-based PDFs)
    if (extracted && !extractedOk) {
      console.log(`[analizar-material] ${fileName} | ${extracted.method} | ${extracted.reason || 'empty'} | falling back to inlineData`)
    } else {
      console.log(`[analizar-material] ${fileName} | no extractor for ${mime} | using inlineData`)
    }

    if (!isPresentationMime(mime, fileName) && isTextMime(mime, fileName)) {
      // Shouldn't reach here normally, but handle text fallback
      const text  = buffer.toString('utf-8').replace(/\r\n/g, '\n')
      if (text.length < MIN_TEXT_CHARS) {
        return Response.json({ error: `Contenido insuficiente (${text.length} caracteres).` }, { status: 422 })
      }
      const slice = text.slice(0, MAX_TEXT_CHARS)
      const filePrompt = promptType === 'cronograma' ? PROMPT_CRONOGRAMA
                       : promptType === 'notas'      ? buildNotasPromptWithRut(userRut)
                       : PROMPT_STANDARD
      const parts = [{ text: `Nombre: "${fileName}"\nMateria: "${materia}"\n\nContenido:\n${slice}\n\n${filePrompt}` }]
      let analysis = null
      for (let attempt = 0; attempt < 2; attempt++) {
        try { const r = await callGemini(apiKey, parts, SYSTEM_PROMPT); analysis = extractJson(r); if (analysis) break } catch {}
        if (attempt === 0) await new Promise(r => setTimeout(r, 2000))
      }
      if (!analysis) return Response.json({ error: 'Gemini no devolvió JSON válido.' }, { status: 422 })
      return Response.json({ ...analysis, _charCount: text.length, _truncated: text.length > MAX_TEXT_CHARS, _extractMethod: 'text-fallback' })
    }

    // Binary file (PPTX, image-PDF): send as inlineData to Gemini
    const filePrompt = promptType === 'cronograma' ? PROMPT_CRONOGRAMA
                     : promptType === 'notas'      ? buildNotasPromptWithRut(userRut)
                     : PROMPT_STANDARD
    const base64 = buffer.toString('base64')
    const parts  = [
      { inlineData: { mimeType: mime, data: base64 } },
      { text: `Nombre del archivo: "${fileName}"\nMateria: "${materia}"\n\n${filePrompt}` },
    ]

    let analysis = null, lastErr = null
    for (let attempt = 0; attempt < 2; attempt++) {
      let rawText = ''
      try {
        rawText = await callGemini(apiKey, parts, SYSTEM_PROMPT)
      } catch (err) {
        lastErr = err
        console.warn(`[analizar-material] inlineData intento ${attempt + 1} falló:`, err.message)
        if (attempt === 0) await new Promise(r => setTimeout(r, 2000))
        continue
      }
      analysis = extractJson(rawText)
      if (analysis) break
      lastErr = new Error('JSON inválido')
      if (attempt === 0) await new Promise(r => setTimeout(r, 2000))
    }

    if (!analysis) {
      return Response.json({
        error: lastErr?.message === 'JSON inválido'
          ? 'Gemini no devolvió JSON válido.'
          : (lastErr?.message || 'Gemini no respondió.'),
      }, { status: 422 })
    }

    return Response.json({
      ...analysis,
      _charCount:     buffer.byteLength,
      _truncated:     false,
      _extractMethod: 'inlineData',
    })

  } catch (err) {
    console.error('[analizar-material]', err)
    return Response.json({ error: err.message || 'Error interno.' }, { status: 500 })
  }
}
