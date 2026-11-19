// SAV : signalements envoyés par les clients depuis /signaler. Sans dépendance serveur.

export const reportStatuses = ["nouveau", "en cours", "traité"] as const;
export type ReportStatus = (typeof reportStatuses)[number];

export type Report = {
  id: string;
  user_id: string | null;
  name: string;
  email: string;
  category: string;
  order_ref: string | null;
  message: string;
  status: ReportStatus;
  resolution: string | null;
  handled_at: string | null;
  created_at: string;
};

export const reportStatusMeta: Record<ReportStatus, { label: string; pill: string; dot: string }> = {
  nouveau: { label: "À traiter", pill: "bg-red-400/15 text-red-300", dot: "bg-red-400" },
  "en cours": { label: "En cours", pill: "bg-amber-400/15 text-amber-300", dot: "bg-amber-400" },
  traité: { label: "Traité", pill: "bg-accent/15 text-accent", dot: "bg-accent" },
};

// « #A1B2C3D4 » ou « a1b2c3d4 » → début d'identifiant de commande, en minuscules.
export const refPrefix = (ref: string | null) => {
  const m = ref?.replace(/[#\s]/g, "").toLowerCase().match(/^[0-9a-f]{6,36}/);
  return m ? m[0] : null;
};
