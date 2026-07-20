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
    description: "Pour découvrir Smart Seller",
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
    <section className="border-t border-border/70 bg-background px-4 py-20 sm:px-6 sm:py-24" id="tarifs">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-navy-700">
            Tarifs
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Une formule adaptée à votre rythme
          </h2>
          <p className="mt-4 leading-7 text-muted-foreground">
            Commencez gratuitement, puis choisissez le volume qui correspond à
            votre activité.
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={cn(
                "relative flex flex-col border-border/80 shadow-sm",
                plan.highlighted && "border-primary/60 shadow-md ring-1 ring-primary/20"
              )}
            >
              {plan.highlighted && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap bg-primary text-primary-foreground">
                  Formule Pro
                </Badge>
              )}
              <CardHeader className="pb-4">
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="mt-4">
                  <span className="text-3xl font-bold tracking-tight">{plan.price}</span>
                  <span className="text-sm text-muted-foreground">{plan.period}</span>
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <ul className="space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-sm leading-5">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-navy-700" aria-hidden="true" />
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
                  <Link href={plan.href} aria-label={`${plan.cta}, formule ${plan.name}`}>
                    {plan.cta}
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
