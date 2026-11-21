-- Clasificación interna de cada vehículo: Neutro o Etchevers.
-- Es solo para el panel: vive en una tabla aparte (no en public.autos) para que
-- la página pública, que lee autos, nunca pueda verla. El público no tiene
-- ningún permiso sobre esta tabla.
-- No cambia ni borra datos existentes: a los autos que ya existen les agrega
-- la clasificación "neutro". Se puede ejecutar más de una vez.

create table if not exists public.autos_clasificacion (
  auto_id uuid primary key references public.autos(id) on delete cascade,
  automotora_id uuid not null references public.automotoras(id) on delete cascade,
  clasificacion text not null default 'neutro' check (clasificacion in ('neutro', 'etchevers')),
  actualizado_en timestamptz not null default now()
);

create index if not exists autos_clasificacion_automotora_idx
  on public.autos_clasificacion (automotora_id, clasificacion);

-- Todo auto nuevo nace como "neutro"; el panel guarda enseguida la elegida.
create or replace function public.autos_clasificacion_inicial()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.autos_clasificacion (auto_id, automotora_id)
  values (new.id, new.automotora_id)
  on conflict (auto_id) do nothing;
  return new;
end;
$$;

revoke all on function public.autos_clasificacion_inicial() from public, anon, authenticated;

drop trigger if exists autos_clasificacion_inicial on public.autos;
create trigger autos_clasificacion_inicial after insert on public.autos
  for each row execute function public.autos_clasificacion_inicial();

create or replace function public.autos_clasificacion_tocar()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.actualizado_en := now();
  return new;
end;
$$;

drop trigger if exists autos_clasificacion_tocar on public.autos_clasificacion;
create trigger autos_clasificacion_tocar before update on public.autos_clasificacion
  for each row execute function public.autos_clasificacion_tocar();

-- Autos que ya existían: quedan como "neutro" (solo agrega filas, no cambia nada).
insert into public.autos_clasificacion (auto_id, automotora_id)
select a.id, a.automotora_id from public.autos a
where a.automotora_id is not null
on conflict (auto_id) do nothing;

-- Seguridad: nada es público. Solo los usuarios de la automotora dueña del auto.
alter table public.autos_clasificacion enable row level security;

revoke all on public.autos_clasificacion from public, anon;
grant select, insert, update on public.autos_clasificacion to authenticated;

drop policy if exists "automotora gestiona clasificacion" on public.autos_clasificacion;
create policy "automotora gestiona clasificacion" on public.autos_clasificacion
  for all to authenticated
  using (automotora_id = public.mi_automotora())
  with check (
    automotora_id = public.mi_automotora()
    and exists (
      select 1 from public.autos a
      where a.id = auto_id and a.automotora_id = public.mi_automotora()
    )
  );
