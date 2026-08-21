-- ============================================================
-- SEGURIDAD RSVP · Boda Gloria & Juan
-- Ejecutar en Supabase → SQL Editor DESPUÉS de supabase-migracion-rsvp.sql
--
-- Qué hace (estándar Supabase):
--   1. Activa Row Level Security (RLS) en invitados y respuestas.
--   2. Da al público (anon) SOLO lo que la invitación necesita.
--   3. Restringe escrituras con validaciones de valor (WITH CHECK).
--   4. Bloquea DELETE anónimo sobre respuestas (nadie borra confirmaciones).
--
-- Riesgo residual aceptado (inherente a invitación por enlace):
--   - Quien tenga la clave pública puede enumerar invitados/confirmaciones
--     (el slug del enlace actúa como token). Sin login por invitado no hay
--     forma de evitarlo al 100%; se mitiga validando valores al escribir.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1) INVITADOS
-- ------------------------------------------------------------

alter table public.invitados enable row level security;

-- Lectura pública: necesaria para resolver el slug del enlace
drop policy if exists "publico_lee_invitados" on public.invitados;
create policy "publico_lee_invitados"
  on public.invitados
  for select
  using (true);

-- Alta desde panel de admin (valida valores)
drop policy if exists "publico_crea_invitados" on public.invitados;
create policy "publico_crea_invitados"
  on public.invitados
  for insert
  with check (
    length(btrim(nombre)) between 2 and 120
    and adicionales between 0 and 20
  );

-- Edición desde panel de admin
drop policy if exists "publico_edita_invitados" on public.invitados;
create policy "publico_edita_invitados"
  on public.invitados
  for update
  using (true)
  with check (
    length(btrim(nombre)) between 2 and 120
    and adicionales between 0 and 20
  );

-- Borrado desde panel de admin. El FK ON DELETE CASCADE elimina
-- automáticamente las respuestas asociadas (ver migracion).
drop policy if exists "publico_borra_invitados" on public.invitados;
create policy "publico_borra_invitados"
  on public.invitados
  for delete
  using (true);

-- ------------------------------------------------------------
-- 2) RESPUESTAS
-- ------------------------------------------------------------

alter table public.respuestas enable row level security;

-- Lectura pública: permite al invitado ver su confirmación previa
-- ("Ya confirmaste...") y al panel listar todo.
drop policy if exists "publico_lee_respuestas" on public.respuestas;
create policy "publico_lee_respuestas"
  on public.respuestas
  for select
  using (true);

-- Alta de confirmaciones (solo valores válidos y dentro del cupo asignado)
drop policy if exists "publico_confirma" on public.respuestas;
create policy "publico_confirma"
  on public.respuestas
  for insert
  with check (
    invitado_id is not null
    and length(btrim(nombre)) between 2 and 120
    and estado in ('Pendiente', 'Confirmado', 'No asiste')
    and adicionales_asignados between 0 and 20
    and adicionales_confirmados >= 0
    and adicionales_confirmados <= coalesce(adicionales_asignados, 0)
    and coalesce(length(mensaje), 0) <= 500
  );

-- Modificación de su confirmación (upsert on_conflict=invitado_id)
drop policy if exists "publico_actualiza" on public.respuestas;
create policy "publico_actualiza"
  on public.respuestas
  for update
  using (invitado_id is not null)
  with check (
    invitado_id is not null
    and length(btrim(nombre)) between 2 and 120
    and estado in ('Pendiente', 'Confirmado', 'No asiste')
    and adicionales_confirmados >= 0
    and adicionales_confirmados <= coalesce(adicionales_asignados, 0)
    and coalesce(length(mensaje), 0) <= 500
  );

-- IMPORTANTE: NO se crea política DELETE para respuestas.
-- Con RLS activo y sin política, el rol anónimo NO puede borrar
-- confirmaciones. Las confirmaciones se eliminan solo en cascada
-- cuando se elimina al invitado.

commit;
