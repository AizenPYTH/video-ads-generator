import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import { Pricing } from "@/components/marketing/pricing";

export const metadata = {
  title: "Tarifs — Smart Seller",
  description: "Découvrez les offres Smart Seller pour vendeurs eBay en France.",
};

export default function PricingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <MarketingNav />
      <main className="flex-1">
        <h1 className="sr-only">Tarifs Smart Seller</h1>
        <Pricing />
      </main>
      <MarketingFooter />
    </div>
  );
}
