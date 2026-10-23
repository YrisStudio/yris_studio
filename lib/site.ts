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
  price: string;
  material: string;
  text: string;
};

export const products: Product[] = [
  {
    slug: "clips-garnissage",
    name: "Clips de garnissage",
    category: "Auto",
    price: "dès 4 €",
    material: "PETG",
    text: "Clips de remplacement pour panneaux de porte et garnitures. Lot de 10.",
  },
  {
    slug: "support-telephone-grille",
    name: "Support téléphone",
    category: "Auto",
    price: "dès 12 €",
    material: "ASA",
    text: "Se fixe sur la grille d'aération. Résiste à la chaleur de l'habitacle.",
  },
  {
    slug: "cache-crochet-remorquage",
    name: "Cache crochet de remorquage",
    category: "Auto",
    price: "sur devis",
    material: "ASA",
    text: "Reproduit à l'identique d'après votre modèle de véhicule.",
  },
  {
    slug: "bouton-tableau-de-bord",
    name: "Bouton de tableau de bord",
    category: "Auto",
    price: "sur devis",
    material: "ABS",
    text: "Un bouton cassé ou introuvable ? On le remodélise et on l'imprime.",
  },
  {
    slug: "organiseur-tiroir",
    name: "Organiseur de tiroir",
    category: "Maison",
    price: "dès 9 €",
    material: "PLA",
    text: "Modulable, aux dimensions exactes de votre tiroir.",
  },
  {
    slug: "crochets-muraux",
    name: "Crochets muraux",
    category: "Maison",
    price: "dès 6 €",
    material: "PETG",
    text: "Robustes et discrets, lot de 4. Couleur au choix.",
  },
  {
    slug: "support-casque",
    name: "Support de casque",
    category: "Bureau",
    price: "dès 15 €",
    material: "PLA",
    text: "Se fixe sous le bureau, libère de la place.",
  },
  {
    slug: "passe-cables",
    name: "Passe-câbles",
    category: "Bureau",
    price: "dès 5 €",
    material: "PLA",
    text: "Fini les câbles qui tombent derrière le bureau. Lot de 6.",
  },
  {
    slug: "pieces-detachees",
    name: "Pièce de rechange",
    category: "Pratique",
    price: "sur devis",
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
