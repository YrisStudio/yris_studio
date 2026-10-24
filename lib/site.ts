// Tout le contenu éditorial du site est centralisé ici.

export const site = {
  name: "Yris",
  tagline: "Impression 3D à la demande",
  url: "https://yris-studio.vercel.app",
  description:
    "Yris imprime en 3D les pièces dont vous avez besoin : pièces auto, objets du quotidien, prototypes. Commandez, demandez un devis ou proposez votre projet.",
  email: "hello@yrisstudio.com",
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

export type Product = {
  slug: string;
  name: string;
  category: Category;
  // Prix fixe en centimes, ou null si la pièce est sur devis.
  priceCents: number | null;
  material: string;
  text: string;
};

export const products: Product[] = [
  {
    slug: "clips-garnissage",
    name: "Clips de garnissage",
    category: "Auto",
    priceCents: 400,
    material: "PETG",
    text: "Clips de remplacement pour panneaux de porte et garnitures. Lot de 10.",
  },
  {
    slug: "support-telephone-grille",
    name: "Support téléphone",
    category: "Auto",
    priceCents: 1200,
    material: "ASA",
    text: "Se fixe sur la grille d'aération. Résiste à la chaleur de l'habitacle.",
  },
  {
    slug: "cache-crochet-remorquage",
    name: "Cache crochet de remorquage",
    category: "Auto",
    priceCents: null,
    material: "ASA",
    text: "Reproduit à l'identique d'après votre modèle de véhicule.",
  },
  {
    slug: "bouton-tableau-de-bord",
    name: "Bouton de tableau de bord",
    category: "Auto",
    priceCents: null,
    material: "ABS",
    text: "Un bouton cassé ou introuvable ? On le remodélise et on l'imprime.",
  },
  {
    slug: "organiseur-tiroir",
    name: "Organiseur de tiroir",
    category: "Maison",
    priceCents: 900,
    material: "PLA",
    text: "Modulable, aux dimensions exactes de votre tiroir.",
  },
  {
    slug: "crochets-muraux",
    name: "Crochets muraux",
    category: "Maison",
    priceCents: 600,
    material: "PETG",
    text: "Robustes et discrets, lot de 4. Couleur au choix.",
  },
  {
    slug: "support-casque",
    name: "Support de casque",
    category: "Bureau",
    priceCents: 1500,
    material: "PLA",
    text: "Se fixe sous le bureau, libère de la place.",
  },
  {
    slug: "passe-cables",
    name: "Passe-câbles",
    category: "Bureau",
    priceCents: 500,
    material: "PLA",
    text: "Fini les câbles qui tombent derrière le bureau. Lot de 6.",
  },
  {
    slug: "pieces-detachees",
    name: "Pièce de rechange",
    category: "Pratique",
    priceCents: null,
    material: "Selon usage",
    text: "Électroménager, jouet, meuble : on recrée la pièce qui manque.",
  },
];

export const materials = [
  { name: "PLA", use: "Objets du quotidien, déco, prototypes", heat: "jusqu'à 55 °C" },
  { name: "PETG", use: "Pièces solides, usage extérieur léger", heat: "jusqu'à 75 °C" },
  { name: "ABS", use: "Pièces techniques, intérieur auto", heat: "jusqu'à 95 °C" },
  { name: "ASA", use: "Pièces auto exposées au soleil", heat: "jusqu'à 95 °C, anti-UV" },
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
    a: "Oui, pour l'intérieur d'une voiture on utilise de l'ABS ou de l'ASA, qui supportent bien plus de chaleur que le PLA.",
  },
  {
    q: "Comment se passe le paiement ?",
    a: "Une fois le devis validé, on vous envoie les modalités de paiement par email avant de lancer l'impression.",
  },
];

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
