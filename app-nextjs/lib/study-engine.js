import { getCourseFiles } from './canvas'

// ── Clasificación y filtrado de archivos ──────────────────────────────────────

export function classifyFile(fileName) {
  const n = (fileName || '').toLowerCase()
  if (n.includes('temario') || n.includes('cronograma') || n.includes('programa') ||
      n.includes('syllabus') || n.includes('planificaci'))       return 'temario'
  if (n.includes('ppt') || n.includes('presentaci') || n.includes('slides'))
                                                                  return 'ppt'
  if (n.includes('ayudant') || n.includes('auxiliar') || n.includes('tutorial'))
                                                                  return 'ayudantía'
  if (n.includes('guia') || n.includes('guía') || n.includes('ejercicio') || n.includes('taller'))
                                                                  return 'guía'
  if (n.includes('apunte') || n.includes('resumen') || n.includes('nota'))
                                                                  return 'apunte'
  return 'otro'
}

export function canAnalyzeFile(mimeType, fileName) {
  const m = (mimeType || '').toLowerCase()
  const n = (fileName  || '').toLowerCase()
  if (m.includes('pdf')               || n.endsWith('.pdf'))  return true
  if (m.startsWith('text/'))                                   return true
  if (m.includes('wordprocessingml')  || n.endsWith('.docx')) return true
  if (m.includes('presentationml')    || n.endsWith('.pptx')) return true
  if (m.includes('spreadsheetml')     || n.endsWith('.xlsx')) return true
  if (n.endsWith('.txt') || n.endsWith('.md') || n.endsWith('.rtf')) return true
  return false
}

// ── Motor de análisis principal ───────────────────────────────────────────────

export async function analizarMateriales(userId, supabaseClient, canvasConfig, callbacks = {}) {
  const { onLog, onProgress } = callbacks
  const log = msg => { console.log('[StudyEngine]', msg); onLog?.(msg) }
  const pct = n   => onProgress?.(n)

  // 1. Obtener materias con canvas_id
  const { data: materias, error: matErr } = await supabaseClient
    .from('materias').select('id, nombre, canvas_id')
    .eq('user_id', userId).not('canvas_id', 'is', null)

  if (matErr || !materias?.length) {
    log('No hay materias sincronizadas con Canvas.')
    pct(100)
    return { totalAnalizados: 0, totalFlashcards: 0, totalEvaluaciones: 0, totalArchivos: 0 }
  }

  // 2. IDs ya analizados (para no duplicar)
  const { data: yaAnalizados } = await supabaseClient
    .from('analisis_material').select('archivo_canvas_id').eq('user_id', userId)
  const analizadosSet = new Set((yaAnalizados || []).map(a => Number(a.archivo_canvas_id)))

  log(`Revisando archivos de ${materias.length} materia(s)…`)
  pct(5)

  // 3. Recolectar archivos pendientes
  const pending = []
  for (const materia of materias) {
    try {
      const files = await getCourseFiles(canvasConfig.url, canvasConfig.token, materia.canvas_id)
      if (!Array.isArray(files)) continue
      for (const f of files) {
        if (!analizadosSet.has(Number(f.id)) && canAnalyzeFile(f['content-type'], f.display_name)) {
          pending.push({ file: f, materia })
        }
      }
    } catch (err) {
      log(`⚠ Error obteniendo archivos de ${materia.nombre}: ${err.message}`)
    }
  }

  if (!pending.length) {
    log('Todos los archivos ya fueron analizados anteriormente.')
    pct(100)
    return { totalAnalizados: 0, totalFlashcards: 0, totalEvaluaciones: 0, totalArchivos: 0 }
  }

  log(`Encontré ${pending.length} archivo(s) nuevo(s) para analizar.`)
  pct(10)

  let totalAnalizados = 0
  let totalFlashcards  = 0
  let totalEvaluaciones = 0

  // 4. Analizar cada archivo
  for (let i = 0; i < pending.length; i++) {
    const { file, materia } = pending[i]
    pct(10 + Math.round((i / pending.length) * 85))
    log(`[${i + 1}/${pending.length}] ${file.display_name}`)

    try {
      const res = await fetch('/api/analizar-material', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-canvas-url':   canvasConfig.url,
          'x-canvas-token': canvasConfig.token,
        },
        body: JSON.stringify({
          fileUrl:  file.url,
          mimeType: file['content-type'],
          fileName: file.display_name,
          materia:  materia.nombre,
          fileSize: file.size,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        log(`  ⚠ Saltado: ${err.error || `HTTP ${res.status}`}`)
        continue
      }

      const analysis = await res.json()

      // 5. Guardar en Supabase
      const { error: saveErr } = await supabaseClient.from('analisis_material').insert({
        user_id:             userId,
        materia_id:          materia.id,
        archivo_nombre:      file.display_name,
        archivo_canvas_id:   file.id,
        tipo_material:       analysis.tipo_material || 'otro',
        temas:               analysis.temas_principales    || [],
        conceptos_clave:     analysis.conceptos_clave      || [],
        fechas_evaluaciones: analysis.fechas_evaluaciones  || [],
        preguntas_practica:  analysis.preguntas_practica   || [],
        flashcards:          analysis.flashcards           || [],
        resumen:             analysis.resumen              || '',
        analizado_at:        new Date().toISOString(),
      })

      if (saveErr) {
        log(`  ⚠ Error guardando: ${saveErr.message}`)
      } else {
        totalAnalizados++
        const fc = (analysis.flashcards          || []).length
        const ev = (analysis.fechas_evaluaciones || []).length
        totalFlashcards   += fc
        totalEvaluaciones += ev
        log(`  ✓ ${analysis.tipo_material || 'otro'} · ${fc} flashcards · ${ev} evaluaci${ev !== 1 ? 'ones' : 'ón'}`)
      }
    } catch (err) {
      log(`  ✗ ${err.message}`)
    }
  }

  pct(100)
  return { totalAnalizados, totalFlashcards, totalEvaluaciones, totalArchivos: pending.length }
}
