// ── Sample data for Aula ─────────────────────────────────────────────────

const SUBJECTS = [
  {
    id: "calc",
    code: "MAT022",
    name: "Cálculo II",
    color: "violet",
    professor: "Dra. Pérez",
    progress: 64,
    materialsCount: 18,
    notesCount: 12,
    nextEval: { type: "Prueba", title: "Prueba 2 — Integrales", date: "2026-05-28", daysAway: 3 },
  },
  {
    id: "micro",
    code: "ECN150",
    name: "Microeconomía",
    color: "indigo",
    professor: "Prof. Rojas",
    progress: 48,
    materialsCount: 23,
    notesCount: 8,
    nextEval: { type: "Entrega", title: "Informe — Elasticidades", date: "2026-05-29", daysAway: 4 },
  },
  {
    id: "prog",
    code: "INF101",
    name: "Programación",
    color: "teal",
    professor: "Prof. Mendoza",
    progress: 78,
    materialsCount: 31,
    notesCount: 15,
    nextEval: { type: "Control", title: "Control 3 — Estructuras", date: "2026-06-02", daysAway: 8 },
  },
  {
    id: "hist",
    code: "HIS204",
    name: "Historia económica",
    color: "amber",
    professor: "Dr. Salinas",
    progress: 35,
    materialsCount: 14,
    notesCount: 5,
    nextEval: { type: "Lectura", title: "Capítulo 7 — Revolución Industrial", date: "2026-05-27", daysAway: 2 },
  },
  {
    id: "ing",
    code: "ENG300",
    name: "Inglés intermedio",
    color: "rose",
    professor: "Prof. Hughes",
    progress: 82,
    materialsCount: 9,
    notesCount: 3,
    nextEval: { type: "Quiz", title: "Quiz semanal — Listening", date: "2026-05-25", daysAway: 0 },
  },
];

const TODAY_TASKS = [
  { id: "t1", title: "Repasar derivadas parciales", subject: "calc", duration: 30, done: true,  time: "08:30" },
  { id: "t2", title: "Estudiar para quiz de listening", subject: "ing", duration: 20, done: false, time: "11:00" },
  { id: "t3", title: "Leer capítulo 4 — Demanda", subject: "micro", duration: 45, done: false, time: "14:30" },
  { id: "t4", title: "Avanzar laboratorio 3", subject: "prog", duration: 60, done: false, time: "17:00" },
  { id: "t5", title: "Resumen lectura historia", subject: "hist", duration: 25, done: false, time: "21:00" },
];

const WEEK_EVENTS = [
  { id: "e1", date: "2026-05-25", weekday: "lun", day: 25, type: "Quiz",    subject: "ing",   title: "Quiz Listening",      time: "11:00" },
  { id: "e2", date: "2026-05-27", weekday: "mié", day: 27, type: "Lectura", subject: "hist",  title: "Cap. 7 — Rev. Industrial" },
  { id: "e3", date: "2026-05-28", weekday: "jue", day: 28, type: "Prueba",  subject: "calc",  title: "Prueba 2 — Integrales", time: "09:00" },
  { id: "e4", date: "2026-05-29", weekday: "vie", day: 29, type: "Entrega", subject: "micro", title: "Informe Elasticidades", time: "23:59" },
  { id: "e5", date: "2026-06-02", weekday: "mar", day: 2,  type: "Control", subject: "prog",  title: "Control 3", time: "10:30" },
];

const SUBJECT_FILES = {
  calc: [
    { id: "f1", name: "Apunte clase 9 — Integrales por partes.pdf", kind: "pdf", size: "2.4 MB", date: "2026-05-20", source: "Profesor" },
    { id: "f2", name: "Ejercicios resueltos — Sustitución.pdf",     kind: "pdf", size: "1.1 MB", date: "2026-05-18", source: "Profesor" },
    { id: "f3", name: "Resumen propio — Áreas y volúmenes.md",      kind: "md",  size: "12 KB",  date: "2026-05-17", source: "Tú" },
    { id: "f4", name: "Slides cátedra — Semana 8.pptx",             kind: "ppt", size: "5.7 MB", date: "2026-05-15", source: "Profesor" },
    { id: "f5", name: "Foto pizarra 14 mayo.jpg",                   kind: "img", size: "3.2 MB", date: "2026-05-14", source: "Tú" },
    { id: "f6", name: "Pauta prueba 1 — Comentada.pdf",             kind: "pdf", size: "780 KB", date: "2026-05-08", source: "Ayudante" },
  ],
  micro: [
    { id: "f7", name: "Capítulo 4 — Demanda.pdf", kind: "pdf", size: "3.8 MB", date: "2026-05-21", source: "Profesor" },
    { id: "f8", name: "Caso de estudio — Tarifas.pdf", kind: "pdf", size: "1.5 MB", date: "2026-05-19", source: "Profesor" },
    { id: "f9", name: "Plantilla informe.docx", kind: "doc", size: "98 KB", date: "2026-05-17", source: "Profesor" },
  ],
  prog: [], hist: [], ing: [],
};

const SUBJECT_NOTES = {
  calc: [
    { id: "n1", title: "Integración por partes", body: "Fórmula: ∫u dv = uv − ∫v du. Elegir u con LIATE: Logarítmica, Inversa trig, Algebraica, Trigonométrica, Exponencial.", date: "2026-05-19" },
    { id: "n2", title: "Áreas entre curvas", body: "Integrar (f − g) en el intervalo donde f ≥ g. Si se cruzan, dividir el intervalo en subintervalos según el punto de corte.", date: "2026-05-17" },
    { id: "n3", title: "Errores en P1", body: "Olvidé sumar la constante de integración en 2/3 ejercicios. Revisar dominios al hacer sustitución trigonométrica.", date: "2026-05-09" },
  ],
  micro: [
    { id: "n4", title: "Elasticidad precio", body: "ε = (%ΔQ) / (%ΔP). Si |ε|>1 elástica, =1 unitaria, <1 inelástica. Ingreso total se maximiza donde ε = −1.", date: "2026-05-20" },
  ],
  prog: [], hist: [], ing: [],
};

const SUBJECT_TIMELINE = {
  calc: [
    { id: "x1", date: "2026-04-02", type: "Prueba",  title: "Prueba 1 — Derivadas",         status: "done",     grade: 5.7 },
    { id: "x2", date: "2026-04-18", type: "Control", title: "Control 1 — Aplicaciones",     status: "done",     grade: 6.2 },
    { id: "x3", date: "2026-05-08", type: "Control", title: "Control 2 — Antiderivadas",    status: "done",     grade: 5.4 },
    { id: "x4", date: "2026-05-28", type: "Prueba",  title: "Prueba 2 — Integrales",        status: "upcoming", days: 3 },
    { id: "x5", date: "2026-06-18", type: "Control", title: "Control 3 — Series",           status: "upcoming", days: 24 },
    { id: "x6", date: "2026-07-05", type: "Examen",  title: "Examen final",                 status: "upcoming", days: 41 },
  ],
  micro: [
    { id: "x7", date: "2026-04-10", type: "Control", title: "Control 1", status: "done", grade: 5.8 },
    { id: "x8", date: "2026-05-29", type: "Entrega", title: "Informe Elasticidades", status: "upcoming", days: 4 },
    { id: "x9", date: "2026-06-20", type: "Prueba", title: "Prueba 2", status: "upcoming", days: 26 },
  ],
  prog: [
    { id: "x10", date: "2026-05-15", type: "Entrega", title: "Lab 2", status: "done", grade: 6.5 },
    { id: "x11", date: "2026-06-02", type: "Control", title: "Control 3 — Estructuras", status: "upcoming", days: 8 },
  ],
  hist: [
    { id: "x12", date: "2026-06-10", type: "Ensayo", title: "Ensayo Rev. Industrial", status: "upcoming", days: 16 },
  ],
  ing: [
    { id: "x13", date: "2026-05-25", type: "Quiz", title: "Quiz Listening", status: "upcoming", days: 0 },
  ],
};

const SUBJECT_CHATS = {
  calc: [
    { role: "tutor", text: "Hola André. ¿Quieres que te ayude a preparar la Prueba 2? Tienes 3 días." },
    { role: "user",  text: "Sí, especialmente integración por partes. Me cuesta elegir el u." },
    { role: "tutor", text: "Buena pregunta. Usa la regla LIATE: prioriza Logarítmica, Inversa trig, Algebraica, Trigonométrica, Exponencial. ¿Te muestro un ejemplo con ∫x·ln(x) dx?" },
    { role: "user",  text: "Sí, paso a paso." },
    { role: "tutor", text: "Identifica u = ln(x) (logarítmica gana) y dv = x dx. Entonces du = (1/x) dx y v = x²/2. Aplica ∫u dv = uv − ∫v du." },
  ],
  micro: [
    { role: "tutor", text: "Tu informe es en 4 días. ¿Empezamos por la introducción o por los cálculos?" },
  ],
  prog: [], hist: [], ing: [],
};

Object.assign(window, {
  SUBJECTS, TODAY_TASKS, WEEK_EVENTS,
  SUBJECT_FILES, SUBJECT_NOTES, SUBJECT_TIMELINE, SUBJECT_CHATS,
});
