import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const plans = [
  {
    name: "Gratuit",
    price: "0 €",
    period: "/mois",
    description: "Pour découvrir SNOWOLF",
    features: [
      "10 analyses par mois",
      "3 publications par mois",
      "2 imports CSV",
      "3 images par produit",
    ],
    cta: "Commencer",
    href: "/signup",
    highlighted: false,
  },
  {
    name: "Starter",
    price: "19 €",
    period: "/mois",
    description: "Pour les vendeurs occasionnels",
    features: [
      "100 analyses par mois",
      "25 publications par mois",
      "10 imports CSV",
      "Publication en masse (10)",
      "6 images par produit",
    ],
    cta: "Choisir Starter",
    href: "/signup?plan=starter",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "49 €",
    period: "/mois",
    description: "Pour les vendeurs actifs",
    features: [
      "500 analyses par mois",
      "150 publications par mois",
      "50 imports CSV",
      "Publication en masse (50)",
      "12 images par produit",
    ],
    cta: "Choisir Pro",
    href: "/signup?plan=pro",
    highlighted: true,
  },
  {
    name: "Business",
    price: "99 €",
    period: "/mois",
    description: "Pour les professionnels",
    features: [
      "2000 analyses par mois",
      "1000 publications par mois",
      "200 imports CSV",
      "Publication en masse (200)",
      "24 images par produit",
    ],
    cta: "Choisir Business",
    href: "/signup?plan=business",
    highlighted: false,
  },
];

export function Pricing() {
  return (
    <section className="bg-muted/30 px-6 py-24" id="tarifs">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-navy-900">
            Tarifs simples et transparents
          </h2>
          <p className="mt-4 text-muted-foreground">
            Choisissez le plan adapté à votre activité eBay
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={cn(
                "relative flex flex-col",
                plan.highlighted && "border-glacier-300 shadow-lg ring-2 ring-glacier-300"
              )}
            >
              {plan.highlighted && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-glacier-300 text-navy-900">
                  Populaire
                </Badge>
              )}
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="mt-4">
                  <span className="text-3xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <ul className="space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-glacier-300" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full"
                  variant={plan.highlighted ? "default" : "outline"}
                  asChild
                >
                  <Link href={plan.href}>{plan.cta}</Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
