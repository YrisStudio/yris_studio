"use server";

import { MAX_FILES_BYTES, products, requestTypes, type RequestType } from "@/lib/site";

export type RequestState = {
  status: "idle" | "success" | "error";
  message?: string;
  errors?: Partial<Record<"name" | "email" | "details" | "files", string>>;
};

const ALLOWED_EXT = /\.(stl|3mf|obj|step|stp|jpe?g|png|heic|webp|pdf)$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export async function sendRequest(_prev: RequestState, formData: FormData): Promise<RequestState> {
  // Champ piège invisible : un humain le laisse vide, un robot le remplit.
  if (String(formData.get("site_web") ?? "")) return { status: "success" };

  const get = (k: string) => String(formData.get(k) ?? "").trim();
  const type = (requestTypes.find((t) => t.id === get("type"))?.id ?? "sur-mesure") as RequestType;
  const name = get("name");
  const email = get("email");
  const phone = get("phone");
  const material = get("material");
  const quantity = Math.min(Math.max(parseInt(get("quantity")) || 1, 1), 1000);
  const details = get("details");
  const product = products.find((p) => p.slug === get("article"));
  const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);

  const errors: RequestState["errors"] = {};
  if (name.length < 2 || name.length > 100) errors.name = "Indiquez votre nom.";
  if (!EMAIL_RE.test(email) || email.length > 200) errors.email = "Cette adresse email ne semble pas valide.";
  if (type !== "commande" && (details.length < 10 || details.length > 5000))
    errors.details = "Décrivez la pièce ou le projet en quelques phrases (10 caractères minimum).";
  if (files.some((f) => !ALLOWED_EXT.test(f.name)))
    errors.files = "Formats acceptés : STL, 3MF, OBJ, STEP, photos (JPG, PNG, HEIC, WebP) et PDF.";
  else if (files.reduce((n, f) => n + f.size, 0) > MAX_FILES_BYTES)
    errors.files = "Les fichiers dépassent 4 Mo au total. Envoyez-les plutôt par email après votre demande.";
  if (Object.keys(errors).length) return { status: "error", errors };

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL;
  if (!apiKey || !to) {
    console.error("Formulaire de demande : RESEND_API_KEY ou CONTACT_TO_EMAIL manquant.");
    return { status: "error", message: "L'envoi est momentanément indisponible. Écrivez-nous directement par email." };
  }

  const typeLabel = requestTypes.find((t) => t.id === type)!.title;
  const rows: [string, string][] = [
    ["Type", typeLabel],
    ["Nom", name],
    ["Email", email],
    ["Téléphone", phone || "non précisé"],
    ...(product ? ([["Article", `${product.name} (${product.price})`]] as [string, string][]) : []),
    ["Quantité", String(quantity)],
    ["Matériau", material || "à conseiller"],
    ["Fichiers", files.length ? files.map((f) => f.name).join(", ") : "aucun"],
  ];

  const attachments = await Promise.all(
    files.map(async (f) => ({ filename: f.name, content: Buffer.from(await f.arrayBuffer()).toString("base64") })),
  );

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.CONTACT_FROM_EMAIL ?? "Yris <onboarding@resend.dev>",
      to: [to],
      reply_to: email,
      subject: `${typeLabel} : ${product?.name ?? name}`,
      text: `${rows.map(([k, v]) => `${k} : ${v}`).join("\n")}\n\n${details}`,
      html: `<table>${rows
        .map(([k, v]) => `<tr><td><b>${k}</b></td><td>${escapeHtml(v)}</td></tr>`)
        .join("")}</table><p style="white-space:pre-wrap">${escapeHtml(details)}</p>`,
      attachments,
    }),
  });

  if (!res.ok) {
    console.error("Formulaire de demande : échec Resend", res.status, await res.text());
    return { status: "error", message: "La demande n'a pas pu partir. Réessayez dans un instant." };
  }

  return { status: "success" };
}
