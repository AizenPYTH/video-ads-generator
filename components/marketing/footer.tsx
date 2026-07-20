import Link from "next/link";
import { Snowflake } from "lucide-react";

export function MarketingFooter() {
  return (
    <footer className="border-t border-border bg-navy-900 px-6 py-12 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col items-start justify-between gap-8 sm:flex-row">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-glacier-300 text-navy-900">
                <Snowflake className="h-4 w-4" />
              </div>
              <span className="text-lg font-bold">SNOWOLF</span>
            </div>
            <p className="mt-3 max-w-xs text-sm text-white/60">
              La plateforme intelligente pour créer et gérer vos annonces eBay
              en France.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            <div>
              <h4 className="mb-3 text-sm font-semibold">Produit</h4>
              <ul className="space-y-2 text-sm text-white/60">
                <li>
                  <Link href="/#tarifs" className="hover:text-white">
                    Tarifs
                  </Link>
                </li>
                <li>
                  <Link href="/signup" className="hover:text-white">
                    Inscription
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="mb-3 text-sm font-semibold">Compte</h4>
              <ul className="space-y-2 text-sm text-white/60">
                <li>
                  <Link href="/login" className="hover:text-white">
                    Connexion
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard" className="hover:text-white">
                    Tableau de bord
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="mb-3 text-sm font-semibold">Légal</h4>
              <ul className="space-y-2 text-sm text-white/60">
                <li>
                  <Link href="/privacy" className="hover:text-white">
                    Confidentialité
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white">
                    CGU
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-white/10 pt-8 text-center text-sm text-white/40">
          © {new Date().getFullYear()} SNOWOLF. Tous droits réservés.
        </div>
      </div>
    </footer>
  );
}
