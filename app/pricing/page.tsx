import Link from "next/link";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import { Pricing } from "@/components/marketing/pricing";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Tarifs — SNOWOLF",
  description: "Découvrez les offres SNOWOLF pour vendeurs eBay en France.",
};

export default function PricingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <MarketingNav />
      <main className="flex-1">
        <section className="border-b border-border bg-muted/30 px-6 py-16 text-center">
          <h1 className="text-4xl font-bold text-navy-900">Nos tarifs</h1>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            Des formules adaptées à votre volume de ventes. Commencez
            gratuitement, évoluez quand vous êtes prêt.
          </p>
        </section>
        <Pricing />
        <section className="px-6 py-16 text-center">
          <p className="text-muted-foreground">
            Des questions sur les tarifs ?
          </p>
          <Button asChild variant="outline" className="mt-4">
            <Link href="/signup">Créer un compte gratuit</Link>
          </Button>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
