-- Datos opcionales de respaldo para la ficha pública. Vacíos en los autos existentes.
alter table public.autos
  add column if not exists estado_papeles text check (estado_papeles is null or char_length(estado_papeles) <= 200),
  add column if not exists mantenciones text check (mantenciones is null or char_length(mantenciones) <= 500),
  add column if not exists revision_tecnica text check (revision_tecnica is null or char_length(revision_tecnica) <= 200);
