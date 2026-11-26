-- Paiement en ligne (Stripe) des commandes de la boutique.
-- payment : null = pas de paiement en ligne (devis, sur-mesure),
--           'en attente' = le client est parti payer, 'payée', 'abandonnée' = jamais payée.
alter table public.orders
  add column if not exists payment text check (payment in ('en attente', 'payée', 'abandonnée')),
  add column if not exists paid_at timestamptz,
  add column if not exists stripe_session text;

create index if not exists orders_stripe_session_idx on public.orders (stripe_session);

-- Un visiteur peut créer une commande « en attente » de paiement, jamais une commande déjà payée.
-- Seul le webhook Stripe (côté serveur, clé service) la passe à « payée ».
drop policy if exists "orders: créer les siennes" on public.orders;
create policy "orders: créer les siennes" on public.orders
  for insert to anon, authenticated
  with check (
    status = 'reçue'
    and final_cents is null
    and (user_id is null or user_id = (select auth.uid()))
    and (payment is null or payment = 'en attente')
    and paid_at is null
  );
