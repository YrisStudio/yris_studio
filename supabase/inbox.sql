-- Boîte de réception du gestionnaire (réservée à l'admin).
-- Les mails envoyés à contact@yris-studio.com (groupe Google) sont copiés vers une adresse
-- @in.yris-studio.com reçue par Resend, puis rangés ici quand on ouvre la boîte de réception.
-- Les réponses envoyées depuis le gestionnaire sont aussi enregistrées ici (direction « out »).
-- À lancer après admin.sql (Supabase > SQL Editor). Relançable.

create table if not exists public.inbox_messages (
  id uuid primary key default gen_random_uuid(),
  resend_id text unique,                                  -- id Resend (mails reçus ou envoyés)
  direction text not null default 'in' check (direction in ('in', 'out')),
  thread_key text not null check (char_length(thread_key) between 1 and 400), -- conversation : contact + sujet
  contact_email text not null check (char_length(contact_email) between 3 and 320), -- le client (expéditeur ou destinataire)
  contact_name text check (char_length(contact_name) <= 200),
  subject text not null default '' check (char_length(subject) <= 500),
  text_body text check (char_length(text_body) <= 200000),
  html_body text check (char_length(html_body) <= 1000000),
  attachments jsonb not null default '[]'::jsonb,         -- [{ id, filename, content_type, size }]
  message_id text,                                        -- en-tête Message-ID (pour relier les réponses)
  status text not null default 'nouveau' check (status in ('nouveau', 'en cours', 'traité')),
  assigned_to text check (char_length(assigned_to) <= 320),
  author_email text check (char_length(author_email) <= 320), -- admin qui a répondu (direction « out »)
  received_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists inbox_messages_thread_idx on public.inbox_messages (thread_key, received_at);
create index if not exists inbox_messages_recent_idx on public.inbox_messages (received_at desc);
create index if not exists inbox_messages_contact_idx on public.inbox_messages (contact_email);

alter table public.inbox_messages enable row level security;
grant select, insert, update on public.inbox_messages to authenticated;

drop policy if exists "inbox: admin" on public.inbox_messages;
create policy "inbox: admin" on public.inbox_messages
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));
