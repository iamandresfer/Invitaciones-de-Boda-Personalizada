-- ============================================================
-- MIGRACIÓN RSVP INFALIBLE · Boda Gloria & Juan
-- Ejecutar en Supabase → SQL Editor (una sola vez)
-- ============================================================

-- 1) Limpiar respuestas huérfanas (invitado eliminado con ON DELETE SET NULL)
delete from public.respuestas where invitado_id is null;

-- 2) Borrado en cascada: eliminar un invitado borra también su respuesta.
--    (Reemplaza la FK anterior que era ON DELETE SET NULL)
alter table public.respuestas drop constraint respuestas_invitado_id_fkey;
alter table public.respuestas
  add constraint respuestas_invitado_id_fkey
  foreign key (invitado_id) references public.invitados (id)
  on delete cascade;

-- 3) Integridad de cupos: nadie puede confirmar más acompañantes de los asignados.
--    NOT VALID = no revalida filas históricas, solo aplica a inserts/updates nuevos.
alter table public.respuestas
  add constraint respuestas_cupos_check
  check (
    adicionales_confirmados >= 0
    and adicionales_confirmados <= coalesce(adicionales_asignados, 0)
  )
  not valid;
