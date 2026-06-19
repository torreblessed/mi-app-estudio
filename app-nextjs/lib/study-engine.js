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
  if (m.includes('ms-excel')          || n.endsWith('.xls'))  return true
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

  // 2. Cargar RUT del usuario para detección de calificaciones personales
  let userRut = null
  try {
    const { data: cfg } = await supabaseClient
      .from('configuracion_usuario').select('rut').eq('user_id', userId).maybeSingle()
    userRut = cfg?.rut || null
    if (userRut) log(`RUT configurado: ${userRut} (se buscará en archivos de calificaciones)`)
  } catch {}

  // 3. Análisis ya existentes
  const { data: yaAnalizados } = await supabaseClient
    .from('analisis_material').select('id, archivo_canvas_id, materia_id, flashcards, temas, resumen')
    .eq('user_id', userId)

  const analizadosSet     = new Set((yaAnalizados || []).filter(a => !isFailedAnalysis(a)).map(a => Number(a.archivo_canvas_id)))
  const failedAnalysisIds = new Set((yaAnalizados || []).filter(isFailedAnalysis).map(a => a.id))

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

  // 4. Recolectar archivos y páginas por materia
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
        // Include ALL files (grade files prioritized by moving them first)
        const gradeFiles = otros.filter(f => isGradeFile(f.display_name))
        const nonGrades  = otros.filter(f => !isGradeFile(f.display_name))
        const orderedOtros = [...gradeFiles, ...nonGrades].slice(0, MAX_FILES_PER_MATERIA)
        orderedOtros.forEach(f => {
          otrosPending.push({ file: f, materia, promptType: isGradeFile(f.display_name) ? 'notas' : null, source: 'file' })
        })
        if (otros.length > MAX_FILES_PER_MATERIA) {
          log(`  ${materia.nombre}: ${MAX_FILES_PER_MATERIA}/${otros.length} archivos regulares seleccionados`)
        }
        if (cronos.length) log(`  ${materia.nombre}: ${cronos.length} cronograma(s) en archivos`)
        if (gradeFiles.length) log(`  ${materia.nombre}: ${gradeFiles.length} archivo(s) de calificaciones`)
      }

      // ── Páginas del curso ─────────────────────────────────────────────────
      try {
        const pages = await getCoursePages(canvasConfig.url, canvasConfig.token, materia.canvas_id)
        if (Array.isArray(pages) && pages.length > 0) {
          const cronPages  = pages.filter(p => isCronograma(p.title || p.url))
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
              url:            null,
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

      // ── Módulos: items tipo File ───────────────────────────────────────────
      try {
        const mods = await getCourseModules(canvasConfig.url, canvasConfig.token, materia.canvas_id)
        if (Array.isArray(mods)) {
          for (const mod of mods) {
            const items = mod.items || []
            for (const item of items) {
              if (item.type === 'File' && item.content_id) {
                const fakeId = item.content_id
                if (!analizadosSet.has(fakeId) && item.url) {
                  const alreadyIn = [...cronogramasPending, ...otrosPending].some(p => p.file.id === fakeId)
                  if (!alreadyIn) {
                    const fileItem = {
                      id:             fakeId,
                      display_name:   item.title || `Módulo: ${mod.name}`,
                      url:            item.url,
                      'content-type': 'application/pdf',
                      size:           0,
                    }
                    if (canAnalyzeFile(fileItem['content-type'], fileItem.display_name)) {
                      if (isCronograma(fileItem.display_name)) {
                        cronogramasPending.push({ file: fileItem, materia, promptType: 'cronograma', source: 'module' })
                      } else if (otrosPending.filter(p => p.materia.id === materia.id).length < MAX_FILES_PER_MATERIA) {
                        otrosPending.push({ file: fileItem, materia, promptType: isGradeFile(fileItem.display_name) ? 'notas' : null, source: 'module' })
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

  // Per-materia tracking
  const materiaStats = {}
  for (const m of materias) {
    materiaStats[m.id] = { nombre: m.nombre, procesados: 0, conTexto: 0, calificaciones: 0, califUsuario: 0 }
  }

  // 5. Analizar cada item
  for (let i = 0; i < pending.length; i++) {
    const { file, materia, promptType, source } = pending[i]
    pct(10 + Math.round((i / pending.length) * 85))

    const icon   = promptType === 'cronograma' ? '📅' : promptType === 'notas' ? '📊' : '📄'
    const srcTag = source !== 'file' ? ` [${source}]` : ''
    log(`[${i + 1}/${pending.length}] ${icon} ${file.display_name}${srcTag}`)

    const controller = new AbortController()
    const timeoutId  = setTimeout(() => controller.abort(), TIMEOUT_MS)
    const mStat      = materiaStats[materia.id]

    try {
      let fileUrl  = file.url
      let mimeType = file['content-type']
      let fileText = null

      // Canvas page: fetch HTML content
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

      const headers = {
        'Content-Type':   'application/json',
        'x-canvas-url':   canvasConfig.url,
        'x-canvas-token': canvasConfig.token,
      }

      let res
      if (fileText) {
        res = await fetch('/api/analizar-material', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            fileText,
            mimeType: 'text/plain',
            fileName:   file.display_name,
            materia:    materia.nombre,
            promptType: promptType || null,
            userRut,
          }),
          signal: controller.signal,
        })
      } else {
        res = await fetch('/api/analizar-material', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            fileUrl,
            mimeType,
            fileName:   file.display_name,
            materia:    materia.nombre,
            fileSize:   file.size,
            promptType: promptType || null,
            userRut,
          }),
          signal: controller.signal,
        })
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        log(`  ⚠ Saltado: ${err.error || `HTTP ${res.status}`}`)
        totalFallidos++
        mStat.procesados++
        continue
      }

      const analysis = await res.json()
      mStat.procesados++

      // Log extraction details
      if (analysis._charCount) {
        const chars = analysis._charCount
        const kb    = chars < 1024 ? `${chars} chars` : `${(chars / 1024).toFixed(1)} KB`
        const method = analysis._extractMethod ? ` [${analysis._extractMethod}]` : ''
        const gradeFlag = analysis._isGrades ? ' 📊GRADES' : ''
        const rutFlag   = analysis._hasUserGrade ? ' ✓RUT' : ''
        log(`  📝 ${kb}${method}${gradeFlag}${rutFlag}${analysis._truncated ? ' (truncado)' : ''}`)
        if (analysis._extractMethod && analysis._extractMethod !== 'inlineData' && analysis._extractMethod !== 'page-html') {
          mStat.conTexto++
        }
      }
      if (analysis._isGrades) mStat.calificaciones++
      if (analysis._hasUserGrade) mStat.califUsuario++

      const { _charCount, _truncated, _extractMethod, _isGrades, _hasUserGrade, ...cleanAnalysis } = analysis

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
      materiaStats[materia.id].procesados++
    } finally {
      clearTimeout(timeoutId)
    }
  }

  pct(100)

  // ── Resumen global ────────────────────────────────────────────────────────
  log(`\n── Resumen ──────────────────────────────────────`)
  log(`📁 Analizados: ${totalAnalizados}/${pending.length}${totalFallidos ? ` · Fallidos: ${totalFallidos}` : ''}`)
  log(`🃏 Flashcards: ${totalFlashcards} · 📅 Fechas evaluación: ${totalEvaluaciones}`)

  // ── Resumen por materia ───────────────────────────────────────────────────
  const materiaGroups = {}
  pending.forEach(({ materia }) => {
    if (!materiaGroups[materia.id]) materiaGroups[materia.id] = { nombre: materia.nombre, count: 0 }
    materiaGroups[materia.id].count++
  })

  log(`\n── Por materia ──────────────────────────────────`)
  for (const [mid, stat] of Object.entries(materiaStats)) {
    const group = materiaGroups[mid]
    if (!group || group.count === 0) continue
    log(
      `[${stat.nombre}] Archivos: ${stat.procesados} procesados` +
      `, ${stat.conTexto} con texto extraído` +
      `, ${stat.calificaciones} identificados como calificaciones` +
      `, ${stat.califUsuario} con calificaciones del usuario`
    )
  }

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
