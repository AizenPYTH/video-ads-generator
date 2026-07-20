import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroCarousel } from "@/components/marketing/hero-carousel";
import { APP_NAME, BRAND_HERO_PATH } from "@/lib/brand";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-slate-50 to-white px-4 pb-20 pt-14 text-slate-900 sm:px-6 sm:pb-28 sm:pt-20">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_80%_0%,rgba(56,189,248,0.18),transparent_45%)]"
        aria-hidden="true"
      />

      <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1fr_1.05fr] lg:gap-14">
        <div className="text-center lg:text-left">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-600">
            {APP_NAME} · eBay France
          </p>

          <h1 className="mt-5 text-4xl font-bold tracking-[-0.03em] sm:text-5xl lg:text-[3.25rem] lg:leading-[1.08]">
            Vos produits.
            <br />
            <span className="bg-gradient-to-r from-blue-700 to-sky-500 bg-clip-text text-transparent">
              Des annonces prêtes
            </span>
            <br />
            à publier.
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-slate-600 sm:text-lg lg:mx-0">
            Photo, fichier ou lien produit : {APP_NAME} prépare vos fiches eBay
            et vous aide à publier plus vite.
          </p>

          <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row lg:justify-start">
            <Button size="lg" asChild className="w-full sm:w-auto">
              <Link href="/signup">
                Créer un compte
                <ArrowRight className="ml-1" aria-hidden="true" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              asChild
              className="w-full sm:w-auto"
            >
              <Link href="/login">J’ai déjà un compte</Link>
            </Button>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-xl">
          <div
            className="absolute -inset-6 rounded-[2rem] bg-sky-400/15 blur-3xl"
            aria-hidden="true"
          />
          <HeroCarousel
            slides={[
              {
                src: BRAND_HERO_PATH,
                alt: `Tableau de bord ${APP_NAME}`,
              },
            ]}
          />
        </div>
      </div>
    </section>
  );
}
