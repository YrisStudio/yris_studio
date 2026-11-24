// Équipe du gestionnaire (table admins + invitations). Partagé entre serveur et navigateur.
export const roles = ["gérant", "atelier"] as const;
export type Role = (typeof roles)[number];

export const roleMeta: Record<Role, { label: string; hint: string }> = {
  gérant: { label: "Gérant", hint: "Accès à tout, y compris Paramètres et équipe" },
  atelier: { label: "Atelier", hint: "Tout sauf Paramètres et équipe" },
};

export type Member = { userId: string; name: string; email: string; role: Role };
export type Invite = { email: string; name: string; role: Role; created_at: string };
