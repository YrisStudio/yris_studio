import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";
import { getPublicCompany } from "@/lib/legal";

export const metadata: Metadata = { title: "Confidentialité" };
export const revalidate = 3600;

const uses = [
  {
    what: "Commandes et devis",
    data: "Nom, email, téléphone, adresse de livraison, message, fichiers 3D et photos envoyés, articles commandés.",
    why: "Exécuter la commande ou préparer le devis (contrat).",
    how: "10 ans pour les commandes payées et les factures (obligation comptable). Fichiers et photos : jusqu'à 3 ans après la dernière commande, ou plus tôt sur demande.",
  },
  {
    what: "Compte client",
    data: "Nom, email, mot de passe (chiffré, illisible par nous), historique des commandes.",
    why: "Vous permettre de suivre vos commandes (contrat).",
    how: "Tant que le compte existe, puis 3 ans après la dernière activité.",
  },
  {
    what: "Newsletter",
    data: "Adresse email, date d'inscription.",
    why: "Vous envoyer nos nouveautés (votre consentement).",
    how: "Jusqu'à la désinscription, possible en un clic dans chaque email.",
  },
  {
    what: "Relance et parrainage",
    data: "Email, date de la dernière commande, code de parrainage.",
    why: "Vous proposer une offre si vous n'avez pas commandé depuis longtemps (intérêt légitime, sur des produits similaires).",
    how: "3 ans après la dernière commande. Vous pouvez refuser ces emails à tout moment.",
  },
  {
    what: "Messages et signalements",
    data: "Nom, email, contenu du message.",
    why: "Vous répondre (intérêt légitime).",
    how: "3 ans après le dernier échange.",
  },
];

const processors = [
  ["Supabase", "Base de données et stockage des fichiers", "Irlande (UE)"],
  ["Vercel", "Hébergement du site et mesure d'audience anonyme", "UE et États-Unis"],
  ["Stripe", "Paiement par carte (nous ne voyons jamais vos numéros de carte)", "Irlande (UE) et États-Unis"],
  ["Resend", "Envoi des emails (confirmations, suivi, newsletter)", "États-Unis"],
  ["Google Workspace", "Boîte de réception de l'adresse de contact", "UE et États-Unis"],
];

export default async function ConfidentialitePage() {
  const c = await getPublicCompany();
  return (
    <LegalPage title="Confidentialité" current="/confidentialite">
      <p>
        Cette page explique quelles données {c.name} collecte, pourquoi, combien de temps on les garde et comment exercer vos
        droits. On ne collecte que ce qui sert à traiter vos commandes, et on ne vend ni ne loue jamais vos données.
      </p>

      <h2>Responsable du traitement</h2>
      <p>
        {c.legalName} EI ({c.name}), SIRET {c.siret}. Contact pour toute question sur vos données :{" "}
        <a href={`mailto:${c.email}`}>{c.email}</a>.
      </p>

      <h2>Les données et leur usage</h2>
      <div className="space-y-3">
        {uses.map((u) => (
          <div key={u.what} className="rounded-lg border border-line-strong p-4">
            <h3 className="!mt-0">{u.what}</h3>
            <dl className="mt-2 grid gap-1.5 text-sm sm:grid-cols-[130px_1fr]">
              <dt className="text-muted">Données</dt>
              <dd>{u.data}</dd>
              <dt className="text-muted">Pourquoi</dt>
              <dd>{u.why}</dd>
              <dt className="text-muted">Conservation</dt>
              <dd>{u.how}</dd>
            </dl>
          </div>
        ))}
      </div>

      <h2>Qui y a accès</h2>
      <p>
        Seule l&apos;équipe {c.name} accède à vos données, depuis un espace de gestion protégé. Elles passent aussi par les
        prestataires techniques suivants, qui les traitent uniquement pour notre compte :
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] text-left text-sm">
          <thead>
            <tr className="border-b border-line-strong text-muted">
              <th className="py-2 pr-4 font-normal">Prestataire</th>
              <th className="py-2 pr-4 font-normal">Rôle</th>
              <th className="py-2 font-normal">Lieu</th>
            </tr>
          </thead>
          <tbody>
            {processors.map(([name, role, where]) => (
              <tr key={name} className="border-b border-line">
                <td className="py-2 pr-4 text-fg">{name}</td>
                <td className="py-2 pr-4">{role}</td>
                <td className="py-2">{where}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        Les transferts hors de l&apos;Union européenne sont encadrés par les clauses contractuelles types de la Commission
        européenne ou par le cadre de protection des données UE–États-Unis. Le transporteur reçoit votre nom et votre adresse
        uniquement pour livrer le colis.
      </p>

      <h2>Cookies</h2>
      <p>
        Le site dépose seulement les cookies nécessaires à la connexion à votre compte. La mesure d&apos;audience (Vercel
        Analytics) est anonyme et n&apos;utilise pas de cookie. Il n&apos;y a aucun cookie publicitaire ni de réseau social, donc
        aucun bandeau de consentement.
      </p>

      <h2>Vos droits</h2>
      <p>Vous pouvez à tout moment :</p>
      <ul>
        <li>accéder à vos données et en obtenir une copie ;</li>
        <li>les faire corriger ou supprimer ;</li>
        <li>vous opposer à leur utilisation ou en demander la limitation ;</li>
        <li>retirer votre consentement (newsletter) ;</li>
        <li>récupérer vos données dans un format lisible (portabilité).</li>
      </ul>
      <p>
        Écrivez-nous à <a href={`mailto:${c.email}`}>{c.email}</a>, on vous répond sous un mois. Les factures doivent être
        conservées 10 ans : elles ne peuvent pas être supprimées avant. Si vous estimez que vos droits ne sont pas respectés, vous
        pouvez saisir la CNIL (cnil.fr).
      </p>

      <h2>Sécurité</h2>
      <p>
        Les échanges avec le site sont chiffrés (HTTPS), les mots de passe ne sont jamais stockés en clair, les fichiers envoyés
        sont dans un espace privé, et l&apos;accès au gestionnaire est réservé à l&apos;équipe, avec double authentification
        possible.
      </p>
    </LegalPage>
  );
}
