import { getCourseFiles, getCoursePages, getCoursePage, getCourseModules } from './canvas'

// ── Clasificación de archivos ─────────────────────────────────────────────────

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

function isCronograma(name) {
  const n = (name || '').toLowerCase()
  return n.includes('cronograma') || n.includes('calendario') || n.includes('programa') ||
    n.includes('syllabus') || n.includes('planificaci') || n.includes('fechas') ||
    n.includes('evaluaciones') || n.includes('temario') || n.includes('schedule') ||
    n.includes('programa de estudio') || n.includes('outline')
}

function isGradeFile(name) {
  const n = (name || '').toLowerCase()
  return n.includes('notas') || n.includes('calificaciones') || n.includes('pauta') ||
    n.includes('resultados') || n.includes('acta') || n.includes('corrección') ||
    n.includes('correccion') || n.includes('grades') || n.includes('scores')
}

function filePriority(fileName) {
  const n = (fileName || '').toLowerCase()
  if (n.includes('ayudant'))                                                           return 0
  if (n.includes('guia') || n.includes('guía') || n.includes('ejercicio') || n.includes('taller')) return 1
  if (n.includes('ppt') || n.includes('presentaci'))                                  return 2
  return 3
}

function isFailedAnalysis(a) {
  return (
    (!a.flashcards || a.flashcards.length === 0) &&
    (!a.temas || a.temas.length === 0) &&
    (!a.resumen || a.resumen.length < 30)
  )
}

const MAX_FILES_PER_MATERIA = 10
const TIMEOUT_MS = 35_000

// ── Motor principal ───────────────────────────────────────────────────────────

export async function analizarMateriales(userId, supabaseClient, canvasConfig, callbacks = {}) {
  const { onLog, onProgress } = callbacks
  const log = msg => { console.log('[StudyEngine]', msg); onLog?.(msg) }
  const pct = n   => onProgress?.(n)

  // 1. Materias activas con canvas_id
  const { data: materias, error: matErr } = await supabaseClient
    .from('materias').select('id, nombre, canvas_id')
    .eq('user_id', userId).not('canvas_id', 'is', null).neq('activa', false)

  if (matErr || !materias?.length) {
    log('No hay materias activas sincronizadas con Canvas.')
    pct(100)
    return { totalAnalizados: 0, totalFallidos: 0, totalFlashcards: 0, totalEvaluaciones: 0, totalArchivos: 0 }
  }

  // 2. Análisis ya existentes
  const { data: yaAnalizados } = await supabaseClient
    .from('analisis_material').select('id, archivo_canvas_id, materia_id, flashcards, temas, resumen')
    .eq('user_id', userId)

  const analizadosSet   = new Set((yaAnalizados || []).filter(a => !isFailedAnalysis(a)).map(a => Number(a.archivo_canvas_id)))
  const failedAnalysisIds = new Set((yaAnalizados || []).filter(isFailedAnalysis).map(a => a.id))

  // Borrar análisis fallidos para re-analizar
  if (failedAnalysisIds.size > 0) {
    log(`♻ Eliminando ${failedAnalysisIds.size} análisis incompletos para re-analizar…`)
    for (const id of failedAnalysisIds) {
      await supabaseClient.from('analisis_material').delete().eq('id', id)
    }
  }

  log(`Revisando archivos de ${materias.length} materia(s)…`)
  pct(5)

  const cronogramasPending = []
  const otrosPending       = []

  // 3. Recolectar archivos y páginas por materia
  for (const materia of materias) {
    try {
      // ── Archivos ──────────────────────────────────────────────────────────
      const files = await getCourseFiles(canvasConfig.url, canvasConfig.token, materia.canvas_id)
      if (Array.isArray(files)) {
        const eligible = files.filter(f =>
          !analizadosSet.has(Number(f.id)) && canAnalyzeFile(f['content-type'], f.display_name)
        )

        const cronos = eligible.filter(f => isCronograma(f.display_name))
        const otros  = eligible.filter(f => !isCronograma(f.display_name))

        cronos.forEach(f => cronogramasPending.push({ file: f, materia, promptType: 'cronograma', source: 'file' }))
        otros.sort((a, b) => filePriority(a.display_name) - filePriority(b.display_name))
        otros.slice(0, MAX_FILES_PER_MATERIA).forEach(f => {
          otrosPending.push({ file: f, materia, promptType: isGradeFile(f.display_name) ? 'notas' : null, source: 'file' })
        })
        if (otros.length > MAX_FILES_PER_MATERIA) {
          log(`  ${materia.nombre}: ${MAX_FILES_PER_MATERIA}/${otros.length} archivos regulares seleccionados`)
        }
        if (cronos.length) log(`  ${materia.nombre}: ${cronos.length} cronograma(s) en archivos`)
      }

      // ── Páginas del curso (buscar cronogramas y material relevante) ──────
      try {
        const pages = await getCoursePages(canvasConfig.url, canvasConfig.token, materia.canvas_id)
        if (Array.isArray(pages) && pages.length > 0) {
          // Usar file.id = -1 * index para evitar colisiones con archivos reales
          const cronPages = pages.filter(p => isCronograma(p.title || p.url))
          const otherPages = pages.filter(p => !isCronograma(p.title || p.url)).slice(0, 3)
          const relevantPages = [...cronPages, ...otherPages]

          for (let pi = 0; pi < relevantPages.length; pi++) {
            const page = relevantPages[pi]
            const fakeId = -(materia.canvas_id * 10000 + pi + 1)
            if (analizadosSet.has(fakeId)) continue
            const isCron = isCronograma(page.title || page.url)
            const pageItem = {
              id:             fakeId,
              display_name:   page.title || page.url,
              url:            null, // se carga al analizar
              'content-type': 'text/html',
              size:           0,
              _pageUrl:       page.url,
              _courseId:      materia.canvas_id,
            }
            if (isCron) {
              cronogramasPending.push({ file: pageItem, materia, promptType: 'cronograma', source: 'page' })
            } else {
              otrosPending.push({ file: pageItem, materia, promptType: null, source: 'page' })
            }
          }
          if (cronPages.length) log(`  ${materia.nombre}: ${cronPages.length} cronograma(s) en páginas`)
        }
      } catch {}

      // ── Módulos: buscar items tipo File aún no indexados ─────────────────
      try {
        const mods = await getCourseModules(canvasConfig.url, canvasConfig.token, materia.canvas_id)
        if (Array.isArray(mods)) {
          for (const mod of mods) {
            const items = mod.items || []
            for (const item of items) {
              if (item.type === 'File' && item.content_id) {
                const fakeId = item.content_id
                if (!analizadosSet.has(fakeId) && item.url) {
                  // Solo agregar si no está ya en la lista de archivos
                  const alreadyIn = [...cronogramasPending, ...otrosPending]
                    .some(p => p.file.id === fakeId)
                  if (!alreadyIn) {
                    const fileItem = {
                      id:             fakeId,
                      display_name:   item.title || `Módulo: ${mod.name}`,
                      url:            item.url,
                      'content-type': 'application/pdf', // asumir PDF para items de módulo
                      size:           0,
                    }
                    if (canAnalyzeFile(fileItem['content-type'], fileItem.display_name)) {
                      if (isCronograma(fileItem.display_name)) {
                        cronogramasPending.push({ file: fileItem, materia, promptType: 'cronograma', source: 'module' })
                      } else if (otrosPending.filter(p => p.materia.id === materia.id).length < MAX_FILES_PER_MATERIA) {
                        otrosPending.push({ file: fileItem, materia, promptType: null, source: 'module' })
                      }
                    }
                  }
                }
              }
            }
          }
        }
      } catch {}
    } catch (err) {
      if (!err.message.includes('403')) {
        log(`⚠ Error obteniendo archivos de ${materia.nombre}: ${err.message}`)
      }
    }
  }

  const pending = [...cronogramasPending, ...otrosPending]

  if (!pending.length) {
    log('Todos los archivos ya fueron analizados.')
    pct(100)
    return { totalAnalizados: 0, totalFallidos: 0, totalFlashcards: 0, totalEvaluaciones: 0, totalArchivos: 0 }
  }

  log(`${cronogramasPending.length} cronograma(s) + ${otrosPending.length} otro(s) = ${pending.length} total`)
  pct(10)

  let totalAnalizados = 0, totalFallidos = 0, totalFlashcards = 0, totalEvaluaciones = 0

  // 4. Analizar cada item
  for (let i = 0; i < pending.length; i++) {
    const { file, materia, promptType, source } = pending[i]
    pct(10 + Math.round((i / pending.length) * 85))

    const icon = promptType === 'cronograma' ? '📅' : promptType === 'notas' ? '📊' : '📄'
    const srcTag = source !== 'file' ? ` [${source}]` : ''
    log(`[${i + 1}/${pending.length}] ${icon} ${file.display_name}${srcTag}`)

    const controller = new AbortController()
    const timeoutId  = setTimeout(() => controller.abort(), TIMEOUT_MS)

    try {
      let fileUrl  = file.url
      let mimeType = file['content-type']
      let fileText = null

      // Si es una página de Canvas, obtener el HTML directamente
      if (source === 'page' && file._pageUrl) {
        try {
          const pageData = await getCoursePage(canvasConfig.url, canvasConfig.token, file._courseId, file._pageUrl)
          if (pageData?.body) {
            fileText = stripHtml(pageData.body)
            mimeType = 'text/plain'
          }
        } catch {
          log(`  ⚠ No se pudo leer la página`)
          totalFallidos++
          clearTimeout(timeoutId)
          continue
        }
      }

      let res
      if (fileText) {
        // Enviar como texto directo
        res = await fetch('/api/analizar-material', {
          method: 'POST',
          headers: {
            'Content-Type':   'application/json',
            'x-canvas-url':   canvasConfig.url,
            'x-canvas-token': canvasConfig.token,
          },
          body: JSON.stringify({
            fileText,
            mimeType: 'text/plain',
            fileName: file.display_name,
            materia:  materia.nombre,
            promptType: promptType || null,
          }),
          signal: controller.signal,
        })
      } else {
        res = await fetch('/api/analizar-material', {
          method: 'POST',
          headers: {
            'Content-Type':   'application/json',
            'x-canvas-url':   canvasConfig.url,
            'x-canvas-token': canvasConfig.token,
          },
          body: JSON.stringify({
            fileUrl,
            mimeType,
            fileName:   file.display_name,
            materia:    materia.nombre,
            fileSize:   file.size,
            promptType: promptType || null,
          }),
          signal: controller.signal,
        })
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        log(`  ⚠ Saltado: ${err.error || `HTTP ${res.status}`}`)
        totalFallidos++
        continue
      }

      const analysis = await res.json()

      if (analysis._charCount) {
        const kb = analysis._charCount < 1024
          ? `${analysis._charCount} chars`
          : `${(analysis._charCount / 1024).toFixed(1)} KB`
        log(`  📝 ${kb}${analysis._truncated ? ' (truncado)' : ''}`)
      }

      const { _charCount, _truncated, ...cleanAnalysis } = analysis

      const { error: saveErr } = await supabaseClient.from('analisis_material').insert({
        user_id:             userId,
        materia_id:          materia.id,
        archivo_nombre:      file.display_name,
        archivo_canvas_id:   file.id,
        tipo_material:       cleanAnalysis.tipo_material || 'otro',
        temas:               cleanAnalysis.temas_principales    || [],
        conceptos_clave:     cleanAnalysis.conceptos_clave      || [],
        fechas_evaluaciones: cleanAnalysis.fechas_evaluaciones  || [],
        preguntas_practica:  cleanAnalysis.preguntas_practica   || [],
        flashcards:          cleanAnalysis.flashcards           || [],
        resumen:             cleanAnalysis.resumen              || '',
        analizado_at:        new Date().toISOString(),
      })

      if (saveErr) {
        if (saveErr.code === '23505') {
          log(`  ↩ Ya analizado (duplicado)`)
        } else {
          log(`  ⚠ Error guardando: ${saveErr.message}`)
          totalFallidos++
        }
      } else {
        totalAnalizados++
        const fc = (cleanAnalysis.flashcards          || []).length
        const ev = (cleanAnalysis.fechas_evaluaciones || []).length
        totalFlashcards   += fc
        totalEvaluaciones += ev
        log(`  ✓ ${cleanAnalysis.tipo_material || 'otro'} · ${fc} flashcards · ${ev} fecha${ev !== 1 ? 's' : ''}`)
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        log(`  ⏱ Timeout — saltado`)
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
  log(`📁 Analizados: ${totalAnalizados}/${pending.length}${totalFallidos ? ` · Fallidos: ${totalFallidos}` : ''}`)
  log(`🃏 Flashcards: ${totalFlashcards} · 📅 Fechas evaluación: ${totalEvaluaciones}`)

  return { totalAnalizados, totalFallidos, totalFlashcards, totalEvaluaciones, totalArchivos: pending.length }
}

// ── Util: strip HTML tags ─────────────────────────────────────────────────────
function stripHtml(html) {
  return (html || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ').trim()
}
