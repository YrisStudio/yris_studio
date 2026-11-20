import { orderRef, site } from "@/lib/site";

// Envoi d'emails via l'API Resend (https://resend.com/docs/api-reference/emails/send-email).
// Les emails aux clients utilisent des templates stockés chez Resend : leur texte se modifie
// depuis le tableau de bord Resend, sans redéployer le site.

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

// Les variables {{{…}}} sont insérées telles quelles dans le HTML : on échappe ce que le client a saisi.
const firstName = (name: string | null | undefined) => escapeHtml(name?.trim().split(/\s+/)[0] || "à vous");
const accountLink = (hasAccount: boolean) => `${site.url}${hasAccount ? "/compte" : ""}`;

// Template « demande-recue » : confirmation envoyée au client juste après sa demande.
export function sendRequestConfirmation(p: {
  orderId: string;
  to: string;
  name: string;
  kindLabel: string;
  summary: string;
  hasAccount: boolean;
}) {
  return send(
    {
      to: [p.to],
      reply_to: ownerEmail(),
      template: {
        id: "demande-recue",
        variables: {
          PRENOM: firstName(p.name),
          TYPE_DEMANDE: p.kindLabel.toLowerCase(),
          REFERENCE: orderRef(p.orderId),
          RESUME: p.summary,
          LIEN: accountLink(p.hasAccount),
        },
      },
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

// Template « statut-commande » : envoyé au client à chaque changement de statut (sauf « reçue »).
export function sendStatusUpdate(p: {
  orderId: string;
  to: string | null;
  name: string | null;
  status: string;
  priceLabel: string | null;
  hasAccount: boolean;
}) {
  const copy = statusCopy[p.status];
  if (!copy || !p.to || !emailEnabled()) return Promise.resolve(false);
  return send(
    {
      to: [p.to],
      reply_to: ownerEmail(),
      template: {
        id: "statut-commande",
        variables: {
          PRENOM: firstName(p.name),
          REFERENCE: orderRef(p.orderId),
          TITRE: copy.title,
          MESSAGE: copy.message,
          STATUT: p.status.charAt(0).toUpperCase() + p.status.slice(1),
          PRIX: p.priceLabel ?? "à confirmer",
          LIEN: accountLink(p.hasAccount),
        },
      },
    },
    `statut-${p.orderId}-${p.status}`,
  );
}
