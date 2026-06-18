# Migraciones SQL

Ejecuta estos scripts en el **SQL Editor de Supabase** (Project → SQL Editor → New query).

---

## analisis_material

```sql
create table if not exists analisis_material (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null,
  materia_id          uuid references materias(id) on delete set null,
  archivo_nombre      text not null,
  archivo_canvas_id   bigint,
  tipo_material       text,
  temas               jsonb default '[]',
  conceptos_clave     jsonb default '[]',
  fechas_evaluaciones jsonb default '[]',
  preguntas_practica  jsonb default '[]',
  flashcards          jsonb default '[]',
  resumen             text,
  analizado_at        timestamptz default now(),
  constraint analisis_material_user_archivo unique (user_id, archivo_canvas_id)
);

create index if not exists idx_analisis_material_user_id    on analisis_material(user_id);
create index if not exists idx_analisis_material_materia_id on analisis_material(materia_id);

alter table analisis_material enable row level security;

create policy "Users manage their own analysis"
  on analisis_material for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

---

## Migración 2 — Columna `activa` en materias

Permite marcar qué materias estás cursando actualmente. Solo las activas aparecen en el dashboard, calendario y son analizadas por el motor IA.

```sql
ALTER TABLE materias ADD COLUMN IF NOT EXISTS activa boolean DEFAULT true;
UPDATE materias SET activa = true WHERE activa IS NULL;
```

---

---

## Migración 3 — RUT en configuracion_usuario

```sql
ALTER TABLE configuracion_usuario ADD COLUMN IF NOT EXISTS rut text;
```

---

## Migración 4 — Tabla `ponderaciones`

Almacena la estructura de evaluaciones y ponderaciones de cada materia (extraídas del cronograma o ingresadas manualmente por el usuario).

```sql
CREATE TABLE IF NOT EXISTS ponderaciones (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL,
  materia_id          uuid REFERENCES materias(id) ON DELETE CASCADE,
  nombre_evaluacion   text NOT NULL,
  porcentaje          numeric(5,2) NOT NULL DEFAULT 0,
  tipo                text CHECK (tipo IN ('prueba','control','examen','tarea','quiz','laboratorio','proyecto','otro')) DEFAULT 'otro',
  orden               integer DEFAULT 0,
  nota_exencion       numeric(4,1),
  created_at          timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ponderaciones_materia ON ponderaciones(materia_id);
CREATE INDEX IF NOT EXISTS idx_ponderaciones_user    ON ponderaciones(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ponderaciones_unique
  ON ponderaciones(user_id, materia_id, nombre_evaluacion);

ALTER TABLE ponderaciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own ponderaciones"
  ON ponderaciones FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

---

## Nota — Campo `ponderacion` en `fechas_evaluaciones`

El campo `analisis_material.fechas_evaluaciones` ahora incluye `ponderacion` (% de la nota final). No requiere migración de columna; es un cambio en el contenido JSONB generado por Gemini.

```json
{
  "tipo": "prueba",
  "fecha": "2025-04-15",
  "temas_incluidos": ["derivadas"],
  "descripcion": "Prueba 2 — Integración",
  "ponderacion": 25
}
```
