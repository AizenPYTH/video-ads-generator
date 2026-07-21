import { BrandLogo } from "@/components/brand/logo";
import Link from "next/link";
import { APP_NAME } from "@/lib/brand";

export function MarketingFooter() {
  return (
    <footer className="border-t border-white/10 bg-[var(--ss-navy-950)] px-4 py-12 text-white sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="inline-flex rounded-lg bg-white px-2 py-1.5">
              <BrandLogo href="/" height={32} />
            </div>
            <p className="mt-4 max-w-xs text-sm leading-6 text-white/65">
              Créez, optimisez et publiez vos annonces eBay depuis un espace
              unique.
            </p>
          </div>

          <div>
            <h2 className="mb-3 text-sm font-semibold">Produit</h2>
            <ul className="space-y-2.5 text-sm text-white/65">
              <li>
                <Link href="/#fonctionnalites" className="hover:text-white">
                  Fonctionnalités
                </Link>
              </li>
              <li>
                <Link href="/#tarifs" className="hover:text-white">
                  Tarifs
                </Link>
              </li>
              <li>
                <Link href="/signup" className="hover:text-white">
                  Créer un compte
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="mb-3 text-sm font-semibold">Ressources</h2>
            <ul className="space-y-2.5 text-sm text-white/65">
              <li>
                <Link href="/login" className="hover:text-white">
                  Connexion
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-white">
                  Comparer les offres
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="mb-3 text-sm font-semibold">Légal</h2>
            <ul className="space-y-2.5 text-sm text-white/65">
              <li>
                <Link href="/privacy" className="hover:text-white">
                  Confidentialité
                </Link>
              </li>
              <li>
                <a
                  href="mailto:support@smartseller.app"
                  className="hover:text-white"
                >
                  Contact
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-white/10 pt-8 text-sm text-white/50">
          © {new Date().getFullYear()} {APP_NAME}. Tous droits réservés.
        </div>
      </div>
    </footer>
  );
}
