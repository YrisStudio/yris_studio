// Transporteurs proposés pour l'envoi des colis, avec leur page de suivi publique.
export const carriers = ["Colissimo", "Lettre suivie", "Mondial Relay", "Chronopost", "Autre"] as const;

export function carrierTrackingUrl(carrier: string, tracking: string) {
  const code = encodeURIComponent(tracking);
  if (carrier === "Colissimo" || carrier === "Lettre suivie") return `https://www.laposte.fr/outils/suivre-vos-envois?code=${code}`;
  if (carrier === "Chronopost") return `https://www.chronopost.fr/tracking-no-cms/suivi-page?listeNumerosLT=${code}`;
  if (carrier === "Mondial Relay") return `https://www.mondialrelay.fr/suivi-de-colis/?NumeroExpedition=${code}`;
  return null;
}
