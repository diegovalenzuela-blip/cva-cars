-- Cada suscripción a noticias y ofertas también queda en el CRM.
-- Corre dentro de la base al insertar en "suscriptores": no agrega ningún punto de entrada
-- público nuevo y, si algo falla en el CRM, la suscripción igual se guarda.
-- Se puede ejecutar más de una vez sin duplicar contactos ni notas.

create or replace function public.crm_registrar_suscriptor(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  s public.suscriptores;
  v_email text;
  v_telefono text;
  v_cliente uuid;
  v_texto text;
begin
  select * into s from public.suscriptores x where x.id = p_id;
  if not found then return; end if;

  -- Ya registrada (por ejemplo, al volver a correr esta migración).
  if exists (
    select 1 from public.crm_actividades a
    where a.automotora_id = s.automotora_id and a.id_externo = 'suscriptor:' || s.id
  ) then
    return;
  end if;

  -- Freno ante envíos masivos: la suscripción se guarda, pero no llena el CRM.
  if (select count(*) from public.crm_actividades a
      where a.automotora_id = s.automotora_id and a.id_externo like 'suscriptor:%'
        and a.creado_en > now() - interval '1 hour') >= 30 then
    return;
  end if;

  v_email := lower(btrim(s.email));
  v_telefono := case when s.telefono ~ '^\+[0-9]{8,15}$' then s.telefono end;

  -- Primero el teléfono, después el correo. A un contacto existente no se le cambia la ficha:
  -- solo se le agrega la nota, igual que con las solicitudes de evaluación.
  if v_telefono is not null then
    select c.id into v_cliente from public.crm_clientes c
    where c.automotora_id = s.automotora_id and c.telefono = v_telefono
    limit 1;
  end if;
  if v_cliente is null then
    select c.id into v_cliente from public.crm_clientes c
    where c.automotora_id = s.automotora_id and lower(c.email) = v_email
    limit 1;
  end if;

  if v_cliente is null then
    insert into public.crm_clientes (automotora_id, nombre, telefono, email, notas)
    values (
      s.automotora_id,
      left('Suscriptor (' || split_part(v_email, '@', 1) || ')', 120),
      v_telefono,
      v_email,
      'Llegó por la suscripción a noticias y ofertas de la página. Falta su nombre.'
    )
    returning id into v_cliente;
  end if;

  v_texto := 'Se suscribió a noticias y ofertas en la página'
    || coalesce(' (' || s.origen || ')', '')
    || '. Correo: ' || v_email
    || '. Teléfono: ' || s.telefono || '.';

  insert into public.crm_actividades (automotora_id, cliente_id, tipo, canal, direccion, contenido, id_externo, creado_por)
  values (s.automotora_id, v_cliente, 'nota', 'web', 'entrante', left(v_texto, 2000), 'suscriptor:' || s.id, null);
end $$;

create or replace function public.crm_suscriptor_al_crm()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  begin
    perform public.crm_registrar_suscriptor(new.id);
  exception when others then
    -- El CRM nunca debe impedir que la persona quede suscrita.
    null;
  end;
  return new;
end $$;

drop trigger if exists suscriptores_al_crm on public.suscriptores;
create trigger suscriptores_al_crm
  after insert on public.suscriptores
  for each row execute function public.crm_suscriptor_al_crm();

revoke all on function public.crm_registrar_suscriptor(uuid) from public, anon, authenticated;
revoke all on function public.crm_suscriptor_al_crm() from public, anon, authenticated;

-- Los suscriptores que ya existían también pasan al CRM.
do $$
declare
  r record;
begin
  for r in select x.id from public.suscriptores x order by x.creado_en loop
    begin
      perform public.crm_registrar_suscriptor(r.id);
    exception when others then
      null;
    end;
  end loop;
end $$;
