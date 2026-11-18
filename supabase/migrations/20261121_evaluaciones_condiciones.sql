-- Condiciones comerciales de los autos y solicitudes públicas de evaluación.
-- Una solicitud no es una consignación: esta se crea solo cuando el equipo la convierte.

alter table public.autos add column if not exists acepta_parte_pago boolean not null default false;
alter table public.autos add column if not exists precio_negociable boolean not null default false;

create table if not exists public.crm_solicitudes_evaluacion (
  id uuid primary key,
  automotora_id uuid not null references public.automotoras(id) on delete cascade,
  cliente_id uuid,
  oportunidad_id uuid references public.crm_oportunidades(id) on delete set null,
  vehiculo_id uuid references public.crm_vehiculos(id) on delete set null,
  consignacion_id uuid references public.crm_consignaciones(id) on delete set null,
  estado text not null default 'nueva' check (estado in ('nueva', 'en_revision', 'convertida', 'descartada')),
  coincidencia text not null check (coincidencia in ('cliente_nuevo', 'cliente_existente', 'revisar')),
  candidatos uuid[] not null default '{}',
  nombre text not null check (char_length(nombre) between 3 and 120),
  telefono text not null check (telefono ~ '^\+[0-9]{8,15}$'),
  email text check (email is null or (char_length(email) between 5 and 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  comuna text not null check (char_length(comuna) between 2 and 80),
  marca text not null check (char_length(marca) between 1 and 60),
  modelo text not null check (char_length(modelo) between 1 and 80),
  version text check (version is null or char_length(version) <= 120),
  anio int not null check (anio between 1950 and 2100),
  km int not null check (km between 0 and 3000000),
  patente text check (patente is null or public.crm_patente_valida(patente)),
  precio_esperado bigint check (precio_esperado is null or precio_esperado between 1 and 10000000000),
  observaciones text check (observaciones is null or char_length(observaciones) <= 2000),
  origen text not null default 'Web - Solicitud de evaluación' check (char_length(origen) <= 80),
  fotos_esperadas int not null default 0 check (fotos_esperadas between 0 and 10),
  fotos text[] not null default '{}',
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint crm_solicitudes_cliente foreign key (cliente_id, automotora_id)
    references public.crm_clientes (id, automotora_id) on delete set null (cliente_id)
);

create index if not exists crm_solicitudes_lista_idx
  on public.crm_solicitudes_evaluacion (automotora_id, estado, creado_en desc);
create index if not exists crm_solicitudes_telefono_idx
  on public.crm_solicitudes_evaluacion (telefono, creado_en desc);
create index if not exists crm_solicitudes_cliente_idx
  on public.crm_solicitudes_evaluacion (cliente_id) where cliente_id is not null;

drop trigger if exists crm_solicitudes_tocar on public.crm_solicitudes_evaluacion;
create trigger crm_solicitudes_tocar before update on public.crm_solicitudes_evaluacion
  for each row execute function public.crm_tocar();

create or replace function public.crm_nombres_compatibles(a text, b text)
returns boolean language sql immutable set search_path = '' as $$
  select exists (
    select 1
    from unnest(regexp_split_to_array(translate(lower(a), 'áéíóúüñ', 'aeiouun'), '\s+')) x(p)
    join unnest(regexp_split_to_array(translate(lower(b), 'áéíóúüñ', 'aeiouun'), '\s+')) y(p) on x.p = y.p
    where char_length(x.p) >= 3
  )
$$;

-- Crea la oportunidad y su tarea en la lista de seguimiento existente.
create or replace function public.crm_abrir_seguimiento_evaluacion(
  p_automotora uuid, p_cliente uuid, p_vehiculo text, p_observacion text
) returns uuid language plpgsql set search_path = '' as $$
declare
  v_oportunidad uuid;
begin
  insert into public.crm_oportunidades
    (automotora_id, cliente_id, auto_resumen, interes, canal, proxima_accion, proxima_fecha)
  values (p_automotora, p_cliente, left(p_vehiculo, 200), 'Solicitud de evaluación', 'web',
    'Revisar solicitud de evaluación', (now() at time zone 'America/Santiago')::date)
  returning id into v_oportunidad;
  insert into public.crm_actividades (automotora_id, cliente_id, oportunidad_id, tipo, canal, contenido)
  values (p_automotora, p_cliente, v_oportunidad, 'nota', 'web', left(p_observacion, 2000));
  return v_oportunidad;
end $$;

-- Entrada pública: valida todo aquí porque también puede llamarse sin pasar por la página.
create or replace function public.crm_recibir_evaluacion(p jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_automotora uuid;
  v_id uuid;
  v_nombre text := btrim(p->>'nombre');
  v_telefono text := btrim(p->>'telefono');
  v_email text := nullif(lower(btrim(p->>'email')), '');
  v_comuna text := btrim(p->>'comuna');
  v_marca text := btrim(p->>'marca');
  v_modelo text := btrim(p->>'modelo');
  v_version text := nullif(btrim(p->>'version'), '');
  v_anio int;
  v_km int;
  v_patente text := public.crm_patente_normalizar(p->>'patente');
  v_precio bigint;
  v_observaciones text := nullif(btrim(p->>'observaciones'), '');
  v_fotos int;
  v_existente public.crm_solicitudes_evaluacion;
  v_candidatos uuid[];
  v_cliente uuid;
  v_coincidencia text;
  v_oportunidad uuid;
  v_resumen text;
begin
  begin
    v_id := (p->>'id')::uuid;
    v_anio := (p->>'anio')::int;
    v_km := (p->>'km')::int;
    v_precio := nullif(p->>'precio_esperado', '')::bigint;
    v_fotos := coalesce((p->>'fotos_esperadas')::int, 0);
  exception when others then
    raise exception 'CRM: Revisa los datos ingresados.';
  end;

  if v_id is null or coalesce(char_length(v_nombre), 0) not between 3 and 120 then
    raise exception 'CRM: Escribe tu nombre completo.';
  end if;
  if v_telefono is null or v_telefono !~ '^\+[0-9]{8,15}$' then raise exception 'CRM: Revisa tu número de WhatsApp.'; end if;
  if v_email is not null and (char_length(v_email) > 254 or v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$') then
    raise exception 'CRM: Revisa tu correo electrónico.';
  end if;
  if coalesce(char_length(v_comuna), 0) not between 2 and 80 then raise exception 'CRM: Indica tu ciudad o comuna.'; end if;
  if coalesce(char_length(v_marca), 0) not between 1 and 60 then raise exception 'CRM: Indica la marca.'; end if;
  if coalesce(char_length(v_modelo), 0) not between 1 and 80 then raise exception 'CRM: Indica el modelo.'; end if;
  if char_length(v_version) > 120 then raise exception 'CRM: La versión es demasiado larga.'; end if;
  if v_anio is null or v_anio not between 1950 and extract(year from now())::int + 1 then raise exception 'CRM: Revisa el año.'; end if;
  if v_km is null or v_km not between 0 and 3000000 then raise exception 'CRM: Revisa el kilometraje.'; end if;
  if v_patente is not null and not public.crm_patente_valida(v_patente) then raise exception 'CRM: Revisa la patente.'; end if;
  if v_precio is not null and v_precio not between 1 and 10000000000 then raise exception 'CRM: Revisa el precio esperado.'; end if;
  if char_length(v_observaciones) > 2000 then raise exception 'CRM: Las observaciones son demasiado largas.'; end if;
  if v_fotos not between 0 and 10 then raise exception 'CRM: Puedes adjuntar hasta 10 fotografías.'; end if;

  select a.id into v_automotora from public.automotoras a where a.slug = 'chillan-vende-autos';
  if v_automotora is null then raise exception 'CRM: No pudimos recibir tu solicitud.'; end if;

  perform pg_advisory_xact_lock(hashtext('crm_recibir_evaluacion'));

  select * into v_existente from public.crm_solicitudes_evaluacion s where s.id = v_id;
  if found then
    if v_existente.telefono <> v_telefono then raise exception 'CRM: No pudimos recibir tu solicitud.'; end if;
    return jsonb_build_object('id', v_existente.id, 'repetida', true, 'subir_fotos', cardinality(v_existente.fotos) = 0);
  end if;

  select * into v_existente from public.crm_solicitudes_evaluacion s
  where s.automotora_id = v_automotora and s.telefono = v_telefono and s.estado in ('nueva', 'en_revision')
    and lower(s.marca) = lower(v_marca) and lower(s.modelo) = lower(v_modelo) and s.anio = v_anio
    and s.creado_en > now() - interval '7 days'
  order by s.creado_en desc limit 1;
  if found then return jsonb_build_object('id', v_existente.id, 'repetida', true, 'subir_fotos', false); end if;

  if (select count(*) from public.crm_solicitudes_evaluacion s
      where s.telefono = v_telefono and s.creado_en > now() - interval '24 hours') >= 3 then
    raise exception 'CRM: Ya recibimos varias solicitudes de este número. Escríbenos por WhatsApp.';
  end if;
  if (select count(*) from public.crm_solicitudes_evaluacion s
      where s.automotora_id = v_automotora and s.creado_en > now() - interval '1 hour') >= 30 then
    raise exception 'CRM: Estamos recibiendo muchas solicitudes. Intenta de nuevo en unos minutos.';
  end if;

  select coalesce(array_agg(distinct c.id), '{}') into v_candidatos
  from public.crm_clientes c
  where c.automotora_id = v_automotora
    and (c.telefono = v_telefono or (v_email is not null and lower(c.email) = v_email));

  if cardinality(v_candidatos) = 0 then
    insert into public.crm_clientes (automotora_id, nombre, telefono, email, comuna)
    values (v_automotora, v_nombre, v_telefono, v_email, v_comuna)
    returning id into v_cliente;
    v_coincidencia := 'cliente_nuevo';
  elsif cardinality(v_candidatos) = 1 and exists (
    select 1 from public.crm_clientes c
    where c.id = v_candidatos[1] and public.crm_nombres_compatibles(c.nombre, v_nombre)
  ) then
    v_cliente := v_candidatos[1];
    v_coincidencia := 'cliente_existente';
  else
    v_coincidencia := 'revisar';
  end if;

  v_resumen := v_marca || ' ' || v_modelo || ' ' || v_anio;
  if v_cliente is not null then
    v_oportunidad := public.crm_abrir_seguimiento_evaluacion(
      v_automotora, v_cliente, v_resumen, 'Solicitud recibida desde la web: ' || v_resumen || '.');
  end if;

  insert into public.crm_solicitudes_evaluacion (id, automotora_id, cliente_id, oportunidad_id, coincidencia, candidatos,
    nombre, telefono, email, comuna, marca, modelo, version, anio, km, patente, precio_esperado, observaciones, fotos_esperadas)
  values (v_id, v_automotora, v_cliente, v_oportunidad, v_coincidencia,
    case when v_coincidencia = 'revisar' then v_candidatos else '{}' end,
    v_nombre, v_telefono, v_email, v_comuna, v_marca, v_modelo, v_version, v_anio, v_km, v_patente, v_precio, v_observaciones, v_fotos);

  return jsonb_build_object('id', v_id, 'repetida', false, 'subir_fotos', v_fotos > 0);
end $$;

create or replace function public.crm_foto_evaluacion_permitida(p_nombre text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from regexp_matches(p_nombre, '^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/([0-9])\.(webp|jpg)$') m
    join public.crm_solicitudes_evaluacion s on s.id = m[1]::uuid
    where m[2]::int < s.fotos_esperadas and s.estado = 'nueva'
      and cardinality(s.fotos) = 0 and s.creado_en > now() - interval '30 minutes'
  )
$$;

create or replace function public.crm_foto_evaluacion_propia(p_nombre text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.crm_solicitudes_evaluacion s
    where s.id::text = split_part(p_nombre, '/', 1) and s.automotora_id = public.mi_automotora()
  )
$$;

create or replace function public.crm_confirmar_fotos_evaluacion(p_id uuid)
returns int language plpgsql security definer set search_path = '' as $$
declare
  v_fotos text[];
begin
  select coalesce(array_agg(o.name order by o.name), '{}') into v_fotos
  from storage.objects o
  join public.crm_solicitudes_evaluacion s on s.id = p_id
  where o.bucket_id = 'evaluaciones' and split_part(o.name, '/', 1) = p_id::text
    and o.name ~ '/[0-9]\.(webp|jpg)$' and s.creado_en > now() - interval '30 minutes';
  update public.crm_solicitudes_evaluacion s set fotos = v_fotos
  where s.id = p_id and cardinality(s.fotos) = 0 and s.creado_en > now() - interval '30 minutes';
  return cardinality(v_fotos);
end $$;

-- Acciones internas: corren con los permisos y RLS del usuario.
create or replace function public.crm_resolver_solicitud(p_id uuid, p_cliente uuid)
returns uuid language plpgsql set search_path = '' as $$
declare
  v public.crm_solicitudes_evaluacion;
  v_cliente uuid := p_cliente;
  v_tipo text := 'cliente_existente';
  v_oportunidad uuid;
  v_resumen text;
begin
  select * into v from public.crm_solicitudes_evaluacion s where s.id = p_id for update;
  if not found then raise exception 'CRM: La solicitud ya no existe.'; end if;
  if v.coincidencia <> 'revisar' then raise exception 'CRM: Esta solicitud ya tiene cliente.'; end if;
  if v_cliente is null then
    insert into public.crm_clientes (automotora_id, nombre, telefono, email, comuna)
    values (v.automotora_id, v.nombre, v.telefono, v.email, v.comuna) returning id into v_cliente;
    v_tipo := 'cliente_nuevo';
  elsif not exists (select 1 from public.crm_clientes c where c.id = v_cliente) then
    raise exception 'CRM: El cliente elegido no existe.';
  end if;
  v_resumen := v.marca || ' ' || v.modelo || ' ' || v.anio;
  v_oportunidad := public.crm_abrir_seguimiento_evaluacion(
    v.automotora_id, v_cliente, v_resumen, 'Solicitud recibida desde la web: ' || v_resumen || '.');
  update public.crm_solicitudes_evaluacion s
  set cliente_id = v_cliente, oportunidad_id = v_oportunidad, coincidencia = v_tipo, candidatos = '{}'
  where s.id = p_id;
  return v_cliente;
end $$;

create or replace function public.crm_convertir_solicitud(p jsonb)
returns jsonb language plpgsql set search_path = '' as $$
declare
  v public.crm_solicitudes_evaluacion;
  v_patente text := public.crm_patente_normalizar(p->>'patente');
  v_estado text := coalesce(nullif(p->>'estado', ''), 'por_confirmar');
  v_vehiculo uuid;
  v_dueno uuid;
  v_consignacion uuid;
begin
  select * into v from public.crm_solicitudes_evaluacion s where s.id = (p->>'id')::uuid for update;
  if not found then raise exception 'CRM: La solicitud ya no existe.'; end if;
  if v.estado in ('convertida', 'descartada') then raise exception 'CRM: Esta solicitud ya fue cerrada.'; end if;
  if v.cliente_id is null then raise exception 'CRM: Primero asocia la solicitud a un cliente.'; end if;
  if not coalesce(public.crm_patente_valida(v_patente), false) then raise exception 'CRM: Ingresa una patente válida.'; end if;
  if v_estado not in ('por_confirmar', 'activa') then raise exception 'CRM: Estado de consignación no válido.'; end if;

  select c.id, c.cliente_id into v_vehiculo, v_dueno from public.crm_vehiculos c
  where c.automotora_id = v.automotora_id and c.patente = v_patente for update;
  if v_vehiculo is null then
    insert into public.crm_vehiculos (automotora_id, cliente_id, patente, marca, modelo, version, anio, km, propietario_origen)
    values (v.automotora_id, v.cliente_id, v_patente, v.marca, v.modelo, v.version, v.anio, v.km, 'usuario')
    returning id into v_vehiculo;
  elsif v_dueno <> v.cliente_id then
    raise exception 'CRM: Esa patente pertenece a otro cliente.';
  end if;
  if exists (select 1 from public.crm_consignaciones c where c.vehiculo_id = v_vehiculo and c.estado in ('por_confirmar', 'activa')) then
    raise exception 'CRM: El vehículo ya tiene una consignación vigente.';
  end if;

  insert into public.crm_consignaciones
    (automotora_id, vehiculo_id, propietario_id, estado, precio_solicitado, precio_minimo, observaciones)
  values (v.automotora_id, v_vehiculo, v.cliente_id, v_estado,
    coalesce(nullif(p->>'precio_solicitado', '')::bigint, v.precio_esperado),
    nullif(p->>'precio_minimo', '')::bigint, v.observaciones)
  returning id into v_consignacion;

  update public.crm_solicitudes_evaluacion s
  set estado = 'convertida', vehiculo_id = v_vehiculo, consignacion_id = v_consignacion, patente = v_patente
  where s.id = v.id;
  if v.oportunidad_id is not null then
    update public.crm_oportunidades o
    set etapa = 'negociacion', auto_resumen = left(v.marca || ' ' || v.modelo || ' ' || v.anio || ' (' || v_patente || ')', 200)
    where o.id = v.oportunidad_id and o.etapa not in ('vendido', 'perdido');
  end if;
  insert into public.crm_actividades (automotora_id, cliente_id, oportunidad_id, vehiculo_id, consignacion_id, tipo, canal, contenido)
  values (v.automotora_id, v.cliente_id, v.oportunidad_id, v_vehiculo, v_consignacion, 'nota', 'web', 'Solicitud de evaluación convertida en consignación.');
  return jsonb_build_object('vehiculo', v_vehiculo, 'consignacion', v_consignacion);
end $$;

-- Las fotos de propietarios son privadas: no van al almacenamiento público de autos.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('evaluaciones', 'evaluaciones', false, 3145728, array['image/webp', 'image/jpeg'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "publico sube fotos de evaluacion" on storage.objects;
create policy "publico sube fotos de evaluacion" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'evaluaciones' and public.crm_foto_evaluacion_permitida(name));

drop policy if exists "automotora ve fotos de evaluacion" on storage.objects;
create policy "automotora ve fotos de evaluacion" on storage.objects
  for select to authenticated
  using (bucket_id = 'evaluaciones' and public.crm_foto_evaluacion_propia(name));

drop policy if exists "automotora borra fotos de evaluacion" on storage.objects;
create policy "automotora borra fotos de evaluacion" on storage.objects
  for delete to authenticated
  using (bucket_id = 'evaluaciones' and public.crm_foto_evaluacion_propia(name));

alter table public.crm_solicitudes_evaluacion enable row level security;
revoke all on public.crm_solicitudes_evaluacion from public, anon;
grant select, update, delete on public.crm_solicitudes_evaluacion to authenticated;

drop policy if exists "automotora gestiona solicitudes" on public.crm_solicitudes_evaluacion;
create policy "automotora gestiona solicitudes" on public.crm_solicitudes_evaluacion
  for all to authenticated
  using (automotora_id = mi_automotora()) with check (automotora_id = mi_automotora());

revoke all on function public.crm_abrir_seguimiento_evaluacion(uuid, uuid, text, text) from public, anon;
revoke all on function public.crm_recibir_evaluacion(jsonb) from public;
revoke all on function public.crm_confirmar_fotos_evaluacion(uuid) from public;
revoke all on function public.crm_resolver_solicitud(uuid, uuid) from public, anon;
revoke all on function public.crm_convertir_solicitud(jsonb) from public, anon;
grant execute on function public.crm_abrir_seguimiento_evaluacion(uuid, uuid, text, text) to authenticated;
grant execute on function public.crm_recibir_evaluacion(jsonb) to anon, authenticated;
grant execute on function public.crm_confirmar_fotos_evaluacion(uuid) to anon, authenticated;
grant execute on function public.crm_resolver_solicitud(uuid, uuid) to authenticated;
grant execute on function public.crm_convertir_solicitud(jsonb) to authenticated;
