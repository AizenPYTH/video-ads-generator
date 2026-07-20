import { BrandLogo } from "@/components/brand/logo";
import Link from "next/link";
import { APP_NAME } from "@/lib/brand";

export function MarketingFooter() {
  return (
    <footer className="border-t border-border/70 bg-primary px-4 py-12 text-primary-foreground sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col items-start justify-between gap-10 sm:flex-row">
          <div>
            <div className="inline-flex rounded-lg bg-white px-2 py-1.5">
              <BrandLogo href="/" height={32} />
            </div>
            <p className="mt-4 max-w-xs text-sm leading-6 text-primary-foreground/70">
              Créez, préparez et publiez vos annonces eBay depuis un espace
              unique.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-x-12 gap-y-8">
            <div>
              <h2 className="mb-3 text-sm font-semibold">Produit</h2>
              <ul className="space-y-2.5 text-sm text-primary-foreground/70">
                <li>
                  <Link href="/#fonctionnalites" className="rounded-sm hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glacier-300">
                    Fonctionnalités
                  </Link>
                </li>
                <li>
                  <Link href="/#tarifs" className="rounded-sm hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glacier-300">
                    Tarifs
                  </Link>
                </li>
                <li>
                  <Link href="/signup" className="rounded-sm hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glacier-300">
                    Créer un compte
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h2 className="mb-3 text-sm font-semibold">Informations</h2>
              <ul className="space-y-2.5 text-sm text-primary-foreground/70">
                <li>
                  <Link href="/login" className="rounded-sm hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glacier-300">
                    Connexion
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="rounded-sm hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glacier-300">
                    Confidentialité
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-primary-foreground/15 pt-8 text-sm text-primary-foreground/60">
          © {new Date().getFullYear()} {APP_NAME}. Tous droits réservés.
        </div>
      </div>
    </footer>
  );
}
