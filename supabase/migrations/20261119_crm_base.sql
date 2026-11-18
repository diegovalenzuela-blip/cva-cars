-- CRM propio de la automotora: clientes, oportunidades de venta e historial.
-- Datos privados: solo los usuarios de la automotora pueden verlos o cambiarlos.
-- crm_actividades.canal e id_externo dejan lista la base para sumar integraciones
-- más adelante sin rehacer las tablas; esta versión no conecta ningún servicio.

create table if not exists public.crm_clientes (
  id uuid primary key default gen_random_uuid(),
  automotora_id uuid not null references public.automotoras(id) on delete cascade,
  nombre text not null check (char_length(btrim(nombre)) between 1 and 120),
  telefono text check (telefono is null or telefono ~ '^\+[0-9]{8,15}$'),
  email text check (email is null or (char_length(email) between 5 and 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  red_social text check (red_social is null or char_length(red_social) between 1 and 120),
  comuna text check (comuna is null or char_length(comuna) <= 80),
  notas text check (notas is null or char_length(notas) <= 2000),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint crm_clientes_contacto check (num_nonnulls(telefono, email, red_social) >= 1),
  constraint crm_clientes_id_automotora unique (id, automotora_id)
);

create unique index if not exists crm_clientes_telefono_unico
  on public.crm_clientes (automotora_id, telefono) where telefono is not null;
create unique index if not exists crm_clientes_email_unico
  on public.crm_clientes (automotora_id, lower(email)) where email is not null;

create table if not exists public.crm_oportunidades (
  id uuid primary key default gen_random_uuid(),
  automotora_id uuid not null references public.automotoras(id) on delete cascade,
  cliente_id uuid not null,
  auto_id uuid references public.autos(id) on delete set null,
  auto_resumen text check (auto_resumen is null or char_length(auto_resumen) <= 200),
  interes text check (interes is null or char_length(interes) <= 300),
  canal text not null default 'otro' check (canal in
    ('whatsapp', 'instagram', 'facebook', 'tiktok', 'correo', 'web', 'llamada', 'presencial', 'recomendacion', 'otro')),
  presupuesto bigint check (presupuesto is null or presupuesto > 0),
  etapa text not null default 'nuevo' check (etapa in
    ('nuevo', 'contactado', 'visita', 'negociacion', 'vendido', 'perdido')),
  motivo_perdida text check (motivo_perdida is null or char_length(motivo_perdida) <= 200),
  proxima_accion text check (proxima_accion is null or char_length(proxima_accion) <= 200),
  proxima_fecha date,
  cerrado_en timestamptz,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint crm_oportunidades_motivo check (etapa <> 'perdido' or motivo_perdida is not null),
  constraint crm_oportunidades_cliente foreign key (cliente_id, automotora_id)
    references public.crm_clientes (id, automotora_id) on delete cascade,
  constraint crm_oportunidades_id_cliente unique (id, cliente_id, automotora_id)
);

create index if not exists crm_oportunidades_seguimiento_idx
  on public.crm_oportunidades (automotora_id, etapa, proxima_fecha);
create index if not exists crm_oportunidades_cliente_idx
  on public.crm_oportunidades (cliente_id);
create index if not exists crm_oportunidades_auto_idx
  on public.crm_oportunidades (auto_id) where auto_id is not null;

create table if not exists public.crm_actividades (
  id uuid primary key default gen_random_uuid(),
  automotora_id uuid not null references public.automotoras(id) on delete cascade,
  cliente_id uuid not null,
  oportunidad_id uuid,
  tipo text not null default 'nota' check (tipo in ('nota', 'llamada', 'mensaje', 'visita', 'etapa')),
  canal text check (canal is null or canal in
    ('whatsapp', 'instagram', 'facebook', 'tiktok', 'correo', 'web', 'llamada', 'presencial', 'recomendacion', 'otro')),
  direccion text check (direccion is null or direccion in ('entrante', 'saliente')),
  contenido text not null check (char_length(btrim(contenido)) between 1 and 2000),
  id_externo text check (id_externo is null or char_length(id_externo) <= 200),
  creado_por uuid default auth.uid(),
  creado_en timestamptz not null default now(),
  constraint crm_actividades_cliente foreign key (cliente_id, automotora_id)
    references public.crm_clientes (id, automotora_id) on delete cascade,
  constraint crm_actividades_oportunidad foreign key (oportunidad_id, cliente_id, automotora_id)
    references public.crm_oportunidades (id, cliente_id, automotora_id) on delete cascade
);

create index if not exists crm_actividades_cliente_idx
  on public.crm_actividades (cliente_id, creado_en desc);
create index if not exists crm_actividades_oportunidad_idx
  on public.crm_actividades (oportunidad_id) where oportunidad_id is not null;
create unique index if not exists crm_actividades_externa_unica
  on public.crm_actividades (automotora_id, canal, id_externo) where id_externo is not null;

-- Fechas y cierre se calculan en la base para que no dependan de la pantalla.
create or replace function public.crm_tocar()
returns trigger language plpgsql set search_path = public as $$
begin
  new.actualizado_en := now();
  return new;
end $$;

create or replace function public.crm_etapa_nombre(e text)
returns text language sql immutable set search_path = public as $$
  select case e
    when 'nuevo' then 'Nuevo'
    when 'contactado' then 'Contactado'
    when 'visita' then 'Visita agendada'
    when 'negociacion' then 'Negociación'
    when 'vendido' then 'Vendido'
    when 'perdido' then 'Perdido'
    else e end
$$;

create or replace function public.crm_preparar_oportunidad()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.etapa in ('vendido', 'perdido') then
    if tg_op = 'INSERT' or old.etapa is distinct from new.etapa then
      new.cerrado_en := now();
    end if;
    new.proxima_accion := null;
    new.proxima_fecha := null;
  else
    new.cerrado_en := null;
    new.motivo_perdida := null;
  end if;
  return new;
end $$;

create or replace function public.crm_registrar_etapa()
returns trigger language plpgsql set search_path = public as $$
begin
  insert into public.crm_actividades (automotora_id, cliente_id, oportunidad_id, tipo, contenido)
  values (
    new.automotora_id, new.cliente_id, new.id, 'etapa',
    crm_etapa_nombre(old.etapa) || ' → ' || crm_etapa_nombre(new.etapa)
      || case when new.etapa = 'perdido' then ': ' || new.motivo_perdida else '' end
  );
  return null;
end $$;

drop trigger if exists crm_clientes_tocar on public.crm_clientes;
create trigger crm_clientes_tocar before update on public.crm_clientes
  for each row execute function public.crm_tocar();

drop trigger if exists crm_oportunidades_tocar on public.crm_oportunidades;
create trigger crm_oportunidades_tocar before update on public.crm_oportunidades
  for each row execute function public.crm_tocar();

drop trigger if exists crm_oportunidades_preparar on public.crm_oportunidades;
create trigger crm_oportunidades_preparar before insert or update on public.crm_oportunidades
  for each row execute function public.crm_preparar_oportunidad();

drop trigger if exists crm_oportunidades_etapa on public.crm_oportunidades;
create trigger crm_oportunidades_etapa after update of etapa on public.crm_oportunidades
  for each row when (old.etapa is distinct from new.etapa)
  execute function public.crm_registrar_etapa();

-- Seguridad: nada es público.
alter table public.crm_clientes enable row level security;
alter table public.crm_oportunidades enable row level security;
alter table public.crm_actividades enable row level security;

revoke all on public.crm_clientes, public.crm_oportunidades, public.crm_actividades from public, anon;
grant select, insert, update, delete
  on public.crm_clientes, public.crm_oportunidades, public.crm_actividades to authenticated;

drop policy if exists "automotora gestiona clientes" on public.crm_clientes;
create policy "automotora gestiona clientes" on public.crm_clientes
  for all to authenticated
  using (automotora_id = mi_automotora())
  with check (automotora_id = mi_automotora());

drop policy if exists "automotora gestiona oportunidades" on public.crm_oportunidades;
create policy "automotora gestiona oportunidades" on public.crm_oportunidades
  for all to authenticated
  using (automotora_id = mi_automotora())
  with check (
    automotora_id = mi_automotora()
    and (auto_id is null or exists (
      select 1 from public.autos a
      where a.id = auto_id and a.automotora_id = mi_automotora()
    ))
  );

drop policy if exists "automotora gestiona actividades" on public.crm_actividades;
create policy "automotora gestiona actividades" on public.crm_actividades
  for all to authenticated
  using (automotora_id = mi_automotora())
  with check (automotora_id = mi_automotora());
