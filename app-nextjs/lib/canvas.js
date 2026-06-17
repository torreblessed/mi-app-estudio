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

// Obtener cursos activos del usuario
export async function getCourses(canvasUrl, token) {
  return canvasRequest(canvasUrl, token,
    'api/v1/courses?enrollment_state=active&per_page=50&include[]=term&include[]=total_scores'
  )
}

// Obtener assignments de un curso
export async function getAssignments(canvasUrl, token, courseId) {
  return canvasRequest(canvasUrl, token,
    `api/v1/courses/${courseId}/assignments?per_page=100&order_by=due_at`
  )
}

// Obtener calificaciones (submissions) del usuario en un curso
export async function getSubmissions(canvasUrl, token, courseId) {
  return canvasRequest(canvasUrl, token,
    `api/v1/courses/${courseId}/students/submissions?student_ids[]=self&per_page=100&include[]=assignment`
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

// Formatear assignment como tarea de la app
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

// Assignments con submissions incluidas (para calificaciones)
export async function getAssignmentsWithSubmissions(canvasUrl, token, courseId) {
  return canvasRequest(canvasUrl, token,
    `api/v1/courses/${courseId}/assignments?per_page=100&order_by=due_at&include[]=submission`
  )
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

// Sincronización completa Canvas → Supabase
// Usa select-then-insert/update para evitar depender de constraints UNIQUE en la DB.
export async function syncCanvasData(canvasUrl, token, userId, supabaseClient, callbacks = {}) {
  const { onLog, onProgress } = callbacks
  const url = canvasUrl.trim().replace(/\/$/, '')
  const tok = token.trim()
  const db  = supabaseClient

  const log = (msg) => { console.log('[Canvas Sync]', msg); onLog?.(msg) }
  const pct = (n)   => onProgress?.(n)

  log('Obteniendo cursos activos…')
  const allCourses = await getCourses(url, tok)

  if (!Array.isArray(allCourses)) {
    console.error('[Canvas Sync] Respuesta inesperada de getCourses:', allCourses)
    throw new Error('Token inválido o URL incorrecta. Verifica tu configuración.')
  }

  const courses = allCourses.filter(c => !c.access_restricted_by_date)
  log(`Encontré ${courses.length} curso(s) activo(s)`)
  console.log('[Canvas Sync] Cursos:', courses.map(c => `${c.id} – ${c.name}`))
  pct(10)

  let totalMaterias = 0
  let totalTareas   = 0
  let totalCalif    = 0

  for (let i = 0; i < courses.length; i++) {
    const course  = courses[i]
    const materia = course.name
    log(`[${i + 1}/${courses.length}] ${materia}`)

    // ── Upsert materia (select → update | insert) ──────────────────────────
    const { data: existingMateria, error: findMateriaErr } = await db
      .from('materias')
      .select('id')
      .eq('user_id', userId)
      .eq('canvas_id', course.id)
      .maybeSingle()

    if (findMateriaErr) {
      console.error('[Canvas Sync] Error buscando materia:', findMateriaErr.message)
    }

    if (existingMateria) {
      const { error: updErr } = await db.from('materias')
        .update({ nombre: materia, codigo: course.course_code || null })
        .eq('id', existingMateria.id)
      if (updErr) console.error('[Canvas Sync] Error actualizando materia:', updErr.message)
      else { console.log('[Canvas Sync] ✓ Materia actualizada:', materia); totalMaterias++ }
    } else {
      const { error: insErr } = await db.from('materias').insert({
        user_id:  userId,
        nombre:   materia,
        codigo:   course.course_code || null,
        canvas_id: course.id,
      })
      if (insErr) console.error('[Canvas Sync] Error insertando materia:', insErr.message)
      else { console.log('[Canvas Sync] ✓ Materia insertada:', materia); totalMaterias++ }
    }

    // ── Assignments + submissions ───────────────────────────────────────────
    try {
      const assignments = await getAssignmentsWithSubmissions(url, tok, course.id)
      const relevant = assignments.filter(
        a => a.due_at && new Date(a.due_at) > new Date(Date.now() - 30 * 86400000)
      )
      log(`  → ${relevant.length} tareas con fecha`)
      console.log(`[Canvas Sync] ${materia}: ${assignments.length} total, ${relevant.length} recientes`)

      for (const a of relevant) {
        // Upsert tarea
        const { data: existingTarea, error: findTareaErr } = await db
          .from('tareas')
          .select('id')
          .eq('user_id', userId)
          .eq('canvas_assignment_id', a.id)
          .maybeSingle()

        if (findTareaErr) console.error('[Canvas Sync] Error buscando tarea:', findTareaErr.message)

        const tareaData = assignmentToTarea(a, materia, userId)

        if (existingTarea) {
          const { error: updErr } = await db.from('tareas').update({
            titulo:    tareaData.titulo,
            tipo:      tareaData.tipo,
            fecha:     tareaData.fecha,
            hora:      tareaData.hora,
            completada: tareaData.completada,
          }).eq('id', existingTarea.id)
          if (updErr) console.error('[Canvas Sync] Error actualizando tarea:', updErr.message)
          else totalTareas++
        } else {
          const { error: insErr } = await db.from('tareas').insert(tareaData)
          if (insErr) console.error('[Canvas Sync] Error insertando tarea:', insErr.message, tareaData)
          else totalTareas++
        }

        // Calificación (si tiene nota)
        const sub = a.submission
        if (sub && sub.score != null && a.points_possible != null && a.points_possible > 0) {
          const { data: existingCalif } = await db
            .from('calificaciones')
            .select('id')
            .eq('user_id', userId)
            .eq('canvas_id', a.id)
            .maybeSingle()

          const califData = {
            user_id:     userId,
            materia,
            nombre:      a.name,
            nota:        sub.score,
            nota_maxima: a.points_possible,
            canvas_id:   a.id,
            fecha:       a.due_at ? a.due_at.slice(0, 10) : null,
          }

          if (existingCalif) {
            await db.from('calificaciones').update(califData).eq('id', existingCalif.id)
          } else {
            const { error: califErr } = await db.from('calificaciones').insert(califData)
            if (califErr) {
              // La tabla puede no existir aún — no es fatal
              console.warn('[Canvas Sync] calificaciones omitidas:', califErr.message)
            } else {
              totalCalif++
            }
          }
        }
      }
    } catch (err) {
      console.error('[Canvas Sync] Error en assignments de', materia, ':', err.message)
      log(`  ⚠ ${err.message}`)
    }

    pct(10 + Math.round(((i + 1) / courses.length) * 85))
  }

  // ── Última sync ────────────────────────────────────────────────────────────
  const now = new Date().toISOString()
  const { data: existingCfg } = await db
    .from('configuracion_usuario')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()

  if (existingCfg) {
    await db.from('configuracion_usuario').update({ ultima_sync: now }).eq('user_id', userId)
  } else {
    await db.from('configuracion_usuario').insert({ user_id: userId, ultima_sync: now })
  }

  pct(100)
  const summary = `✓ Sync completo: ${totalMaterias} materias, ${totalTareas} tareas, ${totalCalif} calificaciones`
  log(summary)
  console.log('[Canvas Sync]', summary)
  return { totalMaterias, totalTareas, totalCalif, now }
}
