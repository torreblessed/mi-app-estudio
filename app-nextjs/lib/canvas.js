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
