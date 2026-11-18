-- Separa los vehículos en dos catálogos. Todos los existentes quedan en "general".
-- Las políticas RLS de "autos" no cambian: se aplican a la fila completa.

alter table public.autos
  add column if not exists catalogo text not null default 'general'
  check (catalogo in ('general', 'trabajo'));

create index if not exists autos_automotora_catalogo_idx
  on public.autos (automotora_id, catalogo);
