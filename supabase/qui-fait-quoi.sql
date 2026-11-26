-- Qui fait quoi : une tâche ou une commande peut être confiée à un membre de l'équipe (son prénom).
alter table public.admin_todos
  add column if not exists assigned_to text check (char_length(assigned_to) <= 60),
  add column if not exists due_date date;
alter table public.orders
  add column if not exists assigned_to text check (char_length(assigned_to) <= 60);

-- Fichiers joints aux demandes (STL, 3MF, photos…) : gardés pour l'aperçu 3D du gestionnaire.
-- Privé : seul le serveur (clé secrète) y dépose, seule l'équipe les lit.
insert into storage.buckets (id, name, public, file_size_limit)
values ('demandes', 'demandes', false, 5242880)
on conflict (id) do update set public = false, file_size_limit = 5242880;

drop policy if exists "demandes: équipe lit" on storage.objects;
create policy "demandes: équipe lit" on storage.objects
  for select to authenticated
  using (bucket_id = 'demandes' and (select public.is_admin()));

drop policy if exists "demandes: équipe supprime" on storage.objects;
create policy "demandes: équipe supprime" on storage.objects
  for delete to authenticated
  using (bucket_id = 'demandes' and (select public.is_admin()));
