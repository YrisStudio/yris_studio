-- Refonte du gestionnaire : commandes et devis.
-- Ajoute la priorité, la date promise, les données du calcul de devis et l'historique de chaque commande.
-- Relançable sans risque.

alter table public.orders add column if not exists priority text not null default 'normale';
alter table public.orders drop constraint if exists orders_priority_check;
alter table public.orders add constraint orders_priority_check check (priority in ('normale', 'urgente'));
alter table public.orders add column if not exists due_date date;
-- Données saisies dans le générateur de devis (grammes, heures, matériau…), pour pouvoir le rouvrir.
alter table public.orders add column if not exists quote_inputs jsonb;

-- Historique d'une commande : changements de statut, notes internes, devis, emails envoyés.
create table if not exists public.order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  kind text not null check (kind in ('creation', 'statut', 'note', 'devis', 'email')),
  body text not null check (char_length(body) between 1 and 4000),
  author_email text,
  created_at timestamptz not null default now()
);
create index if not exists order_events_order_idx on public.order_events (order_id, created_at desc);

alter table public.order_events enable row level security;
grant select, insert, delete on public.order_events to authenticated;

drop policy if exists "order_events: admin" on public.order_events;
create policy "order_events: admin" on public.order_events
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- Droits de modification sur les nouvelles colonnes (la règle RLS « admin modifie » reste la seule à autoriser l'écriture).
grant update (priority, due_date, quote_inputs, material) on public.orders to authenticated;
