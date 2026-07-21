import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroCarousel } from "@/components/marketing/hero-carousel";
import { APP_NAME, BRAND_HERO_PATH } from "@/lib/brand";

export function Hero() {
  return (
    <section className="relative overflow-hidden px-4 pb-16 pt-12 sm:px-6 sm:pb-24 sm:pt-16">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_70%_-10%,var(--ss-glacier-200)_0%,transparent_55%),linear-gradient(180deg,var(--ss-glacier-50)_0%,var(--ss-surface)_70%)]"
        aria-hidden="true"
      />

      <div className="relative mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-16">
        <div className="text-center lg:text-left">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--ss-glacier-500)]">
            {APP_NAME}
          </p>

          <h1 className="mt-4 text-[2.35rem] font-semibold tracking-[-0.035em] text-[var(--ss-navy-800)] sm:text-5xl sm:leading-[1.08] lg:text-[3.15rem]">
            Créez, optimisez et publiez vos annonces eBay grâce à l’IA.
          </h1>

          <p className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-[var(--ss-text-muted)] sm:text-base lg:mx-0">
            Un espace unique pour préparer vos fiches produits et les publier
            sur eBay France — rapidement, proprement, en confiance.
          </p>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row lg:justify-start">
            <Button size="lg" variant="glacier" asChild className="w-full sm:w-auto">
              <Link href="/signup">
                Commencer
                <ArrowRight className="ml-1 size-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              asChild
              className="w-full sm:w-auto"
            >
              <Link href="/#fonctionnalites">Voir comment ça marche</Link>
            </Button>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-xl">
          <div
            className="absolute -inset-4 rounded-[var(--ss-radius)] bg-[var(--ss-glacier-300)]/25 blur-2xl"
            aria-hidden="true"
          />
          <div className="relative overflow-hidden rounded-[var(--ss-radius)] border border-[var(--ss-border)] bg-[var(--ss-surface)] shadow-[var(--ss-shadow-md)]">
            <HeroCarousel
              slides={[
                {
                  src: BRAND_HERO_PATH,
                  alt: `Aperçu ${APP_NAME}`,
                },
              ]}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
