import Link from "next/link";
import { ArrowRight, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-navy-900 px-6 py-24 text-white sm:py-32">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-navy-700/50 via-transparent to-transparent" />
      <div className="relative mx-auto max-w-5xl text-center">
        <Badge variant="glacier" className="mb-6">
          <Sparkles className="mr-1 h-3 w-3" />
          Propulsé par l&apos;IA
        </Badge>

        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
          Créez des annonces eBay{" "}
          <span className="text-glacier-300">intelligentes</span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg text-white/70">
          SNOWOLF analyse vos produits, génère des descriptions optimisées et
          publie vos annonces en quelques clics. Gagnez du temps, vendez plus.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button size="lg" asChild className="bg-glacier-300 text-navy-900 hover:bg-glacier-300/90">
            <Link href="/signup">
              Commencer gratuitement
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild className="border-white/20 text-white hover:bg-white/10">
            <Link href="/login">Se connecter</Link>
          </Button>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {[
            { icon: Zap, label: "Analyse IA", desc: "Identification automatique" },
            { icon: Sparkles, label: "Descriptions", desc: "Optimisées pour eBay" },
            { icon: ArrowRight, label: "Publication", desc: "En un clic" },
          ].map((feature) => (
            <div
              key={feature.label}
              className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm"
            >
              <feature.icon className="mb-3 h-6 w-6 text-glacier-300" />
              <h3 className="font-semibold">{feature.label}</h3>
              <p className="mt-1 text-sm text-white/60">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
