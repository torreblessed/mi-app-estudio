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
