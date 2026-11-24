-- Équipe du gestionnaire : prénoms, rôles et invitations. À lancer après admin.sql.
-- Rôles : « gérant » (tout, y compris Paramètres et équipe) et « atelier » (tout sauf Paramètres et équipe).

-- 1. Prénom, email et rôle de chaque membre ------------------------------------
alter table public.admins
  add column if not exists name text,
  add column if not exists email text,
  add column if not exists role text not null default 'gérant' check (role in ('gérant', 'atelier'));

update public.admins a
set email = u.email,
    name = coalesce(a.name, split_part(coalesce(u.raw_user_meta_data ->> 'full_name', u.email), ' ', 1))
from auth.users u
where u.id = a.user_id;

-- Vrai si la personne connectée est gérante.
create or replace function public.is_manager()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = (select auth.uid()) and role = 'gérant');
$$;
revoke execute on function public.is_manager() from public;
grant execute on function public.is_manager() to authenticated;

-- Tous les membres voient l'équipe ; seul un gérant modifie, et jamais sa propre ligne
-- (on ne peut ni se retirer soi-même ni se rétrograder : il reste toujours un gérant).
drop policy if exists "admins: équipe visible" on public.admins;
create policy "admins: équipe visible" on public.admins
  for select to authenticated using ((select public.is_admin()));

grant update (name, role) on public.admins to authenticated;
drop policy if exists "admins: gérant modifie" on public.admins;
create policy "admins: gérant modifie" on public.admins
  for update to authenticated
  using ((select public.is_manager()))
  with check ((select public.is_manager()) and (user_id <> (select auth.uid()) or role = 'gérant'));

grant delete on public.admins to authenticated;
drop policy if exists "admins: gérant retire" on public.admins;
create policy "admins: gérant retire" on public.admins
  for delete to authenticated using ((select public.is_manager()) and user_id <> (select auth.uid()));

-- 2. Invitations : une adresse qui n'a pas encore de compte ----------------------
create table if not exists public.admin_invites (
  email text primary key check (email = lower(email)),
  name text not null,
  role text not null default 'gérant' check (role in ('gérant', 'atelier')),
  created_at timestamptz not null default now()
);
alter table public.admin_invites enable row level security;
grant select, delete on public.admin_invites to authenticated;

drop policy if exists "invitations: gérant" on public.admin_invites;
create policy "invitations: gérant" on public.admin_invites
  for all to authenticated using ((select public.is_manager())) with check ((select public.is_manager()));

-- Ajoute un membre : tout de suite s'il a déjà un compte confirmé, sinon par invitation.
-- Renvoie « ajouté » ou « invité ».
create or replace function public.add_team_member(p_email text, p_name text, p_role text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(trim(p_email));
  v_user uuid;
begin
  if not public.is_manager() then raise exception 'réservé aux gérants'; end if;
  if p_role not in ('gérant', 'atelier') then raise exception 'rôle inconnu'; end if;
  if coalesce(trim(p_name), '') = '' then raise exception 'prénom manquant'; end if;

  select id into v_user from auth.users where lower(email) = v_email and email_confirmed_at is not null;
  if v_user is not null then
    insert into public.admins (user_id, name, email, role) values (v_user, trim(p_name), v_email, p_role)
    on conflict (user_id) do update set name = excluded.name, role = excluded.role;
    delete from public.admin_invites where email = v_email;
    return 'ajouté';
  end if;

  insert into public.admin_invites (email, name, role) values (v_email, trim(p_name), p_role)
  on conflict (email) do update set name = excluded.name, role = excluded.role;
  return 'invité';
end;
$$;
revoke execute on function public.add_team_member(text, text, text) from public;
grant execute on function public.add_team_member(text, text, text) to authenticated;

-- Quand une adresse invitée confirme son compte, elle devient membre de l'équipe.
create or replace function public.claim_admin_invite()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.admin_invites;
begin
  if new.email_confirmed_at is null then return new; end if;
  select * into v from public.admin_invites where email = lower(new.email);
  if found then
    insert into public.admins (user_id, name, email, role) values (new.id, v.name, v.email, v.role)
    on conflict (user_id) do nothing;
    delete from public.admin_invites where email = v.email;
  end if;
  return new;
end;
$$;
revoke execute on function public.claim_admin_invite() from public, anon, authenticated;

drop trigger if exists claim_admin_invite on auth.users;
create trigger claim_admin_invite
  after insert or update of email_confirmed_at on auth.users
  for each row execute function public.claim_admin_invite();

-- 3. Johann, invité comme gérant ---------------------------------------------------
insert into public.admin_invites (email, name, role)
values ('johann.gauthier@yris-studio.com', 'Johann', 'gérant')
on conflict (email) do nothing;
