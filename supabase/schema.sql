-- À coller une fois dans Supabase > SQL Editor > New query, puis « Run ».
-- Crée les tables des commandes et des favoris. Chaque client ne voit que ses propres lignes.

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('commande', 'sur-mesure', 'projet')),
  product_slug text,
  product_name text,
  quantity integer not null default 1 check (quantity between 1 and 1000),
  material text,
  details text,
  files text[] not null default '{}',
  -- Prix estimé en centimes (articles à prix fixe uniquement).
  estimated_cents integer,
  -- reçue → devis envoyé → en impression → terminée (à mettre à jour à la main dans Supabase).
  status text not null default 'reçue',
  created_at timestamptz not null default now()
);

create index if not exists orders_user_created on public.orders (user_id, created_at desc);

create table if not exists public.favorites (
  user_id uuid not null references auth.users (id) on delete cascade,
  product_slug text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, product_slug)
);

-- Les projets Supabase récents ne donnent plus ces droits automatiquement.
grant select, insert on public.orders to authenticated;
grant select, insert, delete on public.favorites to authenticated;

alter table public.orders enable row level security;
alter table public.favorites enable row level security;

drop policy if exists "orders: lire les siennes" on public.orders;
create policy "orders: lire les siennes" on public.orders
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "orders: créer les siennes" on public.orders;
create policy "orders: créer les siennes" on public.orders
  for insert to authenticated with check ((select auth.uid()) = user_id and status = 'reçue');

drop policy if exists "favorites: lire les siens" on public.favorites;
create policy "favorites: lire les siens" on public.favorites
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "favorites: ajouter les siens" on public.favorites;
create policy "favorites: ajouter les siens" on public.favorites
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "favorites: retirer les siens" on public.favorites;
create policy "favorites: retirer les siens" on public.favorites
  for delete to authenticated using ((select auth.uid()) = user_id);
