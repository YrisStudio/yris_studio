-- Tableau de bord du gestionnaire : stock de filament, objectif du mois, statistiques.
-- À lancer après admin.sql (Supabase > SQL Editor).

-- 1. Stock de filament (réservé à l'admin) -----------------------------------
create table if not exists public.filament_stock (
  id uuid primary key default gen_random_uuid(),
  material text not null check (material in ('PLA', 'PETG', 'ABS', 'ASA', 'TPU', 'Autre')),
  color text not null check (char_length(color) between 1 and 40),
  color_hex text not null default '#888888' check (color_hex ~ '^#[0-9a-fA-F]{6}$'),
  grams_left integer not null default 1000 check (grams_left >= 0),
  spool_grams integer not null default 1000 check (spool_grams > 0),
  alert_grams integer not null default 200 check (alert_grams >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.filament_stock enable row level security;
grant select, insert, update, delete on public.filament_stock to authenticated;

drop policy if exists "stock: admin" on public.filament_stock;
create policy "stock: admin" on public.filament_stock
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- 2. Réglages du gestionnaire (objectif du mois…) ----------------------------
create table if not exists public.admin_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.admin_settings enable row level security;
grant select, insert, update on public.admin_settings to authenticated;

drop policy if exists "settings: admin" on public.admin_settings;
create policy "settings: admin" on public.admin_settings
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- 3. L'admin peut lire tous les favoris (articles les plus populaires) -------
drop policy if exists "favorites: admin lit tout" on public.favorites;
create policy "favorites: admin lit tout" on public.favorites
  for select to authenticated using ((select public.is_admin()));

-- 4. Inscriptions récentes, pour le fil d'activité (admin uniquement) --------
create or replace function public.admin_recent_signups(lim integer default 10)
returns table (email text, created_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select u.email::text, u.created_at
  from auth.users u
  where public.is_admin()
  order by u.created_at desc
  limit least(greatest(lim, 1), 50);
$$;
revoke execute on function public.admin_recent_signups(integer) from public;
grant execute on function public.admin_recent_signups(integer) to authenticated;
