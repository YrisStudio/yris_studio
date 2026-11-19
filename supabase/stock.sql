-- Refonte du gestionnaire : stock (prix des bobines, mouvements, consommables, bobine utilisée par impression).
-- Réservé à l'admin. Relançable sans risque.

-- Bobines : prix d'achat et marque, pour le coût réel au gramme.
alter table public.filament_stock add column if not exists price_cents integer check (price_cents >= 0);
alter table public.filament_stock add column if not exists brand text check (char_length(brand) <= 40);

-- Chaque entrée ou sortie de filament (impression, raté, recharge, ajustement), pour l'historique et les prévisions.
create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  spool_id uuid not null references public.filament_stock (id) on delete cascade,
  grams numeric(10, 2) not null, -- négatif = consommé, positif = ajouté
  reason text not null check (reason in ('impression', 'raté', 'recharge', 'ajustement')),
  job_id uuid references public.print_jobs (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists stock_movements_spool_idx on public.stock_movements (spool_id, created_at desc);
create index if not exists stock_movements_date_idx on public.stock_movements (created_at desc);

-- Bobine utilisée par une impression (le filament est retiré de celle-ci à la fin).
alter table public.print_jobs add column if not exists spool_id uuid references public.filament_stock (id) on delete set null;

-- Consommables de l'atelier : buses, plaques, colle, emballages…
create table if not exists public.consumables (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  category text not null default 'Atelier' check (category in ('Atelier', 'Emballage', 'Pièces imprimante', 'Autre')),
  quantity numeric(10, 2) not null default 0 check (quantity >= 0),
  unit text not null default 'pièce' check (char_length(unit) between 1 and 20),
  alert_quantity numeric(10, 2) not null default 0 check (alert_quantity >= 0),
  price_cents integer check (price_cents >= 0),
  created_at timestamptz not null default now()
);

alter table public.stock_movements enable row level security;
alter table public.consumables enable row level security;
grant select, insert, delete on public.stock_movements to authenticated;
grant select, insert, update, delete on public.consumables to authenticated;

drop policy if exists "stock_movements: admin" on public.stock_movements;
create policy "stock_movements: admin" on public.stock_movements
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists "consumables: admin" on public.consumables;
create policy "consumables: admin" on public.consumables
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));
