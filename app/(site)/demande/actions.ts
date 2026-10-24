"use server";

import { MAX_FILES_BYTES, formatPrice, products, requestTypes, type RequestType } from "@/lib/site";
import { authEnabled, createClient, getUser } from "@/lib/supabase/server";

export type RequestState = {
  status: "idle" | "success" | "error";
  message?: string;
  // La demande a été enregistrée dans le compte du client.
  saved?: boolean;
  errors?: Partial<Record<"name" | "email" | "details" | "files" | "address", string>>;
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
  const delivery = get("delivery") === "retrait" ? "retrait" : "livraison";
  const address = delivery === "livraison" ? get("address").slice(0, 200) : "";
  const postalCode = delivery === "livraison" ? get("postal_code").slice(0, 12) : "";
  const city = delivery === "livraison" ? get("city").slice(0, 100) : "";

  const errors: RequestState["errors"] = {};
  if (name.length < 2 || name.length > 100) errors.name = "Indiquez votre nom.";
  if (!EMAIL_RE.test(email) || email.length > 200) errors.email = "Cette adresse email ne semble pas valide.";
  if (type !== "commande" && (details.length < 10 || details.length > 5000))
    errors.details = "Décrivez la pièce ou le projet en quelques phrases (10 caractères minimum).";
  if (delivery === "livraison" && (address.length < 5 || !postalCode || city.length < 2))
    errors.address = "Indiquez l'adresse complète (rue, code postal et ville), ou choisissez le retrait.";
  if (files.some((f) => !ALLOWED_EXT.test(f.name)))
    errors.files = "Formats acceptés : STL, 3MF, OBJ, STEP, photos (JPG, PNG, HEIC, WebP) et PDF.";
  else if (files.reduce((n, f) => n + f.size, 0) > MAX_FILES_BYTES)
    errors.files = "Les fichiers dépassent 4 Mo au total. Envoyez-les plutôt par email après votre demande.";
  if (Object.keys(errors).length) return { status: "error", errors };

  const user = await getUser();
  if (type === "commande") {
    if (authEnabled && !user) return { status: "error", message: "Connectez-vous pour passer commande." };
    if (!product || product.priceCents === null)
      return { status: "error", message: "Cet article est sur devis : choisissez « Sur mesure »." };
  }
  const estimatedCents = type === "commande" && product?.priceCents ? product.priceCents * quantity : null;

  // 1. On enregistre toutes les demandes (rattachées au compte du client s'il est connecté).
  let saved = false;
  if (authEnabled) {
    const supabase = await createClient();
    const { error } = await supabase.from("orders").insert({
      user_id: user?.id ?? null,
      customer_name: name,
      customer_email: email,
      phone: phone || null,
      delivery,
      address: address || null,
      postal_code: postalCode || null,
      city: city || null,
      kind: type,
      product_slug: type === "commande" ? product?.slug : null,
      product_name: type === "commande" ? product?.name : null,
      quantity,
      material: material || null,
      details: details || null,
      files: files.map((f) => f.name),
      estimated_cents: estimatedCents,
    });
    if (error) console.error("Demande : enregistrement impossible", error.message);
    saved = !error;
  }

  // 2. On vous envoie la demande par email, avec les fichiers joints.
  const where = delivery === "retrait" ? "Retrait en main propre" : `Livraison : ${address}, ${postalCode} ${city}`;
  const emailed = await sendEmail({ type, name, email, phone, material, quantity, details, product, estimatedCents, files, where });

  if (!saved && !emailed) {
    return { status: "error", message: "La demande n'a pas pu partir. Réessayez, ou écrivez-nous directement par email." };
  }
  return { status: "success", saved: saved && Boolean(user) };
}

async function sendEmail(d: {
  type: RequestType;
  name: string;
  email: string;
  phone: string;
  material: string;
  quantity: number;
  details: string;
  product?: (typeof products)[number];
  estimatedCents: number | null;
  files: File[];
  where: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL;
  if (!apiKey || !to) {
    console.error("Formulaire de demande : RESEND_API_KEY ou CONTACT_TO_EMAIL manquant.");
    return false;
  }

  const typeLabel = requestTypes.find((t) => t.id === d.type)!.title;
  const rows: [string, string][] = [
    ["Type", typeLabel],
    ["Nom", d.name],
    ["Email", d.email],
    ["Téléphone", d.phone || "non précisé"],
    ["Réception", d.where],
    ...(d.type === "commande" && d.product ? ([["Article", d.product.name]] as [string, string][]) : []),
    ["Quantité", String(d.quantity)],
    ...(d.estimatedCents ? ([["Total estimé", formatPrice(d.estimatedCents)]] as [string, string][]) : []),
    ["Matériau", d.material || "à conseiller"],
    ["Fichiers", d.files.length ? d.files.map((f) => f.name).join(", ") : "aucun"],
  ];

  const attachments = await Promise.all(
    d.files.map(async (f) => ({ filename: f.name, content: Buffer.from(await f.arrayBuffer()).toString("base64") })),
  );

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.CONTACT_FROM_EMAIL ?? "Yris <onboarding@resend.dev>",
      to: [to],
      reply_to: d.email,
      subject: `${typeLabel} : ${d.product && d.type === "commande" ? d.product.name : d.name}`,
      text: `${rows.map(([k, v]) => `${k} : ${v}`).join("\n")}\n\n${d.details}`,
      html: `<table>${rows
        .map(([k, v]) => `<tr><td><b>${k}</b></td><td>${escapeHtml(v)}</td></tr>`)
        .join("")}</table><p style="white-space:pre-wrap">${escapeHtml(d.details)}</p>`,
      attachments,
    }),
  });

  if (!res.ok) console.error("Formulaire de demande : échec Resend", res.status, await res.text());
  return res.ok;
}
