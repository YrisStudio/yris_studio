-- Refonte du gestionnaire : atelier (imprimantes, file d'impression, ratés, maintenance).
-- Réservé à l'admin. Relançable sans risque.

-- Imprimantes de l'atelier.
create table if not exists public.printers (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 40),
  model text not null default 'Bambu Lab' check (char_length(model) between 1 and 60),
  status text not null default 'active' check (status in ('active', 'maintenance', 'hors service')),
  hours_total numeric(10, 2) not null default 0 check (hours_total >= 0),
  hours_at_maintenance numeric(10, 2) not null default 0 check (hours_at_maintenance >= 0),
  maintenance_every_hours integer not null default 200 check (maintenance_every_hours between 10 and 10000),
  last_maintenance_at timestamptz,
  notes text check (char_length(notes) <= 2000),
  created_at timestamptz not null default now()
);

-- Impressions : la file d'attente, ce qui tourne, ce qui est fini ou raté.
create table if not exists public.print_jobs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders (id) on delete set null,
  printer_id uuid references public.printers (id) on delete set null,
  title text not null check (char_length(title) between 1 and 120),
  material text,
  grams numeric(10, 2) not null default 0 check (grams >= 0),
  hours numeric(10, 2) not null default 0 check (hours >= 0),
  quantity integer not null default 1 check (quantity between 1 and 1000),
  status text not null default 'à faire' check (status in ('à faire', 'en cours', 'terminé', 'raté')),
  position integer not null default 0,
  started_at timestamptz,
  finished_at timestamptz,
  failure_reason text check (char_length(failure_reason) <= 500),
  grams_lost numeric(10, 2) check (grams_lost >= 0),
  created_at timestamptz not null default now()
);
create index if not exists print_jobs_queue_idx on public.print_jobs (status, printer_id, position);
create index if not exists print_jobs_order_idx on public.print_jobs (order_id);

alter table public.printers enable row level security;
alter table public.print_jobs enable row level security;
grant select, insert, update, delete on public.printers to authenticated;
grant select, insert, update, delete on public.print_jobs to authenticated;

drop policy if exists "printers: admin" on public.printers;
create policy "printers: admin" on public.printers
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists "print_jobs: admin" on public.print_jobs;
create policy "print_jobs: admin" on public.print_jobs
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));
