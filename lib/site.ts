// Tout le contenu éditorial du site est centralisé ici.

export const site = {
  name: "Yris Studio",
  url: "https://yris-studio.vercel.app",
  description:
    "Yris Studio conçoit et développe des sites web sur mesure, soignés et rapides, pour les marques et indépendants ambitieux.",
  email: "hello@yrisstudio.com",
  x: { handle: "@yris_studio", url: "https://x.com/yris_studio" },
};

export const nav = [
  { href: "/projets", label: "Projets" },
  { href: "/tarifs", label: "Tarifs" },
  { href: "/contact", label: "Contact" },
];

export type Tint = "lavender" | "mint" | "butter" | "peach";

export const tints: Record<Tint, { bg: string; ink: string }> = {
  lavender: { bg: "var(--color-lavender)", ink: "var(--color-lavender-ink)" },
  mint: { bg: "var(--color-mint)", ink: "var(--color-mint-ink)" },
  butter: { bg: "var(--color-butter)", ink: "var(--color-butter-ink)" },
  peach: { bg: "var(--color-peach)", ink: "var(--color-peach-ink)" },
};

export const steps: { title: string; text: string; tint: Tint }[] = [
  {
    title: "Plusieurs pistes",
    text: "On imagine plusieurs maquettes dans des styles bien différents, pour vous donner un vrai choix créatif.",
    tint: "lavender",
  },
  {
    title: "Vous choisissez",
    text: "Vous retenez la direction qui vous parle et vous nous dites ce qu'il faut garder, ajuster ou repenser.",
    tint: "peach",
  },
  {
    title: "On affine ensemble",
    text: "On peaufine chaque détail avec vous jusqu'à ce que le design soit exactement juste. Sans compromis.",
    tint: "butter",
  },
  {
    title: "On développe et on lance",
    text: "On transforme la maquette validée en un site rapide et propre, puis on le met en ligne.",
    tint: "mint",
  },
];

export const projects: {
  name: string;
  category: string;
  tint: Tint;
  url?: string;
}[] = [
  { name: "Luxe Interiors", category: "Studio d'architecture intérieure", tint: "butter" },
  { name: "Volt Finance", category: "Startup fintech", tint: "mint" },
  { name: "Nova Agency", category: "Agence créative", tint: "lavender" },
  { name: "Bloom Market", category: "E-commerce", tint: "peach" },
];

export type Plan = {
  name: string;
  price: string;
  pitch: string;
  featured?: boolean;
  features: string[];
};

export const plans: Plan[] = [
  {
    name: "Essentiel",
    price: "79,99 €",
    pitch: "Pour lancer une présence en ligne soignée.",
    features: [
      "Jusqu'à 5 pages",
      "Design sur mesure",
      "Adapté au mobile",
      "Référencement (SEO) de base",
      "Suivi pendant 3 mois",
    ],
  },
  {
    name: "Premium",
    price: "129,99 €",
    pitch: "Pour un site vivant, avec du contenu à gérer.",
    featured: true,
    features: [
      "Jusqu'à 10 pages",
      "Tout le pack Essentiel",
      "Back-end (formulaires, contenus)",
      "Animations avancées",
    ],
  },
  {
    name: "Max",
    price: "249,99 €",
    pitch: "Pour un vrai produit web, sans limite.",
    features: [
      "Pages illimitées",
      "Tout le pack Premium",
      "Espace utilisateurs",
      "Tableau de bord d'administration",
    ],
  },
];

export const faq: { q: string; a: string }[] = [
  {
    q: "Combien de temps faut-il pour créer mon site ?",
    a: "Comptez en général deux à quatre semaines entre le premier échange et la mise en ligne, selon la formule et la rapidité des retours.",
  },
  {
    q: "Le prix est-il payé en une fois ?",
    a: "Le tarif indiqué correspond au projet complet. On en discute ensemble avant de démarrer, sans surprise.",
  },
  {
    q: "Puis-je modifier mon site moi-même ensuite ?",
    a: "Oui, à partir de la formule Premium vous pouvez gérer vos contenus. Et pendant le suivi, on reste disponibles pour vous aider.",
  },
  {
    q: "Que se passe-t-il après les 3 mois de suivi ?",
    a: "Votre site reste à vous. Si vous souhaitez continuer à être accompagné, on vous propose une formule de maintenance.",
  },
];
