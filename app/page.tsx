import Link from "next/link";
import { ArrowRight, Camera, FileSpreadsheet, Link2, Sparkles } from "lucide-react";
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
      "Prenez une photo de votre produit et laissez SNOWOLF identifier marque, modèle et caractéristiques.",
  },
  {
    icon: FileSpreadsheet,
    title: "Import en masse",
    description:
      "Importez des centaines d'annonces depuis un fichier CSV ou Excel en quelques minutes.",
  },
  {
    icon: Link2,
    title: "Import depuis une URL",
    description:
      "Copiez le lien d'un produit existant et récupérez automatiquement les informations utiles.",
  },
  {
    icon: Sparkles,
    title: "Descriptions optimisées",
    description:
      "Des titres et descriptions pensés pour eBay France, prêts à publier en un clic.",
  },
];

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <MarketingNav />
      <main className="flex-1">
        <Hero />

        <section className="px-6 py-24" id="fonctionnalites">
          <div className="mx-auto max-w-6xl">
            <div className="text-center">
              <h2 className="text-3xl font-bold tracking-tight text-navy-900">
                Tout pour vendre plus vite sur eBay
              </h2>
              <p className="mt-4 text-muted-foreground">
                De la photo à l&apos;annonce publiée, SNOWOLF vous accompagne à
                chaque étape.
              </p>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-xl border border-border bg-card p-6 shadow-sm"
                >
                  <feature.icon className="mb-4 h-8 w-8 text-glacier-300" />
                  <h3 className="font-semibold text-navy-900">{feature.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <Pricing />

        <section className="bg-navy-900 px-6 py-20 text-white">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold">
              Prêt à transformer vos annonces eBay ?
            </h2>
            <p className="mt-4 text-white/70">
              Rejoignez SNOWOLF gratuitement et publiez votre première annonce
              en moins de 5 minutes.
            </p>
            <Button
              size="lg"
              asChild
              className="mt-8 bg-glacier-300 text-navy-900 hover:bg-glacier-300/90"
            >
              <Link href="/signup">
                Commencer gratuitement
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
