-- To-do list du gestionnaire (réservée à l'admin), avec une liste de départ.
-- À lancer après admin.sql (Supabase > SQL Editor). Relançable sans doublons.

create table if not exists public.admin_todos (
  id uuid primary key default gen_random_uuid(),
  category text not null check (char_length(category) between 1 and 40),
  title text not null check (char_length(title) between 1 and 200),
  details text check (char_length(details) <= 2000),
  priority smallint not null default 2 check (priority between 1 and 3), -- 1 urgent, 2 normal, 3 plus tard
  done boolean not null default false,
  done_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists admin_todos_category_idx on public.admin_todos (category, done, priority, created_at);

alter table public.admin_todos enable row level security;
grant select, insert, update, delete on public.admin_todos to authenticated;

drop policy if exists "todos: admin" on public.admin_todos;
create policy "todos: admin" on public.admin_todos
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- Liste de départ : seulement si la table est vide.
insert into public.admin_todos (category, priority, title, details)
select * from (values
  -- Réseaux sociaux
  ('Réseaux sociaux', 1, 'Réserver @yris.studio partout', 'Instagram, TikTok, YouTube (Shorts), Pinterest, Facebook. Même pseudo, même photo de profil (le logo YRIS sur fond violet), même bio : « Impression 3D à la demande · Pièces introuvables recréées · Devis gratuit » + lien du site.'),
  ('Réseaux sociaux', 1, 'Passer Instagram et TikTok en compte professionnel', 'Catégorie « Service d''impression 3D ». Ça débloque les statistiques, le bouton « Contacter » et la possibilité de mettre un lien cliquable. Ajouter l''adresse email et la ville.'),
  ('Réseaux sociaux', 1, 'Définir 3 piliers de contenu', '1) Timelapses d''impression (hypnotique, très partagé). 2) Avant / après : la pièce cassée → la pièce recréée. 3) Coulisses : l''atelier, les bobines, les ratés, les colis. Chaque vidéo doit rentrer dans un des trois.'),
  ('Réseaux sociaux', 1, 'Installer une caméra fixe pour les timelapses', 'Un vieux téléphone sur un support imprimé, ou une webcam + OctoPrint / Bambu Studio. Filmer TOUTES les impressions : c''est du contenu gratuit à chaque commande.'),
  ('Réseaux sociaux', 1, 'Lancer la série « Pièce introuvable ? On la recrée »', 'Format récurrent de 20 à 40 s : la pièce cassée → la mesure au pied à coulisse → la modélisation à l''écran → l''impression en accéléré → le montage final. Montrer le résultat dans les 2 premières secondes pour accrocher.'),
  ('Réseaux sociaux', 2, 'Tenir un rythme de publication', 'Minimum 3 Reels / TikTok par semaine (les mêmes vidéos sur les deux), 1 carrousel Instagram par semaine (ex. « PLA vs PETG vs ASA »), des stories presque tous les jours (atelier, colis qui partent, sondages).'),
  ('Réseaux sociaux', 2, 'Préparer les vidéos par lot', 'Le week-end, monter 4 à 6 vidéos d''un coup avec CapCut et les programmer (Meta Business Suite pour Instagram/Facebook, programmation TikTok). Ça évite de devoir y penser chaque jour.'),
  ('Réseaux sociaux', 2, 'Répondre à chaque commentaire dans l''heure', 'Les algorithmes récompensent l''engagement rapide. Transformer les meilleures questions en vidéo « réponse à @… » : ça fait du contenu facile et ça fidélise.'),
  ('Réseaux sociaux', 2, 'Organiser un concours « la pièce la plus improbable »', '« Montre-nous la pièce cassée la plus improbable de ta maison, on la recrée gratuitement. » Conditions : s''abonner, commenter en identifiant 2 amis, partager en story. Durée 10 jours, tirage en live.'),
  ('Réseaux sociaux', 2, 'Créer un compte Pinterest boutique', 'Une épingle par produit de la boutique avec un lien direct vers sa page. Pinterest est un moteur de recherche : les épingles ramènent des visites pendant des mois.'),
  ('Réseaux sociaux', 2, 'Collaborer avec des créateurs locaux', 'Garages, passionnés de voitures anciennes, cosplayeurs, maquettistes, bricoleurs de 5 000 à 50 000 abonnés. Proposer une impression offerte contre une vidéo qui mentionne Yris.'),
  ('Réseaux sociaux', 2, 'Rejoindre les groupes Facebook de niche', 'Groupes de voitures anciennes / youngtimers, réparation et bricolage, cosplay, jeux de société de la région. Aider avec de vraies réponses, montrer des réalisations, sans spammer de liens.'),
  ('Réseaux sociaux', 3, 'Poster les meilleures réparations sur Reddit', 'r/functionalprint, r/3Dprinting, r/france. Les réparations ingénieuses y font souvent des milliers de votes et ramènent des visites.'),
  ('Réseaux sociaux', 3, 'Faire le bilan des statistiques chaque dimanche', 'Noter les 3 vidéos qui ont le mieux marché (vues, partages, enregistrements) et refaire des variantes. Abandonner les formats qui ne prennent pas après 3 essais.'),
  ('Réseaux sociaux', 3, 'Mettre un QR code Instagram dans chaque colis', 'Une petite carte « Montre-nous ta pièce, identifie @yris.studio » : les clients repostent, c''est de la pub gratuite et du contenu à partager.'),

  -- Site web
  ('Site web', 1, 'Créer la fiche Google Business Profile', '« Yris · Impression 3D » avec photos des réalisations, zone desservie, lien du site et numéro. C''est ce qui fait apparaître Yris sur Google Maps quand quelqu''un cherche « impression 3D près de moi ».'),
  ('Site web', 1, 'Demander un avis Google à chaque client content', 'Mettre le lien direct vers les avis dans le message de fin de commande. Objectif : 20 avis 5 étoiles le plus vite possible.'),
  ('Site web', 1, 'Prendre un nom de domaine pro et une adresse email', 'Ex. yris-studio.fr + contact@yris-studio.fr. Le brancher sur Vercel. Ça inspire beaucoup plus confiance qu''une adresse Gmail.'),
  ('Site web', 1, 'Ajouter les pages légales', 'Mentions légales, CGV (délais, retours, pièces personnalisées non remboursables), politique de confidentialité. Obligatoire en France dès qu''on vend.'),
  ('Site web', 2, 'Ajouter une page « Réalisations »', 'Galerie avant / après avec une phrase par projet (« clip de garniture de Peugeot 205, introuvable depuis 2004 »). C''est la meilleure preuve que ça marche.'),
  ('Site web', 2, 'Afficher les avis clients sur l''accueil', 'Trois ou quatre avis avec prénom, ville et photo de la pièce. Juste sous le bouton « Demander un devis ».'),
  ('Site web', 2, 'Brancher Google Search Console', 'Vérifier le domaine, envoyer le sitemap, surveiller les recherches qui amènent des visiteurs. Faire pareil avec Bing Webmaster Tools (5 minutes).'),
  ('Site web', 2, 'Écrire 3 premiers articles de blog', '« Refaire une pièce de voiture introuvable : comment ça marche », « PLA, PETG ou ASA : quel matériau choisir », « Combien coûte une impression 3D ? ». Ce sont des recherches que les gens font vraiment.'),
  ('Site web', 2, 'Mettre en place le paiement en ligne', 'Stripe pour les articles de la boutique (carte, Apple Pay, Google Pay). Pour les devis : un lien de paiement Stripe envoyé avec le devis.'),
  ('Site web', 2, 'Récolter des emails avec une offre de bienvenue', '« -10 % sur votre première commande » en échange de l''email. Envoyer une newsletter par mois avec les nouveautés et les plus belles réalisations.'),
  ('Site web', 3, 'Ajouter une estimation de prix instantanée', 'Le client envoie son fichier STL, choisit le matériau, et voit une fourchette de prix tout de suite. Énorme gain de temps et de conversions.'),
  ('Site web', 3, 'Lancer un programme de parrainage', 'Chaque client reçoit un code : 5 € offerts pour lui et pour l''ami qui commande avec.'),
  ('Site web', 3, 'Tester la vitesse sur mobile', 'PageSpeed Insights sur l''accueil et la boutique. Objectif : plus de 90 sur mobile. Compresser les photos si besoin.'),

  -- Sur le terrain
  ('Sur le terrain', 1, 'Vérifier le statut de l''entreprise', 'Micro-entreprise déclarée (activité de fabrication), compte bancaire dédié, assurance responsabilité civile pro. À régler avant de grossir.'),
  ('Sur le terrain', 1, 'Démarcher 10 garages et carrossiers du coin', 'Clips, caches, boutons, pièces d''intérieur que les constructeurs ne fabriquent plus. Passer en personne avec 2 ou 3 pièces d''exemple et des cartes. Leur proposer un tarif pro.'),
  ('Sur le terrain', 1, 'Faire des cartes de visite qui marquent', 'Une carte imprimée en 3D (PLA, logo en relief) avec un QR code vers le site. Les gens la gardent et la montrent : c''est la démonstration du savoir-faire.'),
  ('Sur le terrain', 2, 'Contacter les clubs de voitures anciennes', 'Clubs de youngtimers, de 2CV, de Golf, de 205… Leur grand problème : les pièces introuvables. Proposer une intervention ou une remise pour les membres.'),
  ('Sur le terrain', 2, 'Tenir un stand avec une imprimante en démo', 'Marché de Noël, brocante, salon geek / manga, fête de la science. Une imprimante qui tourne attire toujours du monde. Prévoir des petits objets à vendre (porte-clés prénom à 5 €).'),
  ('Sur le terrain', 2, 'Proposer un partenariat aux magasins de jeux', 'Boutiques de jeux de société et de figurines : rangements sur mesure pour boîtes de jeux, socles, décors. Dépôt-vente de quelques pièces en boutique.'),
  ('Sur le terrain', 2, 'Se faire connaître des fablabs et repair cafés', 'Ils reçoivent souvent des demandes qu''ils ne peuvent pas traiter : qu''ils pensent à Yris pour les renvoyer.'),
  ('Sur le terrain', 3, 'Proposer des ateliers découverte', 'Écoles, collèges, médiathèques, centres de loisirs : « Découvrir l''impression 3D » en 1 h 30, chaque participant repart avec son objet. Rémunéré et excellent pour la notoriété locale.'),
  ('Sur le terrain', 3, 'Démarcher architectes et agences immobilières', 'Maquettes de maisons et de projets. Peu de concurrence locale et des paniers plus élevés.'),
  ('Sur le terrain', 3, 'Contacter la presse locale', 'Le journal du coin et la radio locale adorent les jeunes entrepreneurs avec une histoire : « il recrée les pièces que plus personne ne fabrique ».'),

  -- Produits et atelier
  ('Produits et atelier', 1, 'Photographier chaque produit proprement', 'Fond uni, lumière du jour ou deux lampes, même angle pour tous. Une belle photo double les ventes en boutique.'),
  ('Produits et atelier', 1, 'Afficher et tenir un délai court', 'Viser l''expédition sous 72 h pour les articles de la boutique, et l''écrire sur le site. La rapidité est un vrai argument face aux gros sites.'),
  ('Produits et atelier', 2, 'Créer 3 produits signature Yris', 'Des objets qu''on associe à Yris : porte-clés prénom personnalisé, support téléphone voiture sur mesure, lampe lithophanie à partir d''une photo.'),
  ('Produits et atelier', 2, 'Lancer les lithophanies personnalisées', 'Une photo du client imprimée en relief qui apparaît à la lumière. Cadeau parfait (fête des mères, Noël, Saint-Valentin) et vidéos très partagées.'),
  ('Produits et atelier', 2, 'Soigner le packaging', 'Boîte propre, papier de soie violet, autocollant YRIS, petit mot écrit à la main. L''unboxing donne envie aux clients de filmer et de partager.'),
  ('Produits et atelier', 2, 'Préparer les collections saisonnières à l''avance', 'Halloween, Noël, fête des mères, fête des pères : sortir les modèles 4 à 6 semaines avant, le temps que les publications et les épingles prennent.'),
  ('Produits et atelier', 3, 'Prévoir une deuxième imprimante', 'Dès que la file d''attente dépasse une semaine. Idéalement une multicolore (type AMS) pour les objets décoratifs.'),

  -- Business
  ('Business', 1, 'Calculer le vrai coût de chaque pièce', 'Filament + électricité + usure de la machine + temps de préparation et de finition. Fixer un prix minimum par heure d''impression pour ne jamais vendre à perte.'),
  ('Business', 2, 'Fixer un objectif chaque mois', 'Dans le tableau de bord : objectif de chiffre d''affaires du mois. Commencer petit (300 €) et augmenter de 20 % par mois.'),
  ('Business', 2, 'Vendre aussi sur Etsy et Leboncoin', 'Etsy pour les objets personnalisés et les lithophanies (clientèle cadeau), Leboncoin pour les pièces de rechange auto et maison en local.'),
  ('Business', 3, 'Créer une offre pour les pros', 'Petites séries pour artisans, restaurants, boutiques : présentoirs, supports, pièces techniques. Tarif dégressif à partir de 10 pièces.')
) as seed(category, priority, title, details)
where not exists (select 1 from public.admin_todos);
