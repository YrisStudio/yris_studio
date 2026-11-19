// Libellés et couleurs des commandes, partagés entre le serveur et le navigateur.
import type { OrderStatus } from "@/lib/site";

export const boardStatuses = ["reçue", "devis envoyé", "en impression", "terminée"] as const satisfies readonly OrderStatus[];

export const statusMeta: Record<OrderStatus, { label: string; dot: string; pill: string }> = {
  reçue: { label: "Reçue", dot: "bg-fg/50", pill: "bg-fg/10 text-fg" },
  "devis envoyé": { label: "Devis envoyé", dot: "bg-sky-400", pill: "bg-sky-400/15 text-sky-300" },
  "en impression": { label: "En impression", dot: "bg-amber-400", pill: "bg-amber-400/15 text-amber-300" },
  terminée: { label: "Terminée", dot: "bg-accent", pill: "bg-accent/15 text-accent" },
  annulée: { label: "Annulée", dot: "bg-red-400", pill: "bg-red-400/15 text-red-300" },
};

export const kindLabel: Record<string, string> = {
  commande: "Boutique",
  "sur-mesure": "Sur mesure",
  projet: "Projet",
};

export const eventLabel: Record<string, string> = {
  creation: "Demande reçue",
  statut: "Statut",
  note: "Note",
  devis: "Devis",
  email: "Email",
};
