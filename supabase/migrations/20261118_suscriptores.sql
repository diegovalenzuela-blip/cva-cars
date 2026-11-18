-- Suscriptores a noticias y ofertas (ventana de suscripción de la página).
-- Cualquiera puede suscribirse; solo el admin de la automotora ve y borra la lista.

create table if not exists public.suscriptores (
  id uuid primary key default gen_random_uuid(),
  automotora_id uuid not null references public.automotoras(id) on delete cascade,
  email text not null check (char_length(email) between 5 and 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  telefono text not null check (char_length(telefono) between 8 and 20),
  acepta boolean not null default true check (acepta),
  origen text check (origen is null or char_length(origen) <= 120),
  creado_en timestamptz not null default now(),
  unique (automotora_id, email)
);

alter table public.suscriptores enable row level security;

drop policy if exists "publico se suscribe" on public.suscriptores;
create policy "publico se suscribe" on public.suscriptores
  for insert to anon, authenticated with check (acepta);

drop policy if exists "admin ve suscriptores" on public.suscriptores;
create policy "admin ve suscriptores" on public.suscriptores
  for select to authenticated using (automotora_id = mi_automotora());

drop policy if exists "admin borra suscriptores" on public.suscriptores;
create policy "admin borra suscriptores" on public.suscriptores
  for delete to authenticated using (automotora_id = mi_automotora());
