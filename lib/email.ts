import { orderRef, site } from "@/lib/site";

// Envoi d'emails via l'API Resend (https://resend.com/docs/api-reference/emails/send-email).
// Les emails aux clients sont écrits ici (clientEmail) : leur texte se modifie dans ce fichier.

const FROM = () => process.env.CONTACT_FROM_EMAIL ?? "Yris <onboarding@resend.dev>";
export const emailEnabled = () => Boolean(process.env.RESEND_API_KEY);
// Adresse qui reçoit les formulaires (et à laquelle les clients répondent) : l'adresse de contact du site,
// sauf si CONTACT_TO_EMAIL est défini dans les variables d'environnement.
const ownerEmail = () => process.env.CONTACT_TO_EMAIL || site.email;

type Payload = Record<string, unknown>;

// Envoie un email. Réessaie en cas d'erreur réseau, 429 ou 5xx (en respectant retry-after).
// La clé d'idempotence évite les doublons si une tentative est rejouée.
async function send(payload: Payload, idempotencyKey?: string): Promise<boolean> {
  return Boolean(await sendWithId(payload, idempotencyKey));
}

// Comme send, mais renvoie l'identifiant Resend de l'email (null en cas d'échec).
async function sendWithId(payload: Payload, idempotencyKey?: string): Promise<string | null> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("Email : RESEND_API_KEY manquant.");
    return null;
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
        },
        body: JSON.stringify({ from: FROM(), ...payload }),
      });
      if (res.ok) {
        const { id } = (await res.json()) as { id?: string };
        console.info("Email envoyé", id);
        return id ?? "envoyé";
      }
      const retryable = res.status === 429 || res.status >= 500;
      console.error("Email : échec Resend", res.status, await res.text());
      if (!retryable) return null;
      const wait = Number(res.headers.get("retry-after")) * 1000 || 500 * 2 ** attempt;
      await new Promise((r) => setTimeout(r, Math.min(wait, 5000)));
    } catch (err) {
      console.error("Email : erreur réseau", err);
      await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
    }
  }
  return null;
}

// Lecture dans l'API Resend (mails reçus). null si la clé manque ou en cas d'erreur.
export async function resendGet<T>(path: string): Promise<T | null> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await fetch(`https://api.resend.com${path}`, { headers: { Authorization: `Bearer ${apiKey}` }, cache: "no-store" });
    if (!res.ok) {
      console.error("Resend :", res.status, await res.text());
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.error("Resend : erreur réseau", err);
    return null;
  }
}

// Réponse à un client depuis la boîte de réception, au nom de contact@. Ses réponses reviennent au groupe contact.
export function sendInboxReply(p: { to: string; subject: string; text: string; inReplyTo: string | null; key: string }) {
  const html = `<div style="font-family:system-ui,sans-serif;font-size:14px;line-height:1.6;white-space:pre-wrap">${escapeHtml(p.text)}</div>`;
  return sendWithId(
    {
      to: [p.to],
      reply_to: ownerEmail(),
      subject: p.subject,
      text: p.text,
      html,
      ...(p.inReplyTo ? { headers: { "In-Reply-To": p.inReplyTo, References: p.inReplyTo } } : {}),
    },
    p.key,
  );
}

export function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

// Email interne (pour vous), avec pièces jointes éventuelles.
export async function notifyOwner(p: {
  subject: string;
  replyTo: string;
  rows: [string, string][];
  body: string;
  files?: File[];
}) {
  const to = ownerEmail();
  const attachments = await Promise.all(
    (p.files ?? []).map(async (f) => ({ filename: f.name, content: Buffer.from(await f.arrayBuffer()).toString("base64") })),
  );
  return send({
    to: [to],
    reply_to: p.replyTo,
    subject: p.subject,
    text: `${p.rows.map(([k, v]) => `${k} : ${v}`).join("\n")}\n\n${p.body}`,
    html: `<table>${p.rows
      .map(([k, v]) => `<tr><td><b>${escapeHtml(k)}</b></td><td>${escapeHtml(v)}</td></tr>`)
      .join("")}</table><p style="white-space:pre-wrap">${escapeHtml(p.body)}</p>`,
    ...(attachments.length ? { attachments } : {}),
  });
}

const firstName = (name: string | null | undefined) => escapeHtml(name?.trim().split(/\s+/)[0] || "à vous");
const accountLink = (hasAccount: boolean) => `${site.url}${hasAccount ? "/compte" : ""}`;

// Mise en page commune des emails clients : tableaux et styles en ligne, pour Gmail, Outlook et Apple Mail.
// `rows` et `intro` sont déjà en HTML sûr (les saisies du client sont échappées avant).
function clientEmail(p: { preview: string; title: string; intro: string; rows: [string, string][]; link: string; linkLabel: string; images?: string[] }) {
  // Photos (pièce finie) : deux par ligne, liens publics.
  const images = (p.images ?? []).slice(0, 4).map((src) => `<td style="padding:4px" width="50%"><img src="${src}" width="240" alt="" style="display:block;width:100%;height:auto;border-radius:8px;border:0"></td>`);
  const gallery = images.length ? `<tr><td style="padding:8px 28px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${images.slice(0, 2).join("")}</tr>${images.length > 2 ? `<tr>${images.slice(2).join("")}</tr>` : ""}</table></td></tr>` : "";
  const rows = p.rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:8px 0;color:#6b6b66;font-size:13px;vertical-align:top;width:120px">${k}</td><td style="padding:8px 0;color:#151513;font-size:14px">${v}</td></tr>`,
    )
    .join("");
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${p.title}</title></head>
<body style="margin:0;padding:0;background:#f4f4f1">
<span style="display:none;max-height:0;overflow:hidden;opacity:0">${p.preview}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f1"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e4e4df;border-radius:12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
<tr><td style="padding:28px 32px 0"><img src="${site.url}/brand/yris-logo-horizontal-light-transparent.png" width="120" alt="Yris Studio" style="display:block;border:0;height:auto"></td></tr>
<tr><td style="padding:24px 32px 8px"><h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;color:#151513">${p.title}</h1>
<p style="margin:0;font-size:15px;line-height:1.6;color:#33332f">${p.intro}</p></td></tr>
${gallery}
<tr><td style="padding:8px 32px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #ecece7;border-bottom:1px solid #ecece7">${rows}</table></td></tr>
<tr><td style="padding:20px 32px 8px"><a href="${p.link}" style="display:inline-block;background:#16a34a;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:11px 20px;border-radius:8px">${p.linkLabel}</a></td></tr>
<tr><td style="padding:16px 32px 28px;font-size:13px;line-height:1.6;color:#6b6b66">Une question ? Répondez simplement à cet email.<br>L'équipe Yris Studio</td></tr>
</table>
<p style="margin:16px 0 0;font-family:Arial,sans-serif;font-size:12px;color:#9a9a94">Yris Studio · impression 3D · <a href="${site.url}" style="color:#9a9a94">yris-studio.com</a></p>
</td></tr></table></body></html>`;
}

// Version texte des mêmes emails (lue par les messageries sans HTML et utile contre le spam).
const plain = (html: string) =>
  html
    .replace(/<br\s*\/?>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

// Confirmation envoyée au client juste après sa demande. `summary` est déjà en HTML échappé.
export function sendRequestConfirmation(p: {
  orderId: string;
  to: string;
  name: string;
  kindLabel: string;
  summary: string;
  hasAccount: boolean;
  // Commande de la boutique : le prix est déjà connu, on annonce le paiement plutôt qu'un devis.
  shop?: boolean;
  // Commande déjà payée en ligne (Stripe).
  paid?: boolean;
}) {
  const ref = orderRef(p.orderId);
  const link = accountLink(p.hasAccount);
  const intro = p.paid
    ? `Bonjour ${firstName(p.name)}, merci pour votre commande ! Votre paiement est bien reçu : on lance l'impression et on vous prévient dès que c'est prêt.`
    : p.shop
      ? `Bonjour ${firstName(p.name)}, merci pour votre commande ! On vous envoie très vite le lien de paiement, puis on lance l'impression.`
      : `Bonjour ${firstName(p.name)}, on a bien reçu votre demande. On l'étudie et on revient vers vous très vite avec un prix, en général sous 24 à 48 h.`;
  const title = p.paid ? "Commande confirmée" : p.shop ? "Commande bien reçue" : "Demande bien reçue";
  const rows: [string, string][] = [
    ["Référence", `<b>${ref}</b>`],
    ["Type", escapeHtml(p.kindLabel)],
    ["Détails", p.summary || "—"],
  ];
  return send(
    {
      to: [p.to],
      reply_to: ownerEmail(),
      subject: `${p.paid ? "Commande confirmée" : p.shop ? "Commande reçue" : "Demande reçue"} · ${ref}`,
      html: clientEmail({ preview: p.paid ? `Paiement reçu pour la commande ${ref}.` : `On a bien reçu votre demande ${ref}.`, title, intro, rows, link, linkLabel: p.hasAccount ? "Suivre ma demande" : "Voir le site" }),
      text: `${plain(intro)}\n\nRéférence : ${ref}\n${plain(p.summary)}\n\n${link}\n\nUne question ? Répondez simplement à cet email.\nL'équipe Yris Studio`,
    },
    `demande-recue-${p.orderId}`,
  );
}

const statusCopy: Record<string, { title: string; message: string }> = {
  "devis envoyé": {
    title: "Votre devis est prêt",
    message: "voici le prix de votre commande. Répondez simplement à cet email pour la valider, et on lance l'impression.",
  },
  "en impression": {
    title: "C'est parti, on imprime",
    message: "votre pièce est en cours d'impression. On vous prévient dès qu'elle est prête.",
  },
  terminée: {
    title: "Votre commande est prête",
    message: "votre pièce est imprimée et vérifiée. On revient vers vous pour la livraison ou le retrait.",
  },
  annulée: {
    title: "Commande annulée",
    message: "votre commande a été annulée. Si c'est une erreur, répondez à cet email et on s'en occupe.",
  },
};

// Envoyé au client à chaque changement de statut (sauf « reçue »).
export function sendStatusUpdate(p: {
  orderId: string;
  to: string | null;
  name: string | null;
  status: string;
  priceLabel: string | null;
  hasAccount: boolean;
  // Photos de la pièce finie (liens publics), montrées dans l'email « prête ».
  photos?: string[];
}) {
  const copy = statusCopy[p.status];
  if (!copy || !p.to || !emailEnabled()) return Promise.resolve(false);
  const ref = orderRef(p.orderId);
  const link = accountLink(p.hasAccount);
  const status = p.status.charAt(0).toUpperCase() + p.status.slice(1);
  const price = escapeHtml(p.priceLabel ?? "à confirmer");
  const intro = `Bonjour ${firstName(p.name)}, ${copy.message}`;
  const rows: [string, string][] = [
    ["Référence", `<b>${ref}</b>`],
    ["Statut", escapeHtml(status)],
    ...(p.status === "annulée" ? [] : ([["Prix", `<b>${price}</b>`]] as [string, string][])),
  ];
  return send(
    {
      to: [p.to],
      reply_to: ownerEmail(),
      subject: `${copy.title} · ${ref}`,
      html: clientEmail({
        preview: `${copy.title} (${ref}).`,
        title: copy.title,
        intro,
        rows,
        link,
        linkLabel: p.hasAccount ? "Voir ma commande" : "Voir le site",
        images: p.status === "terminée" ? p.photos : undefined,
      }),
      text: `${plain(intro)}\n\nRéférence : ${ref}\nStatut : ${status}${p.status === "annulée" ? "" : `\nPrix : ${p.priceLabel ?? "à confirmer"}`}\n\n${link}\n\nUne question ? Répondez simplement à cet email.\nL'équipe Yris Studio`,
    },
    `statut-${p.orderId}-${p.status}`,
  );
}

// Colis parti : numéro de suivi et lien du transporteur.
export function sendShipped(p: { orderId: string; to: string | null; name: string | null; carrier: string; tracking: string; trackingUrl: string | null; hasAccount: boolean }) {
  if (!p.to || !emailEnabled()) return Promise.resolve(false);
  const ref = orderRef(p.orderId);
  const intro = `Bonjour ${firstName(p.name)}, votre colis est parti ! Vous pouvez suivre son trajet avec le numéro ci-dessous.`;
  const rows: [string, string][] = [
    ["Référence", `<b>${ref}</b>`],
    ["Transporteur", escapeHtml(p.carrier)],
    ["Suivi", `<b>${escapeHtml(p.tracking)}</b>`],
  ];
  const link = p.trackingUrl ?? accountLink(p.hasAccount);
  return send(
    {
      to: [p.to],
      reply_to: ownerEmail(),
      subject: `Votre colis est parti · ${ref}`,
      html: clientEmail({ preview: `Colis ${ref} expédié.`, title: "Votre colis est parti", intro, rows, link, linkLabel: p.trackingUrl ? "Suivre mon colis" : "Voir le site" }),
      text: `${plain(intro)}

Référence : ${ref}
Transporteur : ${p.carrier}
Suivi : ${p.tracking}
${p.trackingUrl ?? ""}

L'équipe Yris Studio`,
    },
    `expedie-${p.orderId}-${p.tracking}`,
  );
}

// Parrainage : le filleul a payé sa première commande, le parrain reçoit son bon.
export function sendReferralReward(p: { to: string; code: string; amountLabel: string }) {
  if (!emailEnabled()) return Promise.resolve(false);
  const intro = `Bonjour, une personne a passé commande avec votre code de parrainage. Merci ! Voici votre bon de réduction de <b>${escapeHtml(p.amountLabel)}</b> sur votre prochaine commande.`;
  const rows: [string, string][] = [["Votre code", `<b style="font-family:monospace;font-size:16px">${escapeHtml(p.code)}</b>`]];
  return send(
    {
      to: [p.to],
      reply_to: ownerEmail(),
      subject: `Merci pour le parrainage : ${p.amountLabel} offerts`,
      html: clientEmail({ preview: `Votre bon de ${p.amountLabel}.`, title: "Merci pour le parrainage", intro, rows, link: `${site.url}/boutique`, linkLabel: "Voir la boutique" }),
      text: `${plain(intro)}

Votre code : ${p.code}
${site.url}/boutique

L'équipe Yris Studio`,
    },
    `parrainage-${p.code}`,
  );
}
