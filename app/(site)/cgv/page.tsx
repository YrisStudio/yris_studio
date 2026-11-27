import type { Metadata } from "next";
import Link from "next/link";
import LegalPage from "@/components/LegalPage";
import { fullAddress, getPublicCompany } from "@/lib/legal";
import { formatPrice, SHOP_SHIPPING_CENTS } from "@/lib/site";

export const metadata: Metadata = { title: "Conditions générales de vente" };
export const revalidate = 3600;

export default async function CgvPage() {
  const c = await getPublicCompany();
  const address = fullAddress(c);
  const seller = `${c.legalName} EI (${c.name})`;
  return (
    <LegalPage title="Conditions générales de vente" current="/cgv">
      <p>
        Ces conditions s&apos;appliquent à toutes les commandes passées sur {c.website || "yris-studio.com"} : articles de la
        boutique et pièces imprimées sur mesure. Elles sont acceptées au moment de la commande, en cochant la case prévue à cet
        effet.
      </p>

      <h2>1. Le vendeur</h2>
      <p>
        {seller}, {c.status.toLowerCase()}, SIRET {c.siret}
        {address ? `, ${address}` : ""}. Contact : <a href={`mailto:${c.email}`}>{c.email}</a>
        {c.phone ? `, ${c.phone}` : ""}. Les coordonnées complètes figurent dans les{" "}
        <Link href="/mentions-legales">mentions légales</Link>.
      </p>

      <h2>2. Les produits</h2>
      <p>
        Toutes les pièces sont fabriquées par impression 3D, à la commande, dans notre atelier. Les photos et rendus de la
        boutique sont aussi fidèles que possible. De légères différences de teinte, de texture ou de stries d&apos;impression
        peuvent exister : elles font partie du procédé et ne sont pas des défauts.
      </p>
      <p>
        Pour les pièces auto et les pièces de rechange : nos pièces ne sont pas conçues pour les organes de sécurité (freinage,
        direction, ceintures, airbags, fixations soumises à de fortes charges). Ne les utilisez pas à cet endroit.
      </p>

      <h2>3. Prix</h2>
      <p>
        Les prix sont indiqués en euros, toutes taxes comprises. {c.vat}. Ils sont ceux affichés au moment de la commande. Les
        frais de livraison ({formatPrice(SHOP_SHIPPING_CENTS)}{" "}en France métropolitaine) sont indiqués dans le panier avant le
        paiement. Le retrait à l&apos;atelier est gratuit.
      </p>

      <h2>4. Commande</h2>
      <h3>Articles de la boutique</h3>
      <p>
        Vous choisissez vos articles, vérifiez le panier, puis payez en ligne. La commande est définitive après le paiement : vous
        recevez alors une confirmation par email, puis la facture.
      </p>
      <h3>Pièces sur mesure</h3>
      <p>
        Vous envoyez une demande (fichier 3D, photo ou description). On vous répond par un devis gratuit, valable 30 jours. La
        commande est formée quand vous acceptez le devis et payez via le lien envoyé par email. L&apos;impression commence après le
        paiement.
      </p>
      <p>
        En nous envoyant un fichier, vous confirmez avoir le droit de le faire imprimer. Nous pouvons refuser une demande contraire
        à la loi (armes, contrefaçon, objet portant atteinte aux droits d&apos;autrui) ou techniquement irréalisable.
      </p>

      <h2>5. Paiement</h2>
      <p>
        Le paiement se fait par carte bancaire, Apple Pay ou Google Pay, via notre prestataire sécurisé Stripe. Nous n&apos;avons
        jamais accès à vos numéros de carte. {c.paymentTerms}.
      </p>

      <h2>6. Fabrication et livraison</h2>
      <p>
        Le délai de fabrication est indiqué sur chaque article (en jours ouvrés), ou dans le devis pour une pièce sur mesure. La
        livraison se fait en France métropolitaine par La Poste (Colissimo ou lettre suivie), Mondial Relay ou Chronopost. Vous
        recevez le numéro de suivi par email au moment de l&apos;envoi. Sans précision, la livraison intervient au plus tard 30
        jours après la commande.
      </p>
      <p>
        À la réception, vérifiez le colis. En cas de dommage, faites des réserves auprès du transporteur et écrivez-nous sous 3
        jours, avec une photo. Si le délai n&apos;est pas respecté, vous pouvez nous demander de livrer dans un délai
        raisonnable, puis annuler la commande et être remboursé si ce n&apos;est toujours pas fait.
      </p>

      <h2>7. Droit de rétractation</h2>
      <p>
        <strong>Articles de la boutique :</strong>{" "}vous avez 14 jours à partir de la réception pour changer d&apos;avis, sans avoir
        à vous justifier. Prévenez-nous par email à <a href={`mailto:${c.email}`}>{c.email}</a>{" "}(ou avec le formulaire en bas de
        page), puis renvoyez l&apos;article dans les 14 jours suivants, en bon état. Les frais de retour sont à votre charge. Nous
        vous remboursons dans les 14 jours suivant votre demande, par le moyen de paiement utilisé, au plus tard une fois
        l&apos;article reçu.
      </p>
      <p>
        <strong>Pièces sur mesure :</strong>{" "}une pièce fabriquée selon vos fichiers, vos mesures ou vos demandes est nettement
        personnalisée. Conformément à l&apos;article L221-28 3° du Code de la consommation, elle ne peut pas faire l&apos;objet
        d&apos;une rétractation. Les garanties légales (point 8) s&apos;appliquent normalement.
      </p>

      <h2>8. Garanties légales</h2>
      <p>
        Le consommateur dispose d&apos;un délai de deux ans à compter de la délivrance du bien pour obtenir la mise en œuvre de la
        garantie légale de conformité en cas d&apos;apparition d&apos;un défaut de conformité. Durant ce délai, il n&apos;a à
        prouver que l&apos;existence du défaut, et non la date à laquelle il est apparu.
      </p>
      <p>
        La garantie légale de conformité permet d&apos;obtenir la réparation ou le remplacement du bien dans un délai de trente
        jours suivant la demande, sans frais et sans inconvénient majeur. Si la réparation ou le remplacement est impossible, trop
        tardif ou insuffisant, le consommateur peut obtenir une réduction du prix en conservant le bien, ou mettre fin au contrat
        et être remboursé en rendant le bien.
      </p>
      <p>
        Le professionnel qui fait obstacle de mauvaise foi à la mise en œuvre de la garantie légale de conformité encourt une
        amende civile d&apos;un montant maximal de 300 000 euros, qui peut être porté jusqu&apos;à 10 % du chiffre d&apos;affaires
        moyen annuel (article L241-5 du Code de la consommation).
      </p>
      <p>
        Le consommateur bénéficie également de la garantie légale des vices cachés (articles 1641 à 1649 du Code civil), pendant
        deux ans à compter de la découverte du défaut. Il peut alors choisir entre une réduction du prix et l&apos;annulation de la
        vente.
      </p>
      <p>Pour faire jouer une garantie, écrivez-nous avec votre numéro de commande et une photo du problème.</p>

      <h2>9. Compte client et newsletter</h2>
      <p>
        Le compte client permet de suivre vos commandes et vos demandes. Vous êtes responsable de la confidentialité de votre mot de
        passe. Vous pouvez supprimer votre compte à tout moment en nous écrivant. La newsletter est facultative : chaque email
        contient un lien de désinscription en un clic.
      </p>

      <h2>10. Réclamations et médiation</h2>
      <p>
        Pour toute réclamation, écrivez-nous à <a href={`mailto:${c.email}`}>{c.email}</a> ou via la page{" "}
        <Link href="/signaler">Signaler un problème</Link>. On vous répond sous 7 jours.
      </p>
      <p>
        Si le désaccord persiste, vous pouvez recourir gratuitement au médiateur de la consommation
        {c.mediator ? (
          <>
            {" "}: <strong>{c.mediator}</strong>, après nous avoir adressé une réclamation écrite.
          </>
        ) : (
          <>, dont les coordonnées vous seront communiquées sur simple demande, après nous avoir adressé une réclamation écrite.</>
        )}
      </p>

      <h2>11. Droit applicable</h2>
      <p>
        Ces conditions sont soumises au droit français. En cas de litige, le tribunal compétent est celui prévu par la loi ; le
        consommateur peut saisir le tribunal de son domicile.
      </p>

      <h2>Formulaire de rétractation</h2>
      <p>À recopier dans un email ou un courrier, uniquement si vous souhaitez vous rétracter.</p>
      <div className="rounded-lg border border-line-strong bg-panel-2 p-5 text-sm">
        <p>
          À l&apos;attention de {seller}
          {address ? `, ${address}` : ""}, {c.email} :
        </p>
        <p className="mt-3">
          Je vous notifie par la présente ma rétractation du contrat portant sur la vente du bien ci-dessous :
        </p>
        <ul className="mt-2">
          <li>Commandé le / reçu le :</li>
          <li>Numéro de commande :</li>
          <li>Nom du client :</li>
          <li>Adresse du client :</li>
          <li>Date et signature (en cas de courrier papier) :</li>
        </ul>
      </div>
    </LegalPage>
  );
}
