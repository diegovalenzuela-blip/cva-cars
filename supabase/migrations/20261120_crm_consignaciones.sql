-- Consignaciones e importador de WhatsApp del CRM.
-- La tabla pública "autos" no se modifica: patentes, RUT y condiciones comerciales
-- viven en tablas privadas. Un cliente puede tener muchos vehículos, y cada vehículo
-- puede tener muchas consignaciones a lo largo del tiempo.

-- ===== Validaciones reutilizables =====

create or replace function public.crm_rut_normalizar(t text)
returns text language sql immutable set search_path = public as $$
  select case when limpio ~ '^[0-9]{7,8}[0-9K]$' then left(limpio, -1) || '-' || right(limpio, 1) end
  from (select upper(regexp_replace(coalesce(t, ''), '[^0-9kK]', '', 'g')) as limpio) s
$$;

create or replace function public.crm_rut_valido(t text)
returns boolean language plpgsql immutable set search_path = public as $$
declare
  cuerpo text;
  suma int := 0;
  factor int := 2;
  resto int;
  esperado text;
begin
  if t is null or t !~ '^[0-9]{7,8}-[0-9K]$' then
    return false;
  end if;
  cuerpo := split_part(t, '-', 1);
  for i in reverse length(cuerpo)..1 loop
    suma := suma + substr(cuerpo, i, 1)::int * factor;
    factor := case when factor = 7 then 2 else factor + 1 end;
  end loop;
  resto := 11 - (suma % 11);
  esperado := case resto when 11 then '0' when 10 then 'K' else resto::text end;
  return split_part(t, '-', 2) = esperado;
end $$;

create or replace function public.crm_patente_normalizar(t text)
returns text language sql immutable set search_path = public as $$
  select nullif(upper(regexp_replace(coalesce(t, ''), '[^0-9A-Za-z]', '', 'g')), '')
$$;

-- Autos actuales (BBBB11) y antiguos (AA1111), motos (BBB11 y AA111) y remolques (AAA111).
create or replace function public.crm_patente_valida(t text)
returns boolean language sql immutable set search_path = public as $$
  select coalesce(t ~ '^([A-Z]{4}[0-9]{2}|[A-Z]{2}[0-9]{4}|[A-Z]{3}[0-9]{2}|[A-Z]{2}[0-9]{3}|[A-Z]{3}[0-9]{3})$', false)
$$;

-- ===== Clientes: se amplía la tabla existente =====

alter table public.crm_clientes add column if not exists rut text;

alter table public.crm_clientes drop constraint if exists crm_clientes_rut_valido;
alter table public.crm_clientes add constraint crm_clientes_rut_valido
  check (rut is null or public.crm_rut_valido(rut));

alter table public.crm_clientes drop constraint if exists crm_clientes_contacto;
alter table public.crm_clientes add constraint crm_clientes_contacto
  check (num_nonnulls(telefono, email, red_social, rut) >= 1);

create unique index if not exists crm_clientes_rut_unico
  on public.crm_clientes (automotora_id, rut) where rut is not null;

-- ===== Vehículos de clientes =====

create table if not exists public.crm_vehiculos (
  id uuid primary key default gen_random_uuid(),
  automotora_id uuid not null references public.automotoras(id) on delete cascade,
  cliente_id uuid not null,
  auto_id uuid references public.autos(id) on delete set null,
  patente text not null check (public.crm_patente_valida(patente)),
  marca text check (marca is null or char_length(marca) between 1 and 60),
  modelo text check (modelo is null or char_length(modelo) between 1 and 80),
  version text check (version is null or char_length(version) <= 120),
  anio int check (anio is null or anio between 1900 and 2100),
  km int check (km is null or km between 0 and 3000000),
  notas text check (notas is null or char_length(notas) <= 2000),
  propietario_origen text not null default 'usuario' check (propietario_origen in ('mensaje', 'usuario')),
  propietario_fragmento text check (propietario_fragmento is null or char_length(propietario_fragmento) <= 500),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint crm_vehiculos_respaldo check (propietario_origen <> 'mensaje' or propietario_fragmento is not null),
  constraint crm_vehiculos_patente_unica unique (automotora_id, patente),
  constraint crm_vehiculos_id_automotora unique (id, automotora_id),
  -- Un cliente con vehículos no se borra por accidente: se protege su historial.
  constraint crm_vehiculos_cliente foreign key (cliente_id, automotora_id)
    references public.crm_clientes (id, automotora_id) on delete restrict
);

create index if not exists crm_vehiculos_cliente_idx on public.crm_vehiculos (cliente_id);
create index if not exists crm_vehiculos_auto_idx on public.crm_vehiculos (auto_id) where auto_id is not null;

-- ===== Consignaciones: una fila por operación =====

create table if not exists public.crm_consignaciones (
  id uuid primary key default gen_random_uuid(),
  automotora_id uuid not null references public.automotoras(id) on delete cascade,
  vehiculo_id uuid not null,
  propietario_id uuid not null,
  estado text not null default 'por_confirmar' check (estado in
    ('por_confirmar', 'activa', 'vendida', 'retirada', 'cancelada')),
  precio_solicitado bigint check (precio_solicitado is null or precio_solicitado > 0),
  precio_minimo bigint check (precio_minimo is null or precio_minimo > 0),
  comision_tipo text check (comision_tipo is null or comision_tipo in ('porcentaje', 'monto')),
  comision_valor numeric(14, 2) check (comision_valor is null or comision_valor > 0),
  condiciones text check (condiciones is null or char_length(condiciones) <= 2000),
  observaciones text check (observaciones is null or char_length(observaciones) <= 2000),
  inicio_en date,
  cerrado_en timestamptz,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint crm_consignaciones_precios check (
    precio_minimo is null or precio_solicitado is null or precio_minimo <= precio_solicitado),
  constraint crm_consignaciones_comision check (
    num_nonnulls(comision_tipo, comision_valor) in (0, 2)
    and (comision_tipo is distinct from 'porcentaje' or comision_valor <= 100)),
  constraint crm_consignaciones_id_automotora unique (id, automotora_id),
  constraint crm_consignaciones_vehiculo foreign key (vehiculo_id, automotora_id)
    references public.crm_vehiculos (id, automotora_id) on delete restrict,
  constraint crm_consignaciones_propietario foreign key (propietario_id, automotora_id)
    references public.crm_clientes (id, automotora_id) on delete restrict
);

create unique index if not exists crm_consignaciones_vigente_unica
  on public.crm_consignaciones (vehiculo_id) where estado in ('por_confirmar', 'activa');
create index if not exists crm_consignaciones_propietario_idx on public.crm_consignaciones (propietario_id);
create index if not exists crm_consignaciones_estado_idx on public.crm_consignaciones (automotora_id, estado);

create table if not exists public.crm_vehiculo_documentos (
  id uuid primary key default gen_random_uuid(),
  automotora_id uuid not null references public.automotoras(id) on delete cascade,
  vehiculo_id uuid not null,
  tipo text not null check (tipo in ('revision_tecnica', 'permiso_circulacion', 'soap', 'otro')),
  nombre text check (nombre is null or char_length(nombre) between 1 and 120),
  estado text not null default 'no_informado' check (estado in ('al_dia', 'vencido', 'pendiente', 'no_informado')),
  vence_en date,
  detalle text check (detalle is null or char_length(detalle) <= 500),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint crm_documentos_nombre check (tipo <> 'otro' or nombre is not null),
  constraint crm_documentos_vehiculo foreign key (vehiculo_id, automotora_id)
    references public.crm_vehiculos (id, automotora_id) on delete cascade
);

create unique index if not exists crm_documentos_tipo_unico
  on public.crm_vehiculo_documentos (vehiculo_id, tipo) where tipo <> 'otro';

-- El historial del CRM puede apuntar a un vehículo y a una operación específica.
alter table public.crm_actividades add column if not exists vehiculo_id uuid;
alter table public.crm_actividades add column if not exists consignacion_id uuid;

alter table public.crm_actividades drop constraint if exists crm_actividades_vehiculo;
alter table public.crm_actividades add constraint crm_actividades_vehiculo
  foreign key (vehiculo_id, automotora_id)
  references public.crm_vehiculos (id, automotora_id) on delete set null (vehiculo_id);

alter table public.crm_actividades drop constraint if exists crm_actividades_consignacion;
alter table public.crm_actividades add constraint crm_actividades_consignacion
  foreign key (consignacion_id, automotora_id)
  references public.crm_consignaciones (id, automotora_id) on delete set null (consignacion_id);

create index if not exists crm_actividades_vehiculo_idx
  on public.crm_actividades (vehiculo_id, creado_en desc) where vehiculo_id is not null;

-- ===== Importaciones =====

create table if not exists public.crm_importaciones (
  id uuid primary key default gen_random_uuid(),
  automotora_id uuid not null references public.automotoras(id) on delete cascade,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'confirmada', 'descartada')),
  resultado jsonb not null default '{}'::jsonb,
  creado_por uuid default auth.uid(),
  confirmado_por uuid,
  creado_en timestamptz not null default now(),
  confirmado_en timestamptz,
  constraint crm_importaciones_id_automotora unique (id, automotora_id)
);

create index if not exists crm_importaciones_fecha_idx
  on public.crm_importaciones (automotora_id, creado_en desc);

create table if not exists public.crm_importacion_mensajes (
  id uuid primary key default gen_random_uuid(),
  automotora_id uuid not null,
  importacion_id uuid not null,
  orden int not null check (orden >= 0),
  autor text check (autor is null or char_length(autor) <= 120),
  enviado_texto text check (enviado_texto is null or char_length(enviado_texto) <= 60),
  texto text not null check (char_length(texto) between 1 and 20000),
  constraint crm_importacion_mensajes_orden unique (importacion_id, orden),
  constraint crm_importacion_mensajes_id_automotora unique (id, automotora_id),
  constraint crm_importacion_mensajes_importacion foreign key (importacion_id, automotora_id)
    references public.crm_importaciones (id, automotora_id) on delete cascade
);

create table if not exists public.crm_importacion_campos (
  id uuid primary key default gen_random_uuid(),
  automotora_id uuid not null,
  importacion_id uuid not null,
  mensaje_id uuid,
  bloque int not null check (bloque >= 0),
  entidad text not null check (entidad in ('cliente', 'vehiculo', 'consignacion', 'documento')),
  campo text not null check (char_length(campo) between 1 and 60),
  valor_detectado text check (valor_detectado is null or char_length(valor_detectado) <= 2000),
  valor_final text check (valor_final is null or char_length(valor_final) <= 2000),
  estado text not null check (estado in ('detectado', 'pendiente', 'por_confirmar')),
  decision text not null default 'sin_decision' check (decision in ('aceptado', 'editado', 'rechazado', 'sin_decision')),
  inicio int check (inicio is null or inicio >= 0),
  fin int,
  fragmento text check (fragmento is null or char_length(fragmento) <= 500),
  registro_id uuid,
  constraint crm_importacion_campos_rango check (inicio is null or fin is null or fin >= inicio),
  constraint crm_importacion_campos_importacion foreign key (importacion_id, automotora_id)
    references public.crm_importaciones (id, automotora_id) on delete cascade,
  constraint crm_importacion_campos_mensaje foreign key (mensaje_id, automotora_id)
    references public.crm_importacion_mensajes (id, automotora_id) on delete cascade
);

create index if not exists crm_importacion_campos_importacion_idx
  on public.crm_importacion_campos (importacion_id, bloque);

-- ===== Historial de cambios: solo se escribe desde la base =====

create table if not exists public.crm_cambios (
  id bigint generated always as identity primary key,
  automotora_id uuid not null,
  tabla text not null,
  registro_id uuid not null,
  cliente_id uuid,
  vehiculo_id uuid,
  consignacion_id uuid,
  importacion_id uuid,
  operacion text not null check (operacion in ('crear', 'actualizar', 'eliminar')),
  campo text,
  valor_anterior text,
  valor_nuevo text,
  creado_por uuid,
  creado_en timestamptz not null default now()
);

create index if not exists crm_cambios_automotora_idx on public.crm_cambios (automotora_id, creado_en desc);
create index if not exists crm_cambios_vehiculo_idx on public.crm_cambios (vehiculo_id, creado_en desc) where vehiculo_id is not null;
create index if not exists crm_cambios_consignacion_idx on public.crm_cambios (consignacion_id, creado_en desc) where consignacion_id is not null;
create index if not exists crm_cambios_cliente_idx on public.crm_cambios (cliente_id, creado_en desc) where cliente_id is not null;

create or replace function public.crm_registrar_cambios()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  fila jsonb := to_jsonb(case when tg_op = 'DELETE' then old else new end);
  anterior jsonb := case when tg_op = 'UPDATE' then to_jsonb(old) end;
  cliente uuid;
  vehiculo uuid;
  consignacion uuid;
  importacion uuid := nullif(current_setting('crm.importacion_id', true), '')::uuid;
  clave text;
  antes text;
  despues text;
begin
  if tg_table_name = 'crm_clientes' then
    cliente := (fila->>'id')::uuid;
  elsif tg_table_name = 'crm_vehiculos' then
    cliente := (fila->>'cliente_id')::uuid;
    vehiculo := (fila->>'id')::uuid;
  elsif tg_table_name = 'crm_consignaciones' then
    cliente := (fila->>'propietario_id')::uuid;
    vehiculo := (fila->>'vehiculo_id')::uuid;
    consignacion := (fila->>'id')::uuid;
  else
    vehiculo := (fila->>'vehiculo_id')::uuid;
  end if;

  if tg_op <> 'UPDATE' then
    insert into public.crm_cambios
      (automotora_id, tabla, registro_id, cliente_id, vehiculo_id, consignacion_id, importacion_id, operacion, creado_por)
    values ((fila->>'automotora_id')::uuid, tg_table_name, (fila->>'id')::uuid, cliente, vehiculo, consignacion, importacion,
      case when tg_op = 'INSERT' then 'crear' else 'eliminar' end, auth.uid());
  else
    for clave in select jsonb_object_keys(fila) loop
      continue when clave in ('id', 'automotora_id', 'creado_en', 'actualizado_en', 'cerrado_en');
      continue when (anterior->clave) is not distinct from (fila->clave);
      antes := anterior->>clave;
      despues := fila->>clave;
      if clave = 'rut' then
        antes := case when antes is not null then '***' || right(antes, 4) end;
        despues := case when despues is not null then '***' || right(despues, 4) end;
      end if;
      insert into public.crm_cambios
        (automotora_id, tabla, registro_id, cliente_id, vehiculo_id, consignacion_id, importacion_id,
         operacion, campo, valor_anterior, valor_nuevo, creado_por)
      values ((fila->>'automotora_id')::uuid, tg_table_name, (fila->>'id')::uuid, cliente, vehiculo, consignacion, importacion,
        'actualizar', clave, antes, despues, auth.uid());
    end loop;
  end if;
  return null;
end $$;

revoke all on function public.crm_registrar_cambios() from public, anon, authenticated;

-- ===== Reglas de negocio en la base =====

create or replace function public.crm_preparar_consignacion()
returns trigger language plpgsql set search_path = public as $$
declare
  duenio uuid;
begin
  if new.estado in ('vendida', 'retirada', 'cancelada') then
    if tg_op = 'INSERT' or old.estado is distinct from new.estado then
      new.cerrado_en := now();
    end if;
  else
    new.cerrado_en := null;
    select cliente_id into duenio from crm_vehiculos where id = new.vehiculo_id;
    if duenio is distinct from new.propietario_id then
      raise exception 'CRM: el propietario de la consignación no coincide con el dueño del vehículo.';
    end if;
  end if;
  return new;
end $$;

create or replace function public.crm_proteger_dueno()
returns trigger language plpgsql set search_path = public as $$
begin
  if exists (
    select 1 from crm_consignaciones c
    where c.vehiculo_id = new.id and c.estado in ('por_confirmar', 'activa')
  ) then
    raise exception 'CRM: cierra la consignación vigente antes de cambiar el propietario.';
  end if;
  return new;
end $$;

drop trigger if exists crm_vehiculos_tocar on public.crm_vehiculos;
create trigger crm_vehiculos_tocar before update on public.crm_vehiculos
  for each row execute function public.crm_tocar();

drop trigger if exists crm_vehiculos_dueno on public.crm_vehiculos;
create trigger crm_vehiculos_dueno before update of cliente_id on public.crm_vehiculos
  for each row when (old.cliente_id is distinct from new.cliente_id)
  execute function public.crm_proteger_dueno();

drop trigger if exists crm_consignaciones_tocar on public.crm_consignaciones;
create trigger crm_consignaciones_tocar before update on public.crm_consignaciones
  for each row execute function public.crm_tocar();

drop trigger if exists crm_consignaciones_preparar on public.crm_consignaciones;
create trigger crm_consignaciones_preparar before insert or update on public.crm_consignaciones
  for each row execute function public.crm_preparar_consignacion();

drop trigger if exists crm_documentos_tocar on public.crm_vehiculo_documentos;
create trigger crm_documentos_tocar before update on public.crm_vehiculo_documentos
  for each row execute function public.crm_tocar();

drop trigger if exists crm_clientes_historial on public.crm_clientes;
create trigger crm_clientes_historial after insert or update or delete on public.crm_clientes
  for each row execute function public.crm_registrar_cambios();

drop trigger if exists crm_vehiculos_historial on public.crm_vehiculos;
create trigger crm_vehiculos_historial after insert or update or delete on public.crm_vehiculos
  for each row execute function public.crm_registrar_cambios();

drop trigger if exists crm_consignaciones_historial on public.crm_consignaciones;
create trigger crm_consignaciones_historial after insert or update or delete on public.crm_consignaciones
  for each row execute function public.crm_registrar_cambios();

drop trigger if exists crm_documentos_historial on public.crm_vehiculo_documentos;
create trigger crm_documentos_historial after insert or update or delete on public.crm_vehiculo_documentos
  for each row execute function public.crm_registrar_cambios();

-- ===== Guardado de una importación revisada =====

-- Aplica solo campos permitidos y exige el valor que el usuario vio en la revisión.
create or replace function public.crm_aplicar_cambios(
  tabla text, registro uuid, cambios jsonb, permitidos text[], bloque int
) returns void language plpgsql set search_path = public as $$
declare
  fila jsonb;
  campo text;
  cambio jsonb;
  tipo text;
  distinto boolean;
begin
  if tabla not in ('crm_clientes', 'crm_vehiculos', 'crm_consignaciones', 'crm_vehiculo_documentos') then
    raise exception 'CRM: tabla no permitida.';
  end if;
  if cambios is null or jsonb_typeof(cambios) <> 'object' then
    return;
  end if;
  execute format('select to_jsonb(t) from public.%I t where id = $1', tabla) into fila using registro;
  if fila is null then
    raise exception 'CRM: bloque %: el registro ya no existe.', bloque;
  end if;
  for campo, cambio in select key, value from jsonb_each(cambios) loop
    if not campo = any (permitidos) then
      raise exception 'CRM: bloque %: el campo % no se puede modificar.', bloque, campo;
    end if;
    select format_type(a.atttypid, a.atttypmod) into tipo
    from pg_attribute a
    where a.attrelid = format('public.%I', tabla)::regclass and a.attname = campo and not a.attisdropped;
    -- Se compara por tipo: 5 y 5.00 son el mismo valor.
    execute format('select ($1)::%s is distinct from ($2)::%s', tipo, tipo)
      into distinto using fila->>campo, cambio->>'de';
    if distinto then
      raise exception 'CRM: bloque %: % cambió mientras revisabas. Vuelve a analizar.', bloque, campo;
    end if;
    execute format('update public.%I set %I = $1::%s where id = $2', tabla, campo, tipo)
      using cambio->>'a', registro;
  end loop;
end $$;

create or replace function public.crm_confirmar_importacion(p jsonb)
returns jsonb language plpgsql security invoker set search_path = public as $$
declare
  automotora uuid := mi_automotora();
  importacion uuid;
  estado_final text := coalesce(p->>'estado', 'confirmada');
  estado_actual text;
  mensajes jsonb := coalesce(p->'mensajes', '[]'::jsonb);
  bloques jsonb := coalesce(p->'bloques', '[]'::jsonb);
  bloque jsonb;
  n int;
  c jsonb;
  v jsonb;
  o jsonb;
  doc jsonb;
  datos jsonb;
  cliente uuid;
  vehiculo uuid;
  consignacion uuid;
  documento uuid;
  dueno uuid;
  valor text;
  rut_limpio text;
  patente_limpia text;
  origen text;
  fragmento text;
  registros jsonb := '{}'::jsonb;
  creados jsonb := '{"clientes":0,"vehiculos":0,"consignaciones":0,"documentos":0}'::jsonb;
  actualizados jsonb := '{"clientes":0,"vehiculos":0,"consignaciones":0,"documentos":0}'::jsonb;
  salida jsonb;
begin
  if automotora is null then
    raise exception 'CRM: tu usuario no está vinculado a una automotora.' using errcode = '42501';
  end if;
  if estado_final not in ('confirmada', 'pendiente') then
    raise exception 'CRM: estado de importación no válido.';
  end if;
  if jsonb_typeof(mensajes) <> 'array' or jsonb_array_length(mensajes) not between 1 and 50 then
    raise exception 'CRM: la importación debe tener entre 1 y 50 mensajes.';
  end if;
  if jsonb_typeof(bloques) <> 'array' or jsonb_array_length(bloques) > 50 then
    raise exception 'CRM: la importación tiene demasiados bloques.';
  end if;

  if jsonb_typeof(coalesce(p->'campos', '[]'::jsonb)) <> 'array' or jsonb_array_length(coalesce(p->'campos', '[]'::jsonb)) > 2000 then
    raise exception 'CRM: la importación tiene demasiados campos.';
  end if;

  importacion := (p->>'importacion_id')::uuid;
  if importacion is null then
    raise exception 'CRM: falta el identificador de la importación.';
  end if;

  select estado into estado_actual from crm_importaciones where id = importacion for update;
  if estado_actual = 'confirmada' then
    raise exception 'CRM: esta importación ya fue confirmada.';
  elsif estado_actual is null then
    insert into crm_importaciones (id, automotora_id) values (importacion, automotora);
  else
    delete from crm_importacion_campos where importacion_id = importacion;
    delete from crm_importacion_mensajes where importacion_id = importacion;
  end if;

  perform set_config('crm.importacion_id', importacion::text, true);

  insert into crm_importacion_mensajes (automotora_id, importacion_id, orden, autor, enviado_texto, texto)
  select automotora, importacion, (m.valor->>'orden')::int, m.valor->>'autor', m.valor->>'enviado_texto', m.valor->>'texto'
  from jsonb_array_elements(mensajes) as m(valor);

  if estado_final = 'confirmada' then
    n := -1;
    for bloque in select value from jsonb_array_elements(bloques) loop
      n := n + 1;
      c := bloque->'cliente';
      v := bloque->'vehiculo';
      o := bloque->'consignacion';
      cliente := null;
      vehiculo := null;
      consignacion := null;

      -- Propietario
      if c is null or jsonb_typeof(c) <> 'object' then
        raise exception 'CRM: bloque %: falta elegir el cliente.', n;
      elsif c->>'accion' = 'crear' then
        datos := coalesce(c->'datos', '{}'::jsonb);
        rut_limpio := null;
        if nullif(btrim(datos->>'rut'), '') is not null then
          rut_limpio := crm_rut_normalizar(datos->>'rut');
          if not crm_rut_valido(rut_limpio) then
            raise exception 'CRM: bloque %: el RUT no es válido.', n;
          end if;
        end if;
        if exists (
          select 1 from crm_clientes x
          where x.automotora_id = automotora
            and ((rut_limpio is not null and x.rut = rut_limpio)
              or (nullif(datos->>'telefono', '') is not null and x.telefono = datos->>'telefono')
              or (nullif(datos->>'email', '') is not null and lower(x.email) = lower(datos->>'email')))
        ) then
          raise exception 'CRM: bloque %: ya existe un cliente con ese RUT, teléfono o correo.', n;
        end if;
        insert into crm_clientes (automotora_id, nombre, rut, telefono, email, red_social, comuna, notas)
        values (automotora, btrim(datos->>'nombre'), rut_limpio, nullif(datos->>'telefono', ''),
          nullif(lower(datos->>'email'), ''), nullif(datos->>'red_social', ''), nullif(datos->>'comuna', ''), nullif(datos->>'notas', ''))
        returning id into cliente;
        creados := jsonb_set(creados, '{clientes}', to_jsonb((creados->>'clientes')::int + 1));
      elsif c->>'accion' = 'usar' then
        select id into cliente from crm_clientes where id = (c->>'id')::uuid;
        if cliente is null then
          raise exception 'CRM: bloque %: el cliente elegido no existe.', n;
        end if;
        if c->'cambios' is not null and c->'cambios' <> '{}'::jsonb then
          perform crm_aplicar_cambios('crm_clientes', cliente, c->'cambios',
            array['nombre', 'rut', 'telefono', 'email', 'red_social', 'comuna', 'notas'], n);
          actualizados := jsonb_set(actualizados, '{clientes}', to_jsonb((actualizados->>'clientes')::int + 1));
        end if;
      elsif c->>'accion' = 'bloque' then
        if (c->>'bloque')::int is null or (c->>'bloque')::int >= n then
          raise exception 'CRM: bloque %: el propietario indicado no está disponible.', n;
        end if;
        cliente := (registros->(c->>'bloque')->>'cliente')::uuid;
      else
        raise exception 'CRM: bloque %: acción de cliente no válida.', n;
      end if;

      -- Vehículo: cada asociación con el dueño necesita respaldo.
      if v is not null and jsonb_typeof(v) = 'object' then
        origen := v->>'propietario_origen';
        fragmento := nullif(btrim(v->>'propietario_fragmento'), '');
        if origen not in ('mensaje', 'usuario') or origen is null then
          raise exception 'CRM: bloque %: confirma quién es el propietario del vehículo.', n;
        end if;
        if origen = 'mensaje' and fragmento is null then
          raise exception 'CRM: bloque %: falta el fragmento que respalda al propietario.', n;
        end if;

        if v->>'accion' = 'crear' then
          datos := coalesce(v->'datos', '{}'::jsonb);
          patente_limpia := crm_patente_normalizar(datos->>'patente');
          if not crm_patente_valida(patente_limpia) then
            raise exception 'CRM: bloque %: la patente no es válida.', n;
          end if;
          if exists (select 1 from crm_vehiculos x where x.automotora_id = automotora and x.patente = patente_limpia) then
            raise exception 'CRM: bloque %: la patente % ya está registrada.', n, patente_limpia;
          end if;
          insert into crm_vehiculos (automotora_id, cliente_id, patente, marca, modelo, version, anio, km, notas,
            propietario_origen, propietario_fragmento)
          values (automotora, cliente, patente_limpia, nullif(datos->>'marca', ''), nullif(datos->>'modelo', ''),
            nullif(datos->>'version', ''), nullif(datos->>'anio', '')::int, nullif(datos->>'km', '')::int,
            nullif(datos->>'notas', ''), origen, fragmento)
          returning id into vehiculo;
          creados := jsonb_set(creados, '{vehiculos}', to_jsonb((creados->>'vehiculos')::int + 1));
        elsif v->>'accion' = 'usar' then
          select id, cliente_id into vehiculo, dueno from crm_vehiculos where id = (v->>'id')::uuid for update;
          if vehiculo is null then
            raise exception 'CRM: bloque %: el vehículo elegido no existe.', n;
          end if;
          if dueno <> cliente then
            if coalesce((v->>'cambiar_propietario')::boolean, false) is not true or origen <> 'usuario' then
              raise exception 'CRM: bloque %: el vehículo pertenece a otro cliente. Confirma el cambio de propietario.', n;
            end if;
            update crm_vehiculos set cliente_id = cliente, propietario_origen = origen, propietario_fragmento = fragmento
            where id = vehiculo;
            actualizados := jsonb_set(actualizados, '{vehiculos}', to_jsonb((actualizados->>'vehiculos')::int + 1));
          end if;
          if v->'cambios' is not null and v->'cambios' <> '{}'::jsonb then
            perform crm_aplicar_cambios('crm_vehiculos', vehiculo, v->'cambios',
              array['patente', 'marca', 'modelo', 'version', 'anio', 'km', 'notas'], n);
            actualizados := jsonb_set(actualizados, '{vehiculos}', to_jsonb((actualizados->>'vehiculos')::int + 1));
          end if;
        else
          raise exception 'CRM: bloque %: acción de vehículo no válida.', n;
        end if;
      end if;

      -- Consignación
      if o is not null and jsonb_typeof(o) = 'object' and coalesce(o->>'accion', 'ninguna') <> 'ninguna' then
        if vehiculo is null then
          raise exception 'CRM: bloque %: una consignación necesita un vehículo.', n;
        end if;
        if o->>'accion' = 'crear' then
          datos := coalesce(o->'datos', '{}'::jsonb);
          valor := coalesce(nullif(datos->>'estado', ''), 'por_confirmar');
          if valor not in ('por_confirmar', 'activa') then
            raise exception 'CRM: bloque %: una consignación nueva debe quedar por confirmar o activa.', n;
          end if;
          if exists (select 1 from crm_consignaciones x where x.vehiculo_id = vehiculo and x.estado in ('por_confirmar', 'activa')) then
            raise exception 'CRM: bloque %: el vehículo ya tiene una consignación vigente.', n;
          end if;
          insert into crm_consignaciones (automotora_id, vehiculo_id, propietario_id, estado, precio_solicitado,
            precio_minimo, comision_tipo, comision_valor, condiciones, observaciones, inicio_en)
          values (automotora, vehiculo, cliente, valor, nullif(datos->>'precio_solicitado', '')::bigint,
            nullif(datos->>'precio_minimo', '')::bigint, nullif(datos->>'comision_tipo', ''),
            nullif(datos->>'comision_valor', '')::numeric, nullif(datos->>'condiciones', ''),
            nullif(datos->>'observaciones', ''), nullif(datos->>'inicio_en', '')::date)
          returning id into consignacion;
          creados := jsonb_set(creados, '{consignaciones}', to_jsonb((creados->>'consignaciones')::int + 1));
        elsif o->>'accion' = 'actualizar' then
          select id into consignacion from crm_consignaciones
          where id = (o->>'id')::uuid and vehiculo_id = vehiculo for update;
          if consignacion is null then
            raise exception 'CRM: bloque %: la consignación no corresponde a este vehículo.', n;
          end if;
          perform crm_aplicar_cambios('crm_consignaciones', consignacion, o->'cambios',
            array['estado', 'precio_solicitado', 'precio_minimo', 'comision_tipo', 'comision_valor',
                  'condiciones', 'observaciones', 'inicio_en'], n);
          actualizados := jsonb_set(actualizados, '{consignaciones}', to_jsonb((actualizados->>'consignaciones')::int + 1));
        else
          raise exception 'CRM: bloque %: acción de consignación no válida.', n;
        end if;
      end if;

      -- Documentos del vehículo
      for doc in select value from jsonb_array_elements(coalesce(bloque->'documentos', '[]'::jsonb)) loop
        if vehiculo is null then
          raise exception 'CRM: bloque %: un documento necesita un vehículo.', n;
        end if;
        if doc->>'accion' = 'crear' then
          insert into crm_vehiculo_documentos (automotora_id, vehiculo_id, tipo, nombre, estado, vence_en, detalle)
          values (automotora, vehiculo, doc->'datos'->>'tipo', nullif(doc->'datos'->>'nombre', ''),
            coalesce(nullif(doc->'datos'->>'estado', ''), 'no_informado'),
            nullif(doc->'datos'->>'vence_en', '')::date, nullif(doc->'datos'->>'detalle', ''));
          creados := jsonb_set(creados, '{documentos}', to_jsonb((creados->>'documentos')::int + 1));
        elsif doc->>'accion' = 'actualizar' then
          select id into documento from crm_vehiculo_documentos
          where id = (doc->>'id')::uuid and vehiculo_id = vehiculo;
          if documento is null then
            raise exception 'CRM: bloque %: el documento no corresponde a este vehículo.', n;
          end if;
          perform crm_aplicar_cambios('crm_vehiculo_documentos', documento, doc->'cambios',
            array['estado', 'vence_en', 'detalle', 'nombre'], n);
          actualizados := jsonb_set(actualizados, '{documentos}', to_jsonb((actualizados->>'documentos')::int + 1));
        else
          raise exception 'CRM: bloque %: acción de documento no válida.', n;
        end if;
      end loop;

      insert into crm_actividades (automotora_id, cliente_id, vehiculo_id, consignacion_id, tipo, canal, contenido)
      values (automotora, cliente, vehiculo, consignacion, 'nota', 'whatsapp', 'Información importada desde WhatsApp.');

      registros := registros || jsonb_build_object(n::text, jsonb_build_object(
        'cliente', cliente, 'vehiculo', vehiculo, 'consignacion', consignacion));
    end loop;
  end if;

  insert into crm_importacion_campos (automotora_id, importacion_id, mensaje_id, bloque, entidad, campo,
    valor_detectado, valor_final, estado, decision, inicio, fin, fragmento, registro_id)
  select automotora, importacion, m.id, (f.valor->>'bloque')::int, f.valor->>'entidad', f.valor->>'campo',
    f.valor->>'valor_detectado', f.valor->>'valor_final', f.valor->>'estado',
    coalesce(f.valor->>'decision', 'sin_decision'), (f.valor->>'inicio')::int, (f.valor->>'fin')::int,
    left(f.valor->>'fragmento', 500),
    (registros->(f.valor->>'bloque')->>(case f.valor->>'entidad' when 'documento' then 'vehiculo' else f.valor->>'entidad' end))::uuid
  from jsonb_array_elements(coalesce(p->'campos', '[]'::jsonb)) as f(valor)
  left join crm_importacion_mensajes m
    on m.importacion_id = importacion and m.orden = (f.valor->>'mensaje_orden')::int;

  salida := jsonb_build_object('importacion_id', importacion, 'estado', estado_final,
    'creados', creados, 'actualizados', actualizados, 'registros', registros);

  update crm_importaciones
  set estado = estado_final, resultado = salida,
      confirmado_por = case when estado_final = 'confirmada' then auth.uid() end,
      confirmado_en = case when estado_final = 'confirmada' then now() end
  where id = importacion;

  return salida;
end $$;

-- ===== Seguridad: nada de esto es público =====

alter table public.crm_vehiculos enable row level security;
alter table public.crm_consignaciones enable row level security;
alter table public.crm_vehiculo_documentos enable row level security;
alter table public.crm_importaciones enable row level security;
alter table public.crm_importacion_mensajes enable row level security;
alter table public.crm_importacion_campos enable row level security;
alter table public.crm_cambios enable row level security;

revoke all on public.crm_vehiculos, public.crm_consignaciones, public.crm_vehiculo_documentos,
  public.crm_importaciones, public.crm_importacion_mensajes, public.crm_importacion_campos,
  public.crm_cambios from public, anon;
revoke all on public.crm_cambios from authenticated;

grant select, insert, update, delete on public.crm_vehiculos, public.crm_consignaciones,
  public.crm_vehiculo_documentos, public.crm_importaciones, public.crm_importacion_mensajes,
  public.crm_importacion_campos to authenticated;
grant select on public.crm_cambios to authenticated;

drop policy if exists "automotora gestiona vehiculos" on public.crm_vehiculos;
create policy "automotora gestiona vehiculos" on public.crm_vehiculos
  for all to authenticated
  using (automotora_id = mi_automotora())
  with check (
    automotora_id = mi_automotora()
    and (auto_id is null or exists (
      select 1 from public.autos a where a.id = auto_id and a.automotora_id = mi_automotora()
    ))
  );

drop policy if exists "automotora gestiona consignaciones" on public.crm_consignaciones;
create policy "automotora gestiona consignaciones" on public.crm_consignaciones
  for all to authenticated
  using (automotora_id = mi_automotora()) with check (automotora_id = mi_automotora());

drop policy if exists "automotora gestiona documentos" on public.crm_vehiculo_documentos;
create policy "automotora gestiona documentos" on public.crm_vehiculo_documentos
  for all to authenticated
  using (automotora_id = mi_automotora()) with check (automotora_id = mi_automotora());

drop policy if exists "automotora gestiona importaciones" on public.crm_importaciones;
create policy "automotora gestiona importaciones" on public.crm_importaciones
  for all to authenticated
  using (automotora_id = mi_automotora()) with check (automotora_id = mi_automotora());

drop policy if exists "automotora gestiona mensajes importados" on public.crm_importacion_mensajes;
create policy "automotora gestiona mensajes importados" on public.crm_importacion_mensajes
  for all to authenticated
  using (automotora_id = mi_automotora()) with check (automotora_id = mi_automotora());

drop policy if exists "automotora gestiona campos importados" on public.crm_importacion_campos;
create policy "automotora gestiona campos importados" on public.crm_importacion_campos
  for all to authenticated
  using (automotora_id = mi_automotora()) with check (automotora_id = mi_automotora());

drop policy if exists "automotora ve cambios" on public.crm_cambios;
create policy "automotora ve cambios" on public.crm_cambios
  for select to authenticated using (automotora_id = mi_automotora());

revoke all on function public.crm_aplicar_cambios(text, uuid, jsonb, text[], int) from public, anon;
revoke all on function public.crm_confirmar_importacion(jsonb) from public, anon;
grant execute on function public.crm_aplicar_cambios(text, uuid, jsonb, text[], int) to authenticated;
grant execute on function public.crm_confirmar_importacion(jsonb) to authenticated;
