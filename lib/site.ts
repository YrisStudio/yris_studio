// Tout le contenu éditorial du site est centralisé ici.

export const site = {
  name: "Yris",
  tagline: "Impression 3D à la demande",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.yris-studio.com",
  description:
    "Yris imprime en 3D les pièces dont vous avez besoin : pièces auto, objets du quotidien, prototypes. Commandez, demandez un devis ou proposez votre projet.",
  email: "contact@yris-studio.com",
};

export const nav = [
  { href: "/boutique", label: "Boutique" },
  { href: "/#fonctionnement", label: "Fonctionnement" },
  { href: "/#materiaux", label: "Matériaux" },
];

// Les trois façons de travailler avec nous. L'id sert aussi de paramètre ?type= sur /demande.
export const requestTypes = [
  {
    id: "commande",
    label: "Commander",
    title: "Commander un article",
    text: "Choisissez une pièce dans la boutique, on l'imprime pour vous.",
  },
  {
    id: "sur-mesure",
    label: "Sur mesure",
    title: "Demander une pièce",
    text: "Envoyez un fichier 3D, une photo ou une description : on vous fait un devis.",
  },
  {
    id: "projet",
    label: "Proposer",
    title: "Proposer un projet",
    text: "Une idée, un prototype, une petite série ? Parlons-en.",
  },
] as const;

export type RequestType = (typeof requestTypes)[number]["id"];

// Les fonctions Vercel refusent les requêtes de plus de 4,5 Mo.
export const MAX_FILES_BYTES = 4 * 1024 * 1024;

export type Category = "Auto" | "Maison" | "Bureau" | "Pratique";

export const categories: Category[] = ["Auto", "Maison", "Bureau", "Pratique"];
export const categoryLabel = (c: Category) => (c === "Pratique" ? "Pièces de rechange" : c);

// Article de la boutique (table products, géré dans Gestionnaire → Produits ; voir lib/products.ts).
export type Product = {
  id: string;
  slug: string;
  name: string;
  category: Category;
  // Prix fixe en centimes, ou null si la pièce est sur devis.
  priceCents: number | null;
  material: string;
  // Phrase courte (cartes) ; la description longue est sur la page de l'article.
  text: string;
  description: string;
  // Adresses publiques des photos, la première sert de couverture.
  photos: string[];
  colors: string[];
  leadDays: number;
  active: boolean;
  featured: boolean;
  position: number;
};

export const materials = [
  { name: "PLA", use: "Objets du quotidien, déco, prototypes", heat: "jusqu'à 55 °C" },
  { name: "PETG", use: "Pièces solides, intérieur auto, usage extérieur", heat: "jusqu'à 75 °C" },
];

export const steps = [
  { title: "Vous envoyez", text: "Un article de la boutique, un fichier 3D, une photo ou juste une description." },
  { title: "On vous répond", text: "Prix, matériau et délai sous 48 heures. Vous validez, ou on ajuste." },
  { title: "On imprime", text: "Votre pièce est imprimée, vérifiée, puis expédiée ou remise en main propre." },
];

export const faq = [
  {
    q: "Quels fichiers puis-je envoyer ?",
    a: "Les formats STL, 3MF, OBJ et STEP sont les plus pratiques. Pas de fichier ? Une photo avec des mesures suffit souvent pour commencer.",
  },
  {
    q: "Comment est calculé le prix ?",
    a: "Selon la taille de la pièce, la quantité de matière, le matériau et le temps d'impression. Le devis est gratuit et sans engagement.",
  },
  {
    q: "Les pièces auto résistent-elles à la chaleur ?",
    a: "Pour l'intérieur d'une voiture, on utilise du PETG : il tient jusqu'à 75 °C, bien plus que le PLA. Pour une pièce posée en plein soleil sur le tableau de bord, on en parle ensemble avant de l'imprimer.",
  },
  {
    q: "Comment se passe le paiement ?",
    a: "Les articles de la boutique se paient en ligne par carte bancaire, Apple Pay ou Google Pay, au moment de la commande. Pour une pièce sur mesure, on vous envoie le lien de paiement une fois le devis validé, avant de lancer l'impression.",
  },
];

// Livraison forfaitaire des commandes de la boutique (retrait en main propre gratuit).
export const SHOP_SHIPPING_CENTS = 690;

export function formatPrice(cents: number | null) {
  if (cents === null) return "Sur devis";
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(cents / 100);
}

// Statuts d'une commande, dans l'ordre du suivi. « annulée » est à part.
export const orderStatuses = ["reçue", "devis envoyé", "en impression", "terminée", "annulée"] as const;
export type OrderStatus = (typeof orderStatuses)[number];

// Référence courte d'une commande, à communiquer au client (#A1B2C3D4).
export const orderRef = (id: string) => `#${id.slice(0, 8).toUpperCase()}`;

export const reportCategories = [
  { id: "commande", label: "Une commande" },
  { id: "site", label: "Le site" },
  { id: "compte", label: "Mon compte" },
  { id: "autre", label: "Autre chose" },
] as const;

// Matériaux possibles pour une bobine de filament (stock du gestionnaire).
export const filamentMaterials = ["PLA", "PETG", "ABS", "ASA", "TPU", "Autre"] as const;
