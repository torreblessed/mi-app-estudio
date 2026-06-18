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

// Prioridad de archivo: menor número = más relevante para analizar primero
function filePriority(fileName) {
  const n = (fileName || '').toLowerCase()
  if (n.includes('temario') || n.includes('cronograma'))                              return 0
  if (n.includes('programa') || n.includes('pauta') || n.includes('syllabus'))        return 1
  if (n.includes('ayudant'))                                                           return 2
  if (n.includes('guia') || n.includes('guía') || n.includes('ejercicio') || n.includes('taller')) return 3
  if (n.includes('ppt') || n.includes('presentaci'))                                  return 4
  return 5
}

const MAX_FILES_PER_MATERIA = 10
const TIMEOUT_MS = 30_000

// ── Motor de análisis principal ───────────────────────────────────────────────

export async function analizarMateriales(userId, supabaseClient, canvasConfig, callbacks = {}) {
  const { onLog, onProgress } = callbacks
  const log = msg => { console.log('[StudyEngine]', msg); onLog?.(msg) }
  const pct = n   => onProgress?.(n)

  // 1. Obtener materias con canvas_id
  const { data: materias, error: matErr } = await supabaseClient
    .from('materias').select('id, nombre, canvas_id')
    .eq('user_id', userId).not('canvas_id', 'is', null).neq('activa', false)

  if (matErr || !materias?.length) {
    log('No hay materias sincronizadas con Canvas.')
    pct(100)
    return { totalAnalizados: 0, totalFallidos: 0, totalFlashcards: 0, totalEvaluaciones: 0, totalArchivos: 0 }
  }

  // 2. IDs ya analizados (para no duplicar)
  const { data: yaAnalizados } = await supabaseClient
    .from('analisis_material').select('archivo_canvas_id').eq('user_id', userId)
  const analizadosSet = new Set((yaAnalizados || []).map(a => Number(a.archivo_canvas_id)))

  log(`Revisando archivos de ${materias.length} materia(s)…`)
  pct(5)

  // 3. Recolectar archivos pendientes (máx 10 por materia, priorizados)
  const pending = []
  for (const materia of materias) {
    try {
      const files = await getCourseFiles(canvasConfig.url, canvasConfig.token, materia.canvas_id)
      if (!Array.isArray(files)) continue

      const eligible = files.filter(f =>
        !analizadosSet.has(Number(f.id)) && canAnalyzeFile(f['content-type'], f.display_name)
      )

      // Ordenar por prioridad y tomar los primeros MAX_FILES_PER_MATERIA
      eligible.sort((a, b) => filePriority(a.display_name) - filePriority(b.display_name))
      const selected = eligible.slice(0, MAX_FILES_PER_MATERIA)

      if (eligible.length > MAX_FILES_PER_MATERIA) {
        log(`  ${materia.nombre}: ${selected.length} de ${eligible.length} archivos seleccionados (resto disponible para análisis manual)`)
      }

      for (const f of selected) pending.push({ file: f, materia })
    } catch (err) {
      // Silenciar errores 403 (sin acceso al curso)
      if (err.message.includes('403')) continue
      log(`⚠ Error obteniendo archivos de ${materia.nombre}: ${err.message}`)
    }
  }

  if (!pending.length) {
    log('Todos los archivos ya fueron analizados anteriormente.')
    pct(100)
    return { totalAnalizados: 0, totalFallidos: 0, totalFlashcards: 0, totalEvaluaciones: 0, totalArchivos: 0 }
  }

  log(`${pending.length} archivo(s) nuevo(s) para analizar.`)
  pct(10)

  let totalAnalizados  = 0
  let totalFallidos    = 0
  let totalFlashcards  = 0
  let totalEvaluaciones = 0

  // 4. Analizar cada archivo con timeout de 30 s
  for (let i = 0; i < pending.length; i++) {
    const { file, materia } = pending[i]
    pct(10 + Math.round((i / pending.length) * 85))
    log(`[${i + 1}/${pending.length}] ${file.display_name}`)

    const controller = new AbortController()
    const timeoutId  = setTimeout(() => controller.abort(), TIMEOUT_MS)

    try {
      const res = await fetch('/api/analizar-material', {
        method: 'POST',
        headers: {
          'Content-Type':   'application/json',
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
        signal: controller.signal,
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        log(`  ⚠ Saltado: ${err.error || `HTTP ${res.status}`}`)
        totalFallidos++
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
        totalFallidos++
      } else {
        totalAnalizados++
        const fc = (analysis.flashcards          || []).length
        const ev = (analysis.fechas_evaluaciones || []).length
        totalFlashcards   += fc
        totalEvaluaciones += ev
        log(`  ✓ ${analysis.tipo_material || 'otro'} · ${fc} flashcards · ${ev} evaluaci${ev !== 1 ? 'ones' : 'ón'}`)
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        log(`  ⏱ Timeout (30 s) — saltado`)
      } else {
        log(`  ✗ ${err.message}`)
      }
      totalFallidos++
    } finally {
      clearTimeout(timeoutId)
    }
  }

  pct(100)
  log(`\n── Resumen ──────────────────────────────────────`)
  log(`📁 Analizados: ${totalAnalizados} de ${pending.length}${totalFallidos ? ` · Fallidos: ${totalFallidos}` : ''}`)
  log(`🃏 Flashcards generadas: ${totalFlashcards}`)
  log(`📅 Fechas de evaluación: ${totalEvaluaciones}`)

  return { totalAnalizados, totalFallidos, totalFlashcards, totalEvaluaciones, totalArchivos: pending.length }
}
