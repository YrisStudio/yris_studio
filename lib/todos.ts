// Constantes et types partagés (aussi utilisés côté navigateur : pas d'import serveur ici).
// Les phases de la refonte (reprises de Notion), plus « Autre » pour le reste.
export const todoCategories = ["1 · Socle", "2 · Argent", "3 · Communication", "4 · Réseaux", "5 · Bonus", "Autre"] as const;

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
  assigned_to: string | null;
  due_date: string | null;
};
