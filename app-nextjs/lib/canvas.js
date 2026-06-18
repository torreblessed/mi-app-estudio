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

// Obtener cursos activos (enrollment_state=active)
export async function getCourses(canvasUrl, token) {
  return canvasRequest(canvasUrl, token,
    'api/v1/courses?enrollment_state=active&per_page=100&include[]=term&include[]=total_scores'
  )
}

// Obtener TODOS los cursos sin ningún filtro (para debug y selección manual)
export async function getCoursesRaw(canvasUrl, token) {
  return canvasRequest(canvasUrl, token,
    'api/v1/courses?per_page=100&include[]=term&include[]=enrollments&include[]=total_scores'
  )
}

// Obtener assignments de un curso
export async function getAssignments(canvasUrl, token, courseId) {
  return canvasRequest(canvasUrl, token,
    `api/v1/courses/${courseId}/assignments?per_page=100&order_by=due_at`
  )
}

// Obtener archivos de un curso
export async function getCourseFiles(canvasUrl, token, courseId) {
  return canvasRequest(canvasUrl, token,
    `api/v1/courses/${courseId}/files?per_page=50&sort=updated_at&order=desc`
  )
}

// Obtener módulos de un curso
export async function getCourseModules(canvasUrl, token, courseId) {
  return canvasRequest(canvasUrl, token,
    `api/v1/courses/${courseId}/modules?per_page=50&include[]=items`
  )
}

// Obtener anuncios del curso
export async function getCourseAnnouncements(canvasUrl, token, courseId) {
  return canvasRequest(canvasUrl, token,
    `api/v1/courses/${courseId}/discussion_topics?only_announcements=true&per_page=20&order_by=recent_activity`
  )
}

// Assignments con submissions (para calificaciones y tab de notas)
export async function getAssignmentsWithSubmissions(canvasUrl, token, courseId) {
  return canvasRequest(canvasUrl, token,
    `api/v1/courses/${courseId}/assignments?per_page=100&order_by=due_at&include[]=submission`
  )
}

// Formatear assignment como tarea
export function assignmentToTarea(assignment, courseName, userId) {
  const tipo = inferTipo(assignment.name, assignment.submission_types)
  return {
    user_id: userId,
    titulo: assignment.name,
    materia: courseName,
    tipo,
    fecha: assignment.due_at ? assignment.due_at.slice(0, 10) : null,
    hora: assignment.due_at ? assignment.due_at.slice(11, 16) : null,
    completada: assignment.has_submitted_submissions || false,
    duracion_min: 60,
    canvas_assignment_id: assignment.id,
  }
}

function inferTipo(name, submissionTypes) {
  const n = (name || '').toLowerCase()
  if (n.includes('quiz') || n.includes('cuestionario')) return 'quiz'
  if (n.includes('prueba') || n.includes('examen') || n.includes('test') || n.includes('midterm') || n.includes('final')) return 'prueba'
  if (n.includes('entrega') || n.includes('tarea') || n.includes('assignment') || n.includes('lab')) return 'entrega'
  if (n.includes('lectura') || n.includes('reading')) return 'lectura'
  const types = submissionTypes || []
  if (types.includes('online_quiz')) return 'quiz'
  return 'tarea'
}

// Carga credenciales Canvas desde localStorage → Supabase
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

/**
 * Sincronización Canvas → Supabase
 *
 * @param {string}   canvasUrl
 * @param {string}   token
 * @param {string}   userId
 * @param {object}   supabaseClient
 * @param {object}   callbacks         { onLog, onProgress }
 * @param {Array}    coursesToSync     Si se pasa, se usan estos cursos en lugar de llamar getCourses()
 */
export async function syncCanvasData(canvasUrl, token, userId, supabaseClient, callbacks = {}, coursesToSync = null) {
  const { onLog, onProgress } = callbacks
  const url = canvasUrl.trim().replace(/\/$/, '')
  const tok = token.trim()
  const db  = supabaseClient

  const log = (msg) => { console.log('[Canvas Sync]', msg); onLog?.(msg) }
  const pct = (n)   => onProgress?.(n)

  // ── 1. Obtener cursos ─────────────────────────────────────────────────────
  let courses
  if (coursesToSync) {
    courses = coursesToSync.filter(c => !c.access_restricted_by_date)
    log(`Sincronizando ${courses.length} materia(s) seleccionada(s)…`)
  } else {
    log('Obteniendo cursos activos…')
    const allCourses = await getCourses(url, tok)
    if (!Array.isArray(allCourses)) {
      throw new Error('Token inválido o URL incorrecta. Verifica tu configuración.')
    }
    courses = allCourses.filter(c => !c.access_restricted_by_date)
    log(`Encontré ${courses.length} curso(s) activo(s)`)
  }
  pct(5)

  let totalMaterias = 0
  let totalTareas   = 0
  let totalCalif    = 0

  for (let i = 0; i < courses.length; i++) {
    const course  = courses[i]
    const materia = course.name
    log(`[${i + 1}/${courses.length}] ${materia}`)

    // ── Upsert materia ────────────────────────────────────────────────────
    const { data: existingMateria } = await db
      .from('materias').select('id')
      .eq('user_id', userId).eq('canvas_id', course.id).maybeSingle()

    if (existingMateria) {
      const { error: updErr } = await db.from('materias')
        .update({ nombre: materia, codigo: course.course_code || null, activa: true })
        .eq('id', existingMateria.id)
      if (updErr) log(`  ⚠ Error actualizando materia: ${updErr.message}`)
      else totalMaterias++
    } else {
      const { error: insErr } = await db.from('materias').insert({
        user_id: userId, nombre: materia,
        codigo: course.course_code || null, canvas_id: course.id, activa: true,
      })
      if (insErr) log(`  ⚠ Error insertando materia: ${insErr.message}`)
      else totalMaterias++
    }

    // ── Assignments + tareas + calificaciones ─────────────────────────────
    try {
      const assignments = await getAssignmentsWithSubmissions(url, tok, course.id)
      log(`  → ${assignments.length} assignment(s) encontrado(s)`)

      // Tareas: solo las de los últimos 90 días y próximas
      const cutoff = new Date(Date.now() - 90 * 86400000)
      const tareasRel = assignments.filter(a => a.due_at && new Date(a.due_at) > cutoff)

      let tareasCurso = 0
      let califCurso  = 0

      for (const a of assignments) {
        const esTareaRel = a.due_at && new Date(a.due_at) > cutoff

        // Tarea (solo si tiene fecha reciente)
        if (esTareaRel) {
          const { data: existingT } = await db.from('tareas').select('id')
            .eq('user_id', userId).eq('canvas_assignment_id', a.id).maybeSingle()
          const tareaData = assignmentToTarea(a, materia, userId)
          if (existingT) {
            const { error } = await db.from('tareas').update({
              titulo: tareaData.titulo, tipo: tareaData.tipo,
              fecha: tareaData.fecha, hora: tareaData.hora,
              completada: tareaData.completada,
            }).eq('id', existingT.id)
            if (!error) { totalTareas++; tareasCurso++ }
          } else {
            const { error } = await db.from('tareas').insert(tareaData)
            if (!error) { totalTareas++; tareasCurso++ }
            else if (error.message) console.warn('[Canvas Sync] tarea error:', error.message)
          }
        }

        // Calificación: TODOS los assignments con nota, sin filtro de fecha
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
          } else {
            const { error } = await db.from('calificaciones').insert(califData)
            if (!error) { totalCalif++; califCurso++ }
            else console.warn('[Canvas Sync] calificacion error:', error.message)
          }
        }
      }

      log(`  ✓ ${tareasCurso} tarea(s) · ${califCurso} calificacion(es)`)
    } catch (err) {
      if (err.message.includes('403')) {
        log(`  ⚠ Sin acceso a assignments (403)`)
      } else {
        log(`  ⚠ ${err.message}`)
      }
    }

    pct(5 + Math.round(((i + 1) / courses.length) * 90))
  }

  // ── Última sync ────────────────────────────────────────────────────────────
  const now = new Date().toISOString()
  const { data: existingCfg } = await db.from('configuracion_usuario')
    .select('id').eq('user_id', userId).maybeSingle()
  if (existingCfg) {
    await db.from('configuracion_usuario').update({ ultima_sync: now }).eq('user_id', userId)
  } else {
    await db.from('configuracion_usuario').insert({ user_id: userId, ultima_sync: now })
  }

  pct(100)
  const summary = `✓ Sync completo: ${totalMaterias} materias, ${totalTareas} tareas, ${totalCalif} calificaciones`
  log(summary)
  return { totalMaterias, totalTareas, totalCalif, now }
}
