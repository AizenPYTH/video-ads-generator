import Link from "next/link";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";

export const metadata = {
  title: "Politique de confidentialité — SNOWOLF",
  description: "Politique de confidentialité de SNOWOLF, requise pour la connexion eBay.",
};

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <MarketingNav />
      <main className="flex-1 px-6 py-16">
        <article className="prose prose-neutral mx-auto max-w-3xl dark:prose-invert">
          <h1>Politique de confidentialité</h1>
          <p className="text-muted-foreground">Dernière mise à jour : juillet 2026</p>

          <h2>1. Qui sommes-nous ?</h2>
          <p>
            SNOWOLF est une plateforme française qui aide les vendeurs eBay à
            créer, optimiser et publier leurs annonces. En utilisant nos
            services, vous acceptez la présente politique de confidentialité.
          </p>

          <h2>2. Données collectées</h2>
          <p>Nous collectons les données suivantes :</p>
          <ul>
            <li>Informations de compte : email, nom, mot de passe (chiffré)</li>
            <li>Données eBay : identifiant vendeur, jetons d&apos;accès OAuth (chiffrés)</li>
            <li>Contenu utilisateur : photos de produits, annonces, imports</li>
            <li>Données de facturation : via Stripe (nous ne stockons pas vos coordonnées bancaires)</li>
            <li>Données techniques : journaux d&apos;utilisation, adresse IP, type de navigateur</li>
          </ul>

          <h2>3. Utilisation des données</h2>
          <p>Vos données sont utilisées pour :</p>
          <ul>
            <li>Fournir et améliorer nos services d&apos;analyse et de publication</li>
            <li>Connecter et gérer votre compte eBay via OAuth</li>
            <li>Traiter vos abonnements et facturations</li>
            <li>Vous envoyer des notifications liées à votre activité (avec votre consentement)</li>
            <li>Assurer la sécurité et prévenir les abus</li>
          </ul>

          <h2>4. Connexion eBay (OAuth)</h2>
          <p>
            Lorsque vous connectez votre compte eBay, nous accédons à votre
            compte vendeur via le protocole OAuth 2.0 d&apos;eBay. Les autorisations
            demandées permettent de gérer votre inventaire et vos annonces en
            votre nom. Vous pouvez révoquer cet accès à tout moment depuis
            SNOWOLF ou depuis les paramètres de votre compte eBay.
          </p>

          <h2>5. Partage des données</h2>
          <p>
            Nous ne vendons pas vos données. Nous les partageons uniquement avec
            nos sous-traitants techniques (hébergement, paiement, intelligence
            artificielle) dans le cadre strict de la fourniture du service,
            ainsi qu&apos;avec eBay lorsque vous publiez une annonce.
          </p>

          <h2>6. Conservation</h2>
          <p>
            Vos données sont conservées tant que votre compte est actif. Vous
            pouvez demander la suppression de votre compte et de vos données en
            nous contactant.
          </p>

          <h2>7. Vos droits (RGPD)</h2>
          <p>
            Conformément au Règlement Général sur la Protection des Données,
            vous disposez d&apos;un droit d&apos;accès, de rectification, de
            suppression, de portabilité et d&apos;opposition. Pour exercer ces
            droits, contactez-nous à{" "}
            <a href="mailto:privacy@snowolf.fr">privacy@snowolf.fr</a>.
          </p>

          <h2>8. Cookies</h2>
          <p>
            Nous utilisons des cookies essentiels pour maintenir votre session
            connectée et des cookies analytiques pour améliorer le service.
          </p>

          <h2>9. Contact</h2>
          <p>
            Pour toute question relative à cette politique :{" "}
            <a href="mailto:privacy@snowolf.fr">privacy@snowolf.fr</a>
          </p>

          <p>
            <Link href="/" className="text-primary hover:underline">
              ← Retour à l&apos;accueil
            </Link>
          </p>
        </article>
      </main>
      <MarketingFooter />
    </div>
  );
}
