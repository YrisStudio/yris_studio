-- Phases 1 et 2 de la refonte : photos des pièces, journal, projets, bibliothèque 3D,
-- dépenses, codes promo, parrainage, collections, stock de pièces finies, expédition, récurrences.

-- ── Commandes ──────────────────────────────────────────────────────────────
alter table public.orders
  add column if not exists photos text[] not null default '{}',      -- photos de la pièce finie (bucket realisations)
  add column if not exists items jsonb,                                -- articles d'un panier : [{slug, name, color, qty, unit_cents}]
  add column if not exists promo_code text,
  add column if not exists discount_cents integer,
  add column if not exists refunded_cents integer not null default 0,
  add column if not exists carrier text,
  add column if not exists tracking_number text,
  add column if not exists shipped_at timestamptz;

-- Le site ne peut pas créer une commande déjà remboursée ou expédiée.
drop policy if exists "orders: créer les siennes" on public.orders;
create policy "orders: créer les siennes" on public.orders
  for insert to anon, authenticated
  with check (
    status = 'reçue'
    and final_cents is null
    and (user_id is null or user_id = (select auth.uid()))
    and (payment is null or payment = 'en attente')
    and paid_at is null
    and refunded_cents = 0
    and tracking_number is null
    and photos = '{}'
  );

-- ── Numéros de facture : aussi depuis le webhook Stripe (clé secrète) ───────
create or replace function public.issue_document(p_order uuid, p_kind text)
returns text language plpgsql security definer set search_path to '' as $$
declare
  v_year integer := extract(year from now())::integer;
  v_existing text;
  v_n integer;
  v_number text;
begin
  if not (public.is_admin() or coalesce((select auth.role()), '') = 'service_role') then
    raise exception 'Accès refusé';
  end if;
  if p_kind not in ('devis', 'facture') then
    raise exception 'Type de document inconnu';
  end if;
  select case when p_kind = 'facture' then invoice_number else quote_number end
    into v_existing from public.orders where id = p_order for update;
  if not found then raise exception 'Commande introuvable'; end if;
  if v_existing is not null then return v_existing; end if;
  insert into public.document_counters (kind, year, last) values (p_kind, v_year, 1)
  on conflict (kind, year) do update set last = public.document_counters.last + 1
  returning last into v_n;
  v_number := (case when p_kind = 'facture' then 'F' else 'D' end) || '-' || v_year || '-' || lpad(v_n::text, 4, '0');
  if p_kind = 'facture' then
    update public.orders set invoice_number = v_number, invoice_date = current_date where id = p_order;
  else
    update public.orders set quote_number = v_number, quote_date = current_date where id = p_order;
  end if;
  return v_number;
end $$;
grant execute on function public.issue_document(uuid, text) to authenticated, service_role;

-- ── Journal d'activité ─────────────────────────────────────────────────────
create table if not exists public.admin_activity (
  id uuid primary key default gen_random_uuid(),
  actor text,
  action text not null check (char_length(action) <= 300),
  target text check (char_length(target) <= 200),
  link text check (char_length(link) <= 300),
  created_at timestamptz not null default now()
);
create index if not exists admin_activity_created_idx on public.admin_activity (created_at desc);

-- ── Projets (Kanban) ───────────────────────────────────────────────────────
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 200),
  description text check (char_length(description) <= 4000),
  status text not null default 'idée' check (status in ('idée', 'en cours', 'terminé')),
  assigned_to text check (char_length(assigned_to) <= 60),
  due_date date,
  steps jsonb not null default '[]',
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

-- ── Bibliothèque de modèles 3D ─────────────────────────────────────────────
create table if not exists public.models3d (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  file_path text,
  file_size integer,
  photo_path text,
  material text,
  print_minutes integer,
  grams numeric(8, 1),
  product_slug text,
  notes text check (char_length(notes) <= 4000),
  created_at timestamptz not null default now()
);

-- ── Dépenses (registre des achats) ─────────────────────────────────────────
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  spent_on date not null default current_date,
  label text not null check (char_length(label) between 1 and 200),
  category text not null default 'Matériel' check (char_length(category) <= 40),
  amount_cents integer not null check (amount_cents >= 0),
  supplier text check (char_length(supplier) <= 120),
  receipt_path text,
  order_id uuid references public.orders (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists expenses_spent_idx on public.expenses (spent_on desc);

-- ── Codes promo et parrainage ──────────────────────────────────────────────
create table if not exists public.promo_codes (
  code text primary key check (code = upper(code) and char_length(code) between 3 and 30),
  kind text not null default 'pourcent' check (kind in ('pourcent', 'montant')),
  value integer not null check (value > 0),               -- % ou centimes
  min_cents integer not null default 0,
  max_uses integer,
  uses integer not null default 0,
  expires_on date,
  active boolean not null default true,
  owner_email text,          -- parrainage : le client à qui appartient ce code
  reward_for text,           -- récompense de parrainage : code du filleul qui l'a déclenchée
  note text,
  created_at timestamptz not null default now()
);

-- Vérifie un code pour un panier, sans rien révéler d'autre. Appelée par le site (visiteur).
create or replace function public.promo_discount(p_code text, p_subtotal integer, p_email text default null)
returns table (code text, discount_cents integer, label text)
language plpgsql security definer set search_path to '' stable as $$
declare r public.promo_codes;
begin
  select * into r from public.promo_codes c where c.code = upper(trim(p_code));
  if not found or not r.active or (r.expires_on is not null and r.expires_on < current_date)
     or (r.max_uses is not null and r.uses >= r.max_uses) or p_subtotal < r.min_cents
     or (r.owner_email is not null and lower(r.owner_email) = lower(coalesce(p_email, ''))) then
    return;
  end if;
  code := r.code;
  discount_cents := least(p_subtotal, case when r.kind = 'pourcent' then (p_subtotal * r.value) / 100 else r.value end);
  label := case when r.kind = 'pourcent' then r.value || ' %' else to_char(r.value / 100.0, 'FM999990D00') || ' €' end;
  return next;
end $$;
grant execute on function public.promo_discount(text, integer, text) to anon, authenticated;

-- ── Collections et stock de pièces finies ──────────────────────────────────
create table if not exists public.collections (
  slug text primary key check (slug ~ '^[a-z0-9-]{2,60}$'),
  name text not null check (char_length(name) between 1 and 80),
  description text check (char_length(description) <= 500),
  position integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.products
  add column if not exists collections text[] not null default '{}',
  add column if not exists stock_qty integer not null default 0 check (stock_qty >= 0);

-- ── Commandes récurrentes (clients pros) ───────────────────────────────────
create table if not exists public.recurring_orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text,
  customer_email text not null,
  customer_company text,
  title text not null check (char_length(title) between 1 and 200),
  lines jsonb not null default '[]',
  every_months integer not null default 1 check (every_months between 1 and 12),
  next_on date not null default current_date,
  active boolean not null default true,
  notes text check (char_length(notes) <= 2000),
  created_at timestamptz not null default now()
);

-- ── Droits ─────────────────────────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['admin_activity', 'projects', 'models3d', 'expenses', 'promo_codes', 'collections', 'recurring_orders'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('drop policy if exists "%s: équipe" on public.%I', t, t);
    execute format('create policy "%s: équipe" on public.%I for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()))', t, t);
  end loop;
end $$;

-- Les collections s'affichent sur la boutique.
grant select on public.collections to anon;
drop policy if exists "collections: visibles" on public.collections;
create policy "collections: visibles" on public.collections for select to anon, authenticated using (true);

-- Le webhook Stripe et le serveur (clé secrète) : compteur des codes, stock, parrainage.
grant select, insert, update on public.promo_codes to service_role;
grant select, update on public.products to service_role;
grant insert on public.admin_activity to service_role;

-- ── Stockage ───────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('realisations', 'realisations', true, 8388608, array['image/jpeg', 'image/png', 'image/webp']),
  ('modeles', 'modeles', false, 52428800, null),
  ('tickets', 'tickets', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;

drop policy if exists "realisations: équipe" on storage.objects;
create policy "realisations: équipe" on storage.objects for all to authenticated
  using (bucket_id = 'realisations' and (select public.is_admin()))
  with check (bucket_id = 'realisations' and (select public.is_admin()));
drop policy if exists "modeles: équipe" on storage.objects;
create policy "modeles: équipe" on storage.objects for all to authenticated
  using (bucket_id = 'modeles' and (select public.is_admin()))
  with check (bucket_id = 'modeles' and (select public.is_admin()));
drop policy if exists "tickets: équipe" on storage.objects;
create policy "tickets: équipe" on storage.objects for all to authenticated
  using (bucket_id = 'tickets' and (select public.is_admin()))
  with check (bucket_id = 'tickets' and (select public.is_admin()));

-- ── Double authentification ────────────────────────────────────────────────
-- Un membre qui l'a activée n'a ses droits qu'après avoir saisi son code (session aal2).
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path to '' as $$
  select exists (select 1 from public.admins where user_id = (select auth.uid()))
    and (
      coalesce((select auth.jwt() ->> 'aal'), 'aal1') = 'aal2'
      or not exists (select 1 from auth.mfa_factors f where f.user_id = (select auth.uid()) and f.status = 'verified')
    );
$$;
