-- Refonte du gestionnaire : clients (fiche, étiquettes, clients pros, notes internes).
-- Un client est identifié par son email. Réservé à l'admin. Relançable sans risque.

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(email) and char_length(email) between 3 and 254),
  name text check (char_length(name) <= 120),
  company text check (char_length(company) <= 120),
  phone text check (char_length(phone) <= 40),
  tags text[] not null default '{}',
  is_pro boolean not null default false,
  pro_discount_pct numeric(5, 2) not null default 0 check (pro_discount_pct between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.client_notes (
  id uuid primary key default gen_random_uuid(),
  client_email text not null check (char_length(client_email) between 3 and 254),
  body text not null check (char_length(body) between 1 and 4000),
  author_email text,
  created_at timestamptz not null default now()
);
create index if not exists client_notes_email_idx on public.client_notes (client_email, created_at desc);

alter table public.clients enable row level security;
alter table public.client_notes enable row level security;
grant select, insert, update, delete on public.clients to authenticated;
grant select, insert, delete on public.client_notes to authenticated;

drop policy if exists "clients: admin" on public.clients;
create policy "clients: admin" on public.clients
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists "client_notes: admin" on public.client_notes;
create policy "client_notes: admin" on public.client_notes
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- Comptes clients (inscrits sur le site), pour l'admin uniquement.
create or replace function public.admin_accounts()
returns table (email text, created_at timestamptz, last_sign_in_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select lower(u.email)::text, u.created_at, u.last_sign_in_at
  from auth.users u
  where public.is_admin() and u.email is not null
  order by u.created_at desc
  limit 2000;
$$;
revoke execute on function public.admin_accounts() from public, anon;
grant execute on function public.admin_accounts() to authenticated;
