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
      "3 publications",
      "2 imports CSV",
    ],
    cta: "Commencer",
    href: "/signup",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "49 €",
    period: "/mois",
    description: "Pour les vendeurs actifs",
    features: [
      "500 analyses par mois",
      "150 publications",
      "50 imports CSV",
      "Publication en masse",
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
      "2 000 analyses",
      "1 000 publications",
      "200 imports CSV",
      "Volumes élevés",
    ],
    cta: "Choisir Business",
    href: "/signup?plan=business",
    highlighted: false,
  },
];

export function Pricing() {
  return (
    <section
      className="border-t border-[var(--ss-border)] bg-[var(--ss-surface)] px-4 py-20 sm:px-6 sm:py-24"
      id="tarifs"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-[-0.03em] text-[var(--ss-text)] sm:text-4xl">
            Des tarifs clairs, adaptés à votre volume
          </h2>
          <p className="mt-4 text-[var(--ss-text-muted)]">
            Commencez gratuitement, puis évoluez quand votre activité le
            demande.
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-5xl gap-5 md:grid-cols-3">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={cn(
                "relative flex flex-col",
                plan.highlighted &&
                  "border-[var(--ss-glacier-400)] shadow-[var(--ss-shadow-md)] ring-1 ring-[var(--ss-glacier-300)]/40",
              )}
            >
              {plan.highlighted && (
                <Badge
                  variant="glacier"
                  className="absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap"
                >
                  Recommandé
                </Badge>
              )}
              <CardHeader className="pb-4">
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="mt-4">
                  <span className="text-3xl font-semibold tracking-tight text-[var(--ss-text)]">
                    {plan.price}
                  </span>
                  <span className="text-sm text-[var(--ss-text-muted)]">
                    {plan.period}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <ul className="space-y-3">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2.5 text-sm leading-5 text-[var(--ss-text)]"
                    >
                      <Check
                        className="mt-0.5 size-4 shrink-0 text-[var(--ss-glacier-500)]"
                        aria-hidden="true"
                      />
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full"
                  variant={plan.highlighted ? "glacier" : "outline"}
                  asChild
                >
                  <Link
                    href={plan.href}
                    aria-label={`${plan.cta}, formule ${plan.name}`}
                  >
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
