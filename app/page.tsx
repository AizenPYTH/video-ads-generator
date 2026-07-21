import Link from "next/link";
import {
  Camera,
  FileSpreadsheet,
  Sparkles,
  Store,
} from "lucide-react";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import { Hero } from "@/components/marketing/hero";
import { Pricing } from "@/components/marketing/pricing";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const features = [
  {
    icon: Sparkles,
    title: "Création assistée par IA",
    description:
      "À partir de photos, Smart Seller propose titre, catégorie et fiche structurée.",
    accent: "from-[var(--ss-navy-800)] to-[var(--ss-navy-700)]",
    preview: (
      <div className="mt-5 space-y-2 rounded-md bg-[var(--ss-surface-muted)] p-3">
        <div className="h-2 w-3/4 rounded bg-[var(--ss-glacier-300)]/50" />
        <div className="h-2 w-1/2 rounded bg-[var(--ss-border)]" />
        <div className="flex gap-2 pt-1">
          <span className="rounded bg-[var(--ss-glacier-100)] px-2 py-0.5 text-[10px] font-medium text-[var(--ss-navy-700)]">
            Titre
          </span>
          <span className="rounded bg-[var(--ss-glacier-100)] px-2 py-0.5 text-[10px] font-medium text-[var(--ss-navy-700)]">
            Catégorie
          </span>
        </div>
      </div>
    ),
  },
  {
    icon: FileSpreadsheet,
    title: "Import CSV en masse",
    description:
      "Importez un catalogue entier, contrôlez les lignes, puis publiez par lots.",
    accent: "from-[var(--ss-glacier-500)] to-[var(--ss-glacier-400)]",
    preview: (
      <div className="mt-5 overflow-hidden rounded-md border border-[var(--ss-border)] text-[10px]">
        <div className="grid grid-cols-3 bg-[var(--ss-navy-800)] px-2 py-1.5 font-medium text-white">
          <span>SKU</span>
          <span>Prix</span>
          <span>Stock</span>
        </div>
        {["A-102", "B-220", "C-018"].map((sku) => (
          <div
            key={sku}
            className="grid grid-cols-3 border-t border-[var(--ss-border)] px-2 py-1.5 font-mono text-[var(--ss-text-muted)]"
          >
            <span>{sku}</span>
            <span>24,90</span>
            <span>3</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: Camera,
    title: "Optimisation des annonces",
    description:
      "Images, prix, stock et statuts : tout se corrige dans une vue de gestion claire.",
    accent: "from-[var(--ss-navy-700)] to-[var(--ss-glacier-500)]",
    preview: (
      <div className="mt-5 flex items-end gap-1.5">
        {[40, 65, 48, 82, 70].map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-t bg-[var(--ss-glacier-300)]/70"
            style={{ height: h }}
            aria-hidden
          />
        ))}
      </div>
    ),
  },
  {
    icon: Store,
    title: "Publication eBay automatisée",
    description:
      "Connectez votre compte vendeur et publiez vos annonces prêtes en quelques clics.",
    accent: "from-[var(--ss-glacier-400)] to-[var(--ss-navy-800)]",
    preview: (
      <div className="mt-5 flex items-center gap-3 rounded-md border border-[var(--ss-success)]/25 bg-[var(--ss-success-bg)] px-3 py-2.5">
        <span className="size-2 rounded-full bg-[var(--ss-success)]" />
        <span className="text-xs font-medium text-[var(--ss-success)]">
          Compte eBay synchronisé
        </span>
      </div>
    ),
  },
];

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--ss-surface)]">
      <MarketingNav />
      <main className="flex-1">
        <Hero />

        <section
          className="px-4 py-16 sm:px-6 sm:py-20"
          id="fonctionnalites"
        >
          <div className="mx-auto max-w-6xl">
            <div className="max-w-2xl">
              <h2 className="text-3xl font-semibold tracking-[-0.03em] text-[var(--ss-text)] sm:text-4xl">
                Tout le parcours vendeur, sans friction
              </h2>
              <p className="mt-3 text-[var(--ss-text-muted)]">
                Quatre capacités fortes — chacune avec un rôle clair dans votre
                quotidien.
              </p>
            </div>

            <div className="mt-10 grid gap-5 sm:grid-cols-2">
              {features.map((feature, index) => (
                <article
                  key={feature.title}
                  className={cn(
                    "rounded-[var(--ss-radius)] border border-[var(--ss-border)] bg-[var(--ss-surface)] p-6 shadow-[var(--ss-shadow-sm)] transition-shadow duration-200 hover:shadow-[var(--ss-shadow-md)]",
                    index === 0 && "sm:row-span-1",
                  )}
                >
                  <div
                    className={cn(
                      "mb-4 inline-flex size-11 items-center justify-center rounded-lg bg-gradient-to-br text-white",
                      feature.accent,
                    )}
                  >
                    <feature.icon className="size-5" aria-hidden="true" />
                  </div>
                  <h3 className="text-lg font-semibold text-[var(--ss-text)]">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--ss-text-muted)]">
                    {feature.description}
                  </p>
                  {feature.preview}
                </article>
              ))}
            </div>
          </div>
        </section>

        <Pricing />

        <section className="bg-[var(--ss-navy-950)] px-4 py-16 text-white sm:px-6 sm:py-20">
          <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Prêt à publier plus vite sur eBay ?
            </h2>
            <p className="mt-3 max-w-lg text-sm leading-6 text-white/65 sm:text-base">
              Créez votre compte et connectez votre compte vendeur en quelques
              minutes.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" variant="glacier" asChild>
                <Link href="/signup">Commencer</Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="border-white/25 bg-transparent text-white hover:bg-white/10"
              >
                <Link href="/login">Connexion</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
