# Migraciones de base de datos (Supabase)

Ejecuta estos scripts en el **SQL Editor** de Supabase en el orden indicado.

---

## 1. Columna `tipo` en tabla `tareas`

```sql
ALTER TABLE tareas
  ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'tarea'
    CHECK (tipo IN ('tarea', 'prueba', 'entrega', 'lectura', 'quiz'));
```

---

## 2. Tabla `materias`

Permite crear materias manualmente (sin depender solo de notas/tareas).

```sql
CREATE TABLE IF NOT EXISTS materias (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre      text NOT NULL,
  codigo      text,
  profesor    text,
  color       text DEFAULT 'a' CHECK (color IN ('a','b','c','d','e')),
  canvas_id   bigint,        -- ID del curso en Canvas LMS (si fue importado)
  created_at  timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE materias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "materias_own" ON materias
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

---

## 3. Tabla `configuracion_usuario`

Guarda las credenciales de Canvas y otras preferencias del usuario.

```sql
CREATE TABLE IF NOT EXISTS configuracion_usuario (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  canvas_url    text,   -- ej: https://miuniversidad.instructure.com
  canvas_token  text,   -- API token de Canvas (sensible)
  ultima_sync   timestamptz,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

-- RLS: solo el propio usuario ve su configuración
ALTER TABLE configuracion_usuario ENABLE ROW LEVEL SECURITY;
CREATE POLICY "config_own" ON configuracion_usuario
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

---

## 4. Tabla `calificaciones`

Para guardar calificaciones importadas de Canvas.

```sql
CREATE TABLE IF NOT EXISTS calificaciones (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  materia     text NOT NULL,
  nombre      text NOT NULL,   -- nombre de la evaluación
  nota        numeric(5,2),    -- calificación obtenida
  nota_maxima numeric(5,2),    -- nota máxima posible
  canvas_id   bigint,          -- submission ID en Canvas
  fecha       date,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE calificaciones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "calificaciones_own" ON calificaciones
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

---

## 5. Columna `canvas_course_id` en tabla `tareas` (opcional)

Para rastrear qué tareas vienen de Canvas:

```sql
ALTER TABLE tareas
  ADD COLUMN IF NOT EXISTS canvas_assignment_id bigint;
```

---

## Orden de ejecución

1. Migración 1 (si no la has ejecutado aún)
2. Migración 2 (materias)
3. Migración 3 (configuracion_usuario)
4. Migración 4 (calificaciones)
5. Migración 5 (canvas_assignment_id en tareas, opcional)
