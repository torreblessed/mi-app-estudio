/**
 * Canvas LMS service — todas las llamadas van a través del proxy /api/canvas/[...path]
 * para evitar problemas de CORS.
 */

async function canvasRequest(canvasUrl, token, path, options = {}) {
  const res = await fetch('/api/canvas/' + path, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      'x-canvas-url': canvasUrl,
      'x-canvas-token': token,
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Canvas API error ${res.status}: ${text}`)
  }

  return res.json()
}

// ── Course listing ─────────────────────────────────────────────────────────────

export async function getCourses(canvasUrl, token) {
  return canvasRequest(canvasUrl, token,
    'api/v1/courses?enrollment_state=active&per_page=100&include[]=term&include[]=total_scores'
  )
}

export async function getCoursesRaw(canvasUrl, token) {
  return canvasRequest(canvasUrl, token,
    'api/v1/courses?per_page=100&include[]=term&include[]=enrollments&include[]=total_scores'
  )
}

// ── Assignments ────────────────────────────────────────────────────────────────

export async function getAssignments(canvasUrl, token, courseId) {
  return canvasRequest(canvasUrl, token,
    `api/v1/courses/${courseId}/assignments?per_page=100&order_by=due_at`
  )
}

export async function getAssignmentsWithSubmissions(canvasUrl, token, courseId) {
  return canvasRequest(canvasUrl, token,
    `api/v1/courses/${courseId}/assignments?per_page=100&order_by=due_at&include[]=submission`
  )
}

// ── Files ──────────────────────────────────────────────────────────────────────

export async function getCourseFiles(canvasUrl, token, courseId) {
  return canvasRequest(canvasUrl, token,
    `api/v1/courses/${courseId}/files?per_page=50&sort=updated_at&order=desc`
  )
}

// ── Modules ───────────────────────────────────────────────────────────────────

export async function getCourseModules(canvasUrl, token, courseId) {
  return canvasRequest(canvasUrl, token,
    `api/v1/courses/${courseId}/modules?per_page=50&include[]=items`
  )
}

export async function getModuleItems(canvasUrl, token, courseId, moduleId) {
  return canvasRequest(canvasUrl, token,
    `api/v1/courses/${courseId}/modules/${moduleId}/items?per_page=100`
  )
}

// ── Pages ─────────────────────────────────────────────────────────────────────

export async function getCoursePages(canvasUrl, token, courseId) {
  return canvasRequest(canvasUrl, token,
    `api/v1/courses/${courseId}/pages?per_page=50&sort=updated_at&order=desc`
  )
}

export async function getCoursePage(canvasUrl, token, courseId, pageUrl) {
  return canvasRequest(canvasUrl, token,
    `api/v1/courses/${courseId}/pages/${pageUrl}`
  )
}

// ── Enrollments (includes current_score / final_score) ────────────────────────

export async function getCourseEnrollments(canvasUrl, token, courseId) {
  return canvasRequest(canvasUrl, token,
    `api/v1/courses/${courseId}/enrollments?type[]=StudentEnrollment&per_page=10`
  )
}

// ── Announcements ──────────────────────────────────────────────────────────────

export async function getCourseAnnouncements(canvasUrl, token, courseId) {
  return canvasRequest(canvasUrl, token,
    `api/v1/courses/${courseId}/discussion_topics?only_announcements=true&per_page=20&order_by=recent_activity`
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function inferTipo(name, submissionTypes) {
  const n = (name || '').toLowerCase()
  if (n.includes('quiz') || n.includes('cuestionario'))                                          return 'quiz'
  if (n.includes('prueba') || n.includes('examen') || n.includes('test') ||
      n.includes('midterm') || n.includes('final') || n.includes('solemne'))                     return 'prueba'
  if (n.includes('entrega') || n.includes('assignment') || n.includes('lab') ||
      n.includes('informe') || n.includes('reporte') || n.includes('proyecto'))                  return 'entrega'
  if (n.includes('tarea') || n.includes('homework') || n.includes('hw'))                        return 'tarea'
  if (n.includes('lectura') || n.includes('reading'))                                            return 'lectura'
  if (n.includes('control') || n.includes('certamen'))                                          return 'prueba'
  const types = submissionTypes || []
  if (types.includes('online_quiz'))                                                             return 'quiz'
  if (types.includes('online_upload') || types.includes('online_text_entry'))                   return 'entrega'
  if (types.includes('discussion_topic'))                                                        return 'tarea'
  return 'tarea'
}

export function assignmentToTarea(assignment, courseName, userId) {
  return {
    user_id:              userId,
    titulo:               assignment.name,
    materia:              courseName,
    tipo:                 inferTipo(assignment.name, assignment.submission_types),
    fecha:                assignment.due_at ? assignment.due_at.slice(0, 10) : null,
    hora:                 assignment.due_at ? assignment.due_at.slice(11, 16) : null,
    completada:           assignment.has_submitted_submissions || false,
    duracion_min:         60,
    canvas_assignment_id: assignment.id,
  }
}

// ── Canvas config loader ───────────────────────────────────────────────────────

export async function loadCanvasConfig(supabaseClient, userId) {
  try {
    const cached = localStorage.getItem('canvas_config')
    if (cached) {
      const { url, token } = JSON.parse(cached)
      if (url && token) return { url, token }
    }
  } catch {}

  const { data } = await supabaseClient
    .from('configuracion_usuario')
    .select('canvas_url,canvas_token,ultima_sync')
    .eq('user_id', userId)
    .single()

  if (data?.canvas_url && data?.canvas_token) {
    try {
      localStorage.setItem('canvas_config', JSON.stringify({ url: data.canvas_url, token: data.canvas_token }))
    } catch {}
    return { url: data.canvas_url, token: data.canvas_token, lastSync: data.ultima_sync }
  }
  return null
}

// ── Diagnostic per course ──────────────────────────────────────────────────────

export async function diagnosticCourse(canvasUrl, token, courseId, courseName, onLog) {
  const log = msg => onLog?.(msg)
  const results = { assignments: 0, files: 0, modules: 0, pages: 0, enrollmentScore: null, errors: [] }

  // Assignments
  try {
    const a = await getAssignmentsWithSubmissions(canvasUrl, token, courseId)
    results.assignments = Array.isArray(a) ? a.length : 0
  } catch (e) { results.errors.push(`assignments: ${e.message}`) }

  // Files
  try {
    const f = await getCourseFiles(canvasUrl, token, courseId)
    results.files = Array.isArray(f) ? f.length : 0
  } catch (e) { results.errors.push(`files: ${e.message}`) }

  // Modules
  try {
    const m = await getCourseModules(canvasUrl, token, courseId)
    results.modules = Array.isArray(m) ? m.length : 0
  } catch (e) { results.errors.push(`modules: ${e.message}`) }

  // Pages
  try {
    const p = await getCoursePages(canvasUrl, token, courseId)
    results.pages = Array.isArray(p) ? p.length : 0
  } catch (e) { results.errors.push(`pages: ${e.message}`) }

  // Enrollment score
  try {
    const enr = await getCourseEnrollments(canvasUrl, token, courseId)
    if (Array.isArray(enr) && enr[0]?.grades) {
      const g = enr[0].grades
      results.enrollmentScore = g.current_score ?? g.final_score ?? null
    }
  } catch (e) { results.errors.push(`enrollments: ${e.message}`) }

  const summary = `${courseName}: ${results.assignments} assignments, ${results.files} archivos, ${results.modules} módulos, ${results.pages} páginas`
  log(summary + (results.errors.length ? ` ⚠ Errores: ${results.errors.join('; ')}` : ''))
  return results
}

// ── Main sync ─────────────────────────────────────────────────────────────────

/**
 * @param {string}   canvasUrl
 * @param {string}   token
 * @param {string}   userId
 * @param {object}   supabaseClient
 * @param {object}   callbacks         { onLog, onProgress }
 * @param {Array}    coursesToSync     Si se pasa, usa estos cursos. Si null, llama getCourses().
 */
export async function syncCanvasData(canvasUrl, token, userId, supabaseClient, callbacks = {}, coursesToSync = null) {
  const { onLog, onProgress } = callbacks
  const url = canvasUrl.trim().replace(/\/$/, '')
  const tok = token.trim()
  const db  = supabaseClient

  const log = (msg) => { console.log('[Canvas Sync]', msg); onLog?.(msg) }
  const pct = (n)   => onProgress?.(n)

  // ── 1. Cursos ──────────────────────────────────────────────────────────────
  let courses
  if (coursesToSync) {
    courses = coursesToSync.filter(c => !c.access_restricted_by_date)
    log(`Sincronizando ${courses.length} materia(s) seleccionada(s)…`)
  } else {
    log('Obteniendo cursos activos…')
    const allCourses = await getCourses(url, tok)
    if (!Array.isArray(allCourses)) throw new Error('Token inválido o URL incorrecta.')
    courses = allCourses.filter(c => !c.access_restricted_by_date)
    log(`${courses.length} curso(s) activo(s)`)
  }
  pct(5)

  const materiaSummary = []
  let totalMaterias = 0, totalTareas = 0, totalCalif = 0

  for (let i = 0; i < courses.length; i++) {
    const course  = courses[i]
    const materia = course.name
    log(`\n[${i + 1}/${courses.length}] ${materia}`)

    // ── Upsert materia ────────────────────────────────────────────────────
    const { data: existingMateria } = await db
      .from('materias').select('id').eq('user_id', userId).eq('canvas_id', course.id).maybeSingle()

    let materiaDbId = existingMateria?.id
    if (existingMateria) {
      await db.from('materias')
        .update({ nombre: materia, codigo: course.course_code || null, activa: true })
        .eq('id', existingMateria.id)
      totalMaterias++
    } else {
      const { data: ins } = await db.from('materias').insert({
        user_id: userId, nombre: materia,
        codigo: course.course_code || null, canvas_id: course.id, activa: true,
      }).select('id').single()
      materiaDbId = ins?.id
      totalMaterias++
    }

    let tareasCurso = 0, califCurso = 0, diagErrors = []

    // ── Assignments ────────────────────────────────────────────────────────
    try {
      const assignments = await getAssignmentsWithSubmissions(url, tok, course.id)
      log(`  → ${assignments.length} assignment(s)`)

      const cutoff = new Date(Date.now() - 90 * 86400000)

      for (const a of assignments) {
        // ── Tarea: todos los que tienen fecha (no solo 90 días) ──────────
        if (a.due_at) {
          const dueDate = new Date(a.due_at)
          const isFuture = dueDate > new Date()
          const isRecent = dueDate > cutoff
          if (isFuture || isRecent) {
            const { data: existingT } = await db.from('tareas').select('id')
              .eq('user_id', userId).eq('canvas_assignment_id', a.id).maybeSingle()
            const tareaData = assignmentToTarea(a, materia, userId)
            if (existingT) {
              await db.from('tareas').update({
                titulo: tareaData.titulo, tipo: tareaData.tipo,
                fecha: tareaData.fecha, hora: tareaData.hora,
                completada: tareaData.completada,
              }).eq('id', existingT.id)
              tareasCurso++
            } else {
              const { error } = await db.from('tareas').insert(tareaData)
              if (!error) tareasCurso++
              else if (!error.message?.includes('duplicate')) console.warn('[Canvas Sync] tarea:', error.message)
            }
          }
        }

        // ── También tareas sin fecha pero con submission_types definido ──
        if (!a.due_at && a.submission_types?.length && !a.submission_types.includes('not_graded') && !a.submission_types.includes('none')) {
          const { data: existingT } = await db.from('tareas').select('id')
            .eq('user_id', userId).eq('canvas_assignment_id', a.id).maybeSingle()
          if (!existingT) {
            const tareaData = assignmentToTarea(a, materia, userId)
            tareaData.fecha = null
            const { error } = await db.from('tareas').insert(tareaData)
            if (!error) tareasCurso++
          }
        }

        // ── Calificación: TODOS los calificados sin filtro de fecha ──────
        const sub = a.submission
        if (sub && sub.score != null && a.points_possible != null && a.points_possible > 0) {
          const { data: existingC } = await db.from('calificaciones').select('id')
            .eq('user_id', userId).eq('canvas_id', a.id).maybeSingle()
          const califData = {
            user_id: userId, materia,
            nombre: a.name, nota: sub.score,
            nota_maxima: a.points_possible, canvas_id: a.id,
            fecha: a.due_at ? a.due_at.slice(0, 10) : null,
          }
          if (existingC) {
            await db.from('calificaciones').update(califData).eq('id', existingC.id)
            califCurso++
          } else {
            const { error } = await db.from('calificaciones').insert(califData)
            if (!error) califCurso++
            else if (!error.message?.includes('duplicate')) console.warn('[Canvas Sync] calificacion:', error.message)
          }
        }
      }

      // ── Enrollment score (promedio Canvas en su propio gradebook) ──────
      try {
        const enrollments = await getCourseEnrollments(url, tok, course.id)
        if (Array.isArray(enrollments) && enrollments.length > 0) {
          const grades = enrollments[0]?.grades
          const score  = grades?.current_score ?? grades?.final_score
          if (score != null) {
            // Guardar como calificacion especial "Promedio Canvas (gradebook)"
            const { data: existingProm } = await db.from('calificaciones').select('id')
              .eq('user_id', userId).eq('materia', materia).eq('nombre', 'Promedio Canvas').maybeSingle()
            const promData = {
              user_id: userId, materia,
              nombre: 'Promedio Canvas', nota: score,
              nota_maxima: 100, canvas_id: null, fecha: null,
            }
            if (existingProm) {
              await db.from('calificaciones').update(promData).eq('id', existingProm.id)
            } else {
              const { error } = await db.from('calificaciones').insert(promData)
              if (!error) califCurso++
            }
            log(`  📊 Promedio en gradebook Canvas: ${score}%`)
          }
        }
      } catch {}
    } catch (err) {
      if (err.message.includes('403')) {
        diagErrors.push('assignments: sin acceso (403)')
        log(`  ⚠ Sin acceso a assignments (403)`)

        // Si no hay assignments pero sí hay enrollment score, importarlo
        try {
          const enrollments = await getCourseEnrollments(url, tok, course.id)
          if (Array.isArray(enrollments) && enrollments.length > 0) {
            const grades = enrollments[0]?.grades
            const score  = grades?.current_score ?? grades?.final_score
            if (score != null) {
              await db.from('calificaciones').upsert({
                user_id: userId, materia,
                nombre: 'Promedio Canvas', nota: score,
                nota_maxima: 100, canvas_id: null, fecha: null,
              }, { onConflict: 'user_id,materia,nombre', ignoreDuplicates: false })
              califCurso++
              log(`  📊 Promedio gradebook: ${score}%`)
            }
          }
        } catch {}
      } else {
        diagErrors.push(err.message)
        log(`  ⚠ ${err.message}`)
      }
    }

    log(`  ✓ ${tareasCurso} tarea(s) · ${califCurso} calificacion(es)${diagErrors.length ? ` · ⚠ ${diagErrors.join('; ')}` : ''}`)
    materiaSummary.push({ nombre: materia, tareas: tareasCurso, califs: califCurso, errors: diagErrors })
    totalTareas += tareasCurso
    totalCalif  += califCurso

    pct(5 + Math.round(((i + 1) / courses.length) * 88))
  }

  // ── Última sync ──────────────────────────────────────────────────────────
  const now = new Date().toISOString()
  const { data: existingCfg } = await db.from('configuracion_usuario')
    .select('id').eq('user_id', userId).maybeSingle()
  if (existingCfg) {
    await db.from('configuracion_usuario').update({ ultima_sync: now }).eq('user_id', userId)
  } else {
    await db.from('configuracion_usuario').insert({ user_id: userId, ultima_sync: now })
  }

  // ── Resumen final ────────────────────────────────────────────────────────
  log('\n── Resumen por materia ───────────────────────────────')
  for (const s of materiaSummary) {
    const errTxt = s.errors.length ? ` ⚠` : ''
    log(`  ${s.nombre}: ${s.tareas} tareas · ${s.califs} calificaciones${errTxt}`)
  }

  pct(100)
  const summary = `✓ Sync completo: ${totalMaterias} materias, ${totalTareas} tareas, ${totalCalif} calificaciones`
  log(summary)
  return { totalMaterias, totalTareas, totalCalif, now, materiaSummary }
}
