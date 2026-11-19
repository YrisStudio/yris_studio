-- Refonte du gestionnaire : SAV (statut « en cours », résolution interne, réimpressions liées).
-- Relançable sans risque.

-- Un signalement peut être nouveau, en cours de traitement ou traité.
alter table public.reports drop constraint if exists reports_status_check;
alter table public.reports add constraint reports_status_check check (status in ('nouveau', 'en cours', 'traité'));

-- Ce qui a été fait pour le client (note interne) et quand.
alter table public.reports add column if not exists resolution text check (char_length(resolution) <= 4000);
alter table public.reports add column if not exists handled_at timestamptz;

-- La table n'autorise la modification que colonne par colonne (la règle RLS « admin traite » limite à l'admin).
grant update (status, resolution, handled_at) on public.reports to authenticated;

-- Réimpression gratuite lancée depuis un signalement.
alter table public.print_jobs add column if not exists report_id uuid references public.reports (id) on delete set null;
create index if not exists print_jobs_report_idx on public.print_jobs (report_id);
