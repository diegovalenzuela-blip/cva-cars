-- Auto elegido para la tarjeta de la portada. Lo elige la automotora desde el panel
-- (pestaña Exhibición). Solo puede haber uno por automotora.
-- Se puede ejecutar más de una vez.

alter table public.autos add column if not exists en_portada boolean not null default false;

create unique index if not exists autos_una_portada
  on public.autos (automotora_id) where en_portada;
