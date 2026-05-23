import { supabase } from './supabase.js'

// Elementos de autenticación
const inputEmail = document.getElementById("input-email")
const inputPassword = document.getElementById("input-password")
const botonRegistro = document.getElementById("boton-registro")
const botonLogin = document.getElementById("boton-login")

// Elementos de notas
const botonGuardar = document.getElementById("boton-guardar")
const selectMateria = document.getElementById("select-materia")
const inputTitulo = document.getElementById("input-titulo")
const inputContenido = document.getElementById("input-contenido")
const listaNota = document.getElementById("lista-notas")

// Secciones
const seccionAuth = document.getElementById("seccion-auth")
const seccionNotas = document.getElementById("seccion-notas")
const botonCerrarSesion = document.getElementById("boton-cerrar-sesion")

// --- AUTENTICACIÓN ---

botonRegistro.addEventListener("click", async function() {
  const email = inputEmail.value
  const password = inputPassword.value

  const { error } = await supabase.auth.signUp({ email, password })

  if (error) {
    alert("Error: " + error.message)
  } else {
    alert("Cuenta creada. Revisa tu email para confirmar.")
  }
})

botonLogin.addEventListener("click", async function() {
  const email = inputEmail.value
  const password = inputPassword.value

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    alert("Error: " + error.message)
  } else {
    mostrarNotas()
  }
})

// --- SESIÓN ---

// Verifica si ya hay una sesión activa al cargar la página
supabase.auth.getSession().then(({ data }) => {
  if (data.session) {
    mostrarNotas()
  }
})

botonCerrarSesion.addEventListener("click", async function() {
  await supabase.auth.signOut()
  seccionNotas.style.display = "none"
  seccionAuth.style.display = "block"
})

function mostrarNotas() {
  seccionAuth.style.display = "none"
  seccionNotas.style.display = "block"
  cargarNotas()
}

// --- NOTAS ---

botonGuardar.addEventListener("click", async function() {
  const titulo = inputTitulo.value
  const contenido = inputContenido.value

  if (titulo === "" || contenido === "") {
    alert("Completa los campos")
    return
  }

  const materia = selectMateria.value
  const { data: { user } } = await supabase.auth.getUser()

  const { error } = await supabase
    .from("notas")
    .insert({ titulo, contenido, materia, user_id: user.id })

  if (error) {
    console.log("Error:", error)
  } else {
    console.log("Nota guardada")
    inputTitulo.value = ""
    inputContenido.value = ""
    cargarNotas()
  }
})

async function cargarNotas(materiaFiltro = "") {
  listaNota.innerHTML = ""

  const { data: { user } } = await supabase.auth.getUser()

  let query = supabase.from("notas").select("*").eq("user_id", user.id)
  if (materiaFiltro) {
    query = query.eq("materia", materiaFiltro)
  }

  const { data, error } = await query

  if (error) {
    console.log("Error:", error)
    return
  }

  data.forEach(function(nota) {
    const tarjeta = document.createElement("div")
    tarjeta.innerHTML = `
      <span class="etiqueta-materia">${nota.materia || "Sin materia"}</span>
      <h3>${nota.titulo}</h3>
      <p>${nota.contenido}</p>
      <hr>
    `
    listaNota.appendChild(tarjeta)
  })
}

// Filtros por materia
document.getElementById("filtros-materia").addEventListener("click", function(e) {
  const boton = e.target.closest("button")
  if (!boton) return

  document.querySelectorAll("#filtros-materia button").forEach(b => b.classList.remove("activo"))
  boton.classList.add("activo")

  cargarNotas(boton.dataset.materia)
})