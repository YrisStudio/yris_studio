// Constantes et types partagés (aussi utilisés côté navigateur : pas d'import serveur ici).
export const todoCategories = ["Réseaux sociaux", "Site web", "Sur le terrain", "Produits et atelier", "Business", "Autre"] as const;

export const priorities = [
  { value: 1, label: "Urgent" },
  { value: 2, label: "Normal" },
  { value: 3, label: "Plus tard" },
] as const;

export type Todo = {
  id: string;
  category: string;
  title: string;
  details: string | null;
  priority: 1 | 2 | 3;
  done: boolean;
  done_at: string | null;
  created_at: string;
};
