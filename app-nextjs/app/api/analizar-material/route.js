// Aumentar timeout para archivos grandes con Gemini (requiere Vercel Pro para > 10s)
export const maxDuration = 60

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalizeMime(raw) {
  const m = (raw || '').toLowerCase()
  if (m.includes('pdf'))                       return 'application/pdf'
  if (m.startsWith('text/'))                   return m.split(';')[0].trim()
  if (m.includes('wordprocessingml.document')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  if (m.includes('presentationml.presentation')) return 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  if (m.includes('spreadsheetml.sheet'))       return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  if (m.includes('rtf'))                       return 'application/rtf'
  return null
}

function extractJson(text) {
  if (!text) return null
  // Direct parse
  try { return JSON.parse(text) } catch {}
  // Strip markdown fences
  const s = text
    .replace(/^```json\s*/i, '').replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '').trim()
  try { return JSON.parse(s) } catch {}
  // Extract first {...} block
  const m = s.match(/\{[\s\S]*\}/)
  if (m) { try { return JSON.parse(m[0]) } catch {} }
  return null
}

const SYSTEM_PROMPT = `Eres un asistente académico experto. Analiza el siguiente material universitario y devuelve SOLO JSON válido con esta estructura:
{
  "tipo_material": "temario|ppt|guía|ayudantía|apunte|otro",
  "temas_principales": ["tema 1", "tema 2"],
  "conceptos_clave": [
    {"concepto": "nombre", "explicacion_breve": "una línea"}
  ],
  "fechas_evaluaciones": [
    {"tipo": "prueba|control|quiz|entrega", "fecha": "YYYY-MM-DD", "temas_incluidos": ["tema1", "tema2"], "descripcion": "Prueba 2 - Derivadas parciales"}
  ],
  "preguntas_practica": [
    {"pregunta": "texto", "respuesta_correcta": "texto", "dificultad": "facil|medio|dificil"}
  ],
  "flashcards": [
    {"frente": "pregunta o concepto", "reverso": "respuesta o definición"}
  ],
  "resumen": "Resumen de 3-5 líneas del material"
}

Si es un temario o cronograma, prioriza extraer las fechas de evaluaciones y qué temas entran en cada una.
Si es una PPT o guía, prioriza generar preguntas de práctica y flashcards.
Si es material de ayudantía, identifica ejercicios tipo que podrían caer en evaluación.
Genera al menos 5 flashcards y 3 preguntas de práctica por material.`

async function callGemini(apiKey, base64, mimeType, fileName, materia) {
  const body = {
    contents: [{
      parts: [
        { inlineData: { mimeType, data: base64 } },
        { text: `Nombre del archivo: "${fileName}"\nMateria: "${materia}"\n\nAnaliza este material académico y devuelve ÚNICAMENTE el JSON solicitado, sin texto adicional ni markdown.` },
      ],
    }],
    system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
    generationConfig: {
      maxOutputTokens: 4096,
      temperature: 0.1,
      responseMimeType: 'application/json',
    },
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
  )

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message || `Gemini error ${res.status}`)
  }

  const data = await res.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(request) {
  try {
    const { fileUrl, mimeType, fileName, materia, fileSize } = await request.json()
    const canvasToken = request.headers.get('x-canvas-token')
    const apiKey      = process.env.GEMINI_API_KEY

    if (!apiKey)        return Response.json({ error: 'GEMINI_API_KEY no configurada.' }, { status: 500 })
    if (!fileUrl)       return Response.json({ error: 'fileUrl requerido.' }, { status: 400 })
    if (!canvasToken)   return Response.json({ error: 'x-canvas-token requerido.' }, { status: 400 })

    // Saltar archivos > 10 MB (límite seguro para Gemini inline data)
    const MAX_BYTES = 10 * 1024 * 1024
    if (fileSize && fileSize > MAX_BYTES) {
      return Response.json(
        { error: `Archivo demasiado grande (${Math.round(fileSize / 1024 / 1024)} MB > 10 MB).` },
        { status: 422 }
      )
    }

    const mime = normalizeMime(mimeType)
    if (!mime) {
      return Response.json({ error: `Tipo de archivo no soportado: ${mimeType}` }, { status: 422 })
    }

    // Descargar archivo desde Canvas
    const fileRes = await fetch(fileUrl, {
      headers: { 'Authorization': `Bearer ${canvasToken}` },
      redirect: 'follow',
    })

    if (!fileRes.ok) {
      return Response.json(
        { error: `No se pudo descargar el archivo (HTTP ${fileRes.status}).` },
        { status: 422 }
      )
    }

    // Verificar tamaño real después de descargar
    const buffer = await fileRes.arrayBuffer()
    if (buffer.byteLength > MAX_BYTES) {
      return Response.json({ error: `Archivo demasiado grande (${Math.round(buffer.byteLength / 1024 / 1024)} MB > 10 MB).` }, { status: 422 })
    }

    const base64 = Buffer.from(buffer).toString('base64')

    // Llamar a Gemini con un reintento
    let rawText = ''
    let lastErr = null
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        rawText = await callGemini(apiKey, base64, mime, fileName, materia)
        break
      } catch (err) {
        lastErr = err
        console.warn(`[analizar-material] Intento ${attempt + 1} falló:`, err.message)
        if (attempt === 0) await new Promise(r => setTimeout(r, 2000))
      }
    }

    if (!rawText) {
      return Response.json({ error: lastErr?.message || 'Gemini no respondió.' }, { status: 500 })
    }

    const analysis = extractJson(rawText)
    if (!analysis) {
      console.error('[analizar-material] JSON inválido. Preview:', rawText.slice(0, 400))
      return Response.json({ error: 'Gemini no devolvió JSON válido.' }, { status: 422 })
    }

    return Response.json(analysis)
  } catch (err) {
    console.error('[analizar-material]', err)
    return Response.json({ error: err.message || 'Error interno.' }, { status: 500 })
  }
}
