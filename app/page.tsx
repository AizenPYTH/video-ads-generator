import Link from "next/link";
import { Camera, FileSpreadsheet, Link2, Sparkles } from "lucide-react";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import { Hero } from "@/components/marketing/hero";
import { Pricing } from "@/components/marketing/pricing";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: Camera,
    title: "Analyse par photo",
    description:
      "Identifiez le produit et préparez la fiche à partir de vos photos.",
  },
  {
    icon: FileSpreadsheet,
    title: "Import en masse",
    description: "CSV ou Excel : plusieurs annonces en une passe.",
  },
  {
    icon: Link2,
    title: "Import depuis une URL",
    description:
      "Reprenez titre, prix et images du produit — sans les suggestions.",
  },
  {
    icon: Sparkles,
    title: "Visuel Smart Seller",
    description:
      "Générez un cadre premium autour de votre photo produit.",
  },
];

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#f4f7fb]">
      <MarketingNav />
      <main className="flex-1">
        <Hero />

        <section
          className="px-4 py-20 sm:px-6 sm:py-24"
          id="fonctionnalites"
        >
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-navy-700">
                Workflow vendeur
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-navy-900 sm:text-4xl">
                Trois entrées. Une annonce propre.
              </h2>
              <p className="mt-4 leading-7 text-slate-600">
                Photos, catalogue ou URL — puis relecture et publication eBay.
              </p>
            </div>

            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm"
                >
                  <span className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-[#0b1f36] text-sky-300">
                    <feature.icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="font-semibold text-navy-900">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <Pricing />

        <section className="bg-[#0b1f36] px-4 py-16 text-white sm:px-6 sm:py-20">
          <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Prêt à publier sous votre marque ?
            </h2>
            <p className="mt-3 max-w-lg text-sm leading-6 text-white/65 sm:text-base">
              Un compte suffit. La formule gratuite permet de tester le flux
              complet.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button
                size="lg"
                asChild
                className="bg-sky-300 text-navy-900 hover:bg-sky-200"
              >
                <Link href="/signup">Créer un compte</Link>
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
