-- Espace administrateur et signalements. À lancer après schema.sql (Supabase > SQL Editor).

-- 1. Administrateurs ----------------------------------------------------------
create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;
grant select on public.admins to authenticated;

drop policy if exists "admins: se voir" on public.admins;
create policy "admins: se voir" on public.admins
  for select to authenticated using ((select auth.uid()) = user_id);

-- Vrai si la personne connectée est administratrice. Utilisée par les règles d'accès.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = (select auth.uid()));
$$;
revoke execute on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- 2. Commandes : coordonnées complètes, prix final, demandes sans compte -----
alter table public.orders
  alter column user_id drop not null,
  add column if not exists customer_name text,
  add column if not exists customer_email text,
  add column if not exists phone text,
  add column if not exists delivery text check (delivery in ('livraison', 'retrait')),
  add column if not exists address text,
  add column if not exists postal_code text,
  add column if not exists city text,
  -- Prix final fixé par l'admin, en centimes. Sert au chiffre d'affaires.
  add column if not exists final_cents integer check (final_cents >= 0),
  add column if not exists admin_note text,
  add column if not exists updated_at timestamptz;

grant insert on public.orders to anon;
grant update (status, final_cents, admin_note, updated_at) on public.orders to authenticated;

-- Un visiteur sans compte peut envoyer une demande (sans user_id), un client connecté avec le sien.
drop policy if exists "orders: créer les siennes" on public.orders;
create policy "orders: créer les siennes" on public.orders
  for insert to anon, authenticated
  with check (
    status = 'reçue' and final_cents is null
    and (user_id is null or user_id = (select auth.uid()))
  );

drop policy if exists "orders: admin lit tout" on public.orders;
create policy "orders: admin lit tout" on public.orders
  for select to authenticated using ((select public.is_admin()));

drop policy if exists "orders: admin modifie" on public.orders;
create policy "orders: admin modifie" on public.orders
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- 3. Signalements de problèmes ----------------------------------------------
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  name text not null,
  email text not null,
  category text not null check (category in ('commande', 'site', 'compte', 'autre')),
  order_ref text,
  message text not null check (char_length(message) between 10 and 5000),
  status text not null default 'nouveau' check (status in ('nouveau', 'traité')),
  created_at timestamptz not null default now()
);
create index if not exists reports_created on public.reports (created_at desc);

alter table public.reports enable row level security;
grant insert on public.reports to anon, authenticated;
grant select on public.reports to authenticated;
grant update (status) on public.reports to authenticated;

drop policy if exists "reports: envoyer" on public.reports;
create policy "reports: envoyer" on public.reports
  for insert to anon, authenticated
  with check (status = 'nouveau' and (user_id is null or user_id = (select auth.uid())));

drop policy if exists "reports: admin lit" on public.reports;
create policy "reports: admin lit" on public.reports
  for select to authenticated using ((select public.is_admin()));

drop policy if exists "reports: admin traite" on public.reports;
create policy "reports: admin traite" on public.reports
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- 4. Le compte du propriétaire du site devient administrateur ----------------
insert into public.admins (user_id)
values ('ffc53bed-e2b3-48bf-994a-92cfab7394d2')
on conflict do nothing;
