import type { Metadata } from "next";
import Link from "next/link";
import LegalPage from "@/components/LegalPage";
import { fullAddress, getPublicCompany } from "@/lib/legal";

export const metadata: Metadata = { title: "Mentions légales" };
export const revalidate = 3600;

export default async function MentionsLegalesPage() {
  const c = await getPublicCompany();
  const address = fullAddress(c);
  return (
    <LegalPage title="Mentions légales" current="/mentions-legales">
      <h2>Éditeur du site</h2>
      <p>
        Le site <strong>{c.website || "yris-studio.com"}</strong> (et son adresse yrisstudio.fr) est édité par{" "}
        <strong>{c.legalName} EI</strong>, exerçant sous le nom commercial <strong>{c.name}</strong>.
      </p>
      <ul>
        <li>Statut : {c.status}</li>
        <li>SIRET : {c.siret}</li>
        <li>Immatriculation : Registre national des entreprises (RNE)</li>
        {address && <li>Adresse : {address}</li>}
        <li>Email : {c.email}</li>
        {c.phone && <li>Téléphone : {c.phone}</li>}
        <li>{c.vat}</li>
      </ul>
      <p>Directeur de la publication : {c.legalName}.</p>

      <h2>Hébergement</h2>
      <p>
        Le site est hébergé par <strong>Vercel Inc.</strong>, 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis (vercel.com).
      </p>
      <p>
        Les données (comptes, commandes, fichiers envoyés) sont stockées par <strong>Supabase Inc.</strong>{" "}sur des serveurs situés
        en Irlande, dans l&apos;Union européenne (supabase.com).
      </p>

      <h2>Propriété intellectuelle</h2>
      <p>
        Les textes, photos, rendus 3D, logos et modèles présentés sur le site appartiennent à {c.name}, sauf mention contraire.
        Toute reproduction sans autorisation écrite est interdite.
      </p>
      <p>
        Les fichiers 3D envoyés par les clients restent leur propriété. Ils ne servent qu&apos;à réaliser leur commande et ne sont
        jamais revendus ni réimprimés pour quelqu&apos;un d&apos;autre.
      </p>

      <h2>Données personnelles et cookies</h2>
      <p>
        Le traitement de vos données est expliqué dans la page <Link href="/confidentialite">Confidentialité</Link>. Le site
        n&apos;utilise que les cookies nécessaires à la connexion à votre compte et une mesure d&apos;audience anonyme, sans cookie
        publicitaire : aucun consentement n&apos;est donc demandé.
      </p>

      <h2>Contact</h2>
      <p>
        Pour toute question sur le site : <a href={`mailto:${c.email}`}>{c.email}</a>.
      </p>
    </LegalPage>
  );
}
