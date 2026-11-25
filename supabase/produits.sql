-- Boutique : articles gérés depuis le gestionnaire (avant : écrits dans lib/site.ts).

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (length(name) between 2 and 80),
  category text not null check (category in ('Auto', 'Maison', 'Bureau', 'Pratique')),
  -- Prix fixe en centimes, ou null si l'article est sur devis.
  price_cents integer check (price_cents >= 0),
  material text not null default 'PLA',
  -- Phrase courte (cartes de la boutique) et texte long (page de l'article).
  summary text not null default '',
  description text not null default '',
  -- Chemins des photos dans le stockage « produits », la première sert de couverture.
  photos text[] not null default '{}',
  -- Couleurs proposées au client (vide = couleur au choix sur demande).
  colors text[] not null default '{}',
  -- Délai de fabrication annoncé, en jours ouvrés.
  lead_days integer not null default 3 check (lead_days between 0 and 60),
  active boolean not null default true,
  featured boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.products enable row level security;
grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;

drop policy if exists "produits: visibles" on public.products;
create policy "produits: visibles" on public.products
  for select to anon, authenticated using (active or (select public.is_admin()));

drop policy if exists "produits: admin" on public.products;
create policy "produits: admin" on public.products
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- Photos : lecture publique, écriture réservée à l'équipe.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('produits', 'produits', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "produits: photos admin ajoute" on storage.objects;
create policy "produits: photos admin ajoute" on storage.objects
  for insert to authenticated with check (bucket_id = 'produits' and (select public.is_admin()));

drop policy if exists "produits: photos admin supprime" on storage.objects;
create policy "produits: photos admin supprime" on storage.objects
  for delete to authenticated using (bucket_id = 'produits' and (select public.is_admin()));

-- Les 9 articles d'origine.
insert into public.products (slug, name, category, price_cents, material, summary, colors, featured, position) values
  ('clips-garnissage', 'Clips de garnissage', 'Auto', 400, 'PETG', 'Clips de remplacement pour panneaux de porte et garnitures. Lot de 10.', '{Noir,Gris}', false, 1),
  ('support-telephone-grille', 'Support téléphone', 'Auto', 1200, 'PETG', 'Se fixe sur la grille d''aération. Solide et résistant à la chaleur de l''habitacle.', '{Noir,Blanc,Gris}', true, 2),
  ('cache-crochet-remorquage', 'Cache crochet de remorquage', 'Auto', null, 'PETG', 'Reproduit à l''identique d''après votre modèle de véhicule.', '{}', false, 3),
  ('bouton-tableau-de-bord', 'Bouton de tableau de bord', 'Auto', null, 'PETG', 'Un bouton cassé ou introuvable ? On le remodélise et on l''imprime.', '{}', false, 4),
  ('organiseur-tiroir', 'Organiseur de tiroir', 'Maison', 900, 'PLA', 'Modulable, aux dimensions exactes de votre tiroir.', '{Blanc,Noir,Gris,Vert}', true, 5),
  ('crochets-muraux', 'Crochets muraux', 'Maison', 600, 'PETG', 'Robustes et discrets, lot de 4. Couleur au choix.', '{Blanc,Noir,Gris}', false, 6),
  ('support-casque', 'Support de casque', 'Bureau', 1500, 'PLA', 'Se fixe sous le bureau, libère de la place.', '{Noir,Blanc}', true, 7),
  ('passe-cables', 'Passe-câbles', 'Bureau', 500, 'PLA', 'Fini les câbles qui tombent derrière le bureau. Lot de 6.', '{Noir,Blanc}', false, 8),
  ('pieces-detachees', 'Pièce de rechange', 'Pratique', null, 'Selon usage', 'Électroménager, jouet, meuble : on recrée la pièce qui manque.', '{}', false, 9)
on conflict (slug) do nothing;
