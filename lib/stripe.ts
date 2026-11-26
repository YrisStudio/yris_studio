import Stripe from "stripe";

// Paiement par carte. Tant que la clé n'est pas définie dans Vercel, la boutique prend
// les commandes sans paiement (comme avant) et on envoie le lien de paiement à la main.
// Les trois clés sont nécessaires : sans le webhook, un client paierait sans que la commande passe « payée ».
const key = process.env.STRIPE_SECRET_KEY;
export const stripeEnabled = Boolean(key && process.env.STRIPE_WEBHOOK_SECRET && process.env.SUPABASE_SERVICE_ROLE_KEY);

let client: Stripe | null = null;
export function stripe() {
  if (!key) throw new Error("STRIPE_SECRET_KEY manquante");
  client ??= new Stripe(key);
  return client;
}
