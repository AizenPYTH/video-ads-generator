"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { openBillingPortal, startCheckout } from "@/features/billing/actions";
import { PlanId } from "@/lib/billing/plans";
import { toast } from "sonner";
import { useState } from "react";
import { ArrowUpRight, CheckCircle2, CreditCard, Loader2 } from "lucide-react";

type SubscriptionCardProps = {
  planName: string;
  statut: string;
  periodeFin: string | null;
};

export function SubscriptionCard({ planName, statut, periodeFin }: SubscriptionCardProps) {
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const statusLabels: Record<string, string> = {
    ACTIVE: "Actif",
    TRIALING: "Période d’essai",
    PAST_DUE: "Paiement en retard",
    CANCELED: "Résilié",
    UNPAID: "Impayé",
    INCOMPLETE: "Paiement à terminer",
    INCOMPLETE_EXPIRED: "Paiement expiré",
    PAUSED: "En pause",
  };
  const statusLabel = statusLabels[statut] ?? "État indisponible";
  const statusVariant =
    statut === "ACTIVE" || statut === "TRIALING"
      ? "glacier"
      : statut === "PAUSED" || statut === "CANCELED"
        ? "secondary"
        : "destructive";
  const offers = [
    { id: PlanId.STARTER, name: "Starter", price: "19 €", detail: "100 analyses / mois" },
    { id: PlanId.PRO, name: "Pro", price: "49 €", detail: "500 analyses / mois" },
    {
      id: PlanId.BUSINESS,
      name: "Business",
      price: "99 €",
      detail: "2 000 analyses / mois",
    },
  ];

  async function handleUpgrade(plan: string) {
    setActiveAction(plan);
    try {
      const result = await startCheckout(plan);
      if (result?.error) toast.error(result.error);
    } finally {
      setActiveAction(null);
    }
  }

  async function handlePortal() {
    setActiveAction("portal");
    try {
      const result = await openBillingPortal();
      if (result?.error) toast.error(result.error);
    } finally {
      setActiveAction(null);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardDescription>Formule actuelle</CardDescription>
              <CardTitle className="mt-1">{planName}</CardTitle>
            </div>
            <Badge variant={statusVariant}>{statusLabel}</Badge>
          </div>
          <CardDescription className="flex items-center gap-2 pt-2">
            <CheckCircle2
              className="h-4 w-4 shrink-0 text-emerald-600"
              aria-hidden="true"
            />
            {periodeFin && (
              <>
                Prochaine échéance le{" "}
                {new Date(periodeFin).toLocaleDateString("fr-FR")}
              </>
            )}
            {!periodeFin &&
              "Votre formule est disponible sans échéance de renouvellement."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            disabled={activeAction !== null}
            onClick={handlePortal}
          >
            {activeAction === "portal" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <CreditCard className="mr-2 h-4 w-4" aria-hidden="true" />
            )}
            Gérer l&apos;abonnement
          </Button>
        </CardContent>
      </Card>

      <section aria-labelledby="formules-title">
        <div className="mb-4">
          <h2 id="formules-title" className="text-lg font-semibold">
            Changer de formule
          </h2>
          <p className="text-sm text-muted-foreground">
            Choisissez le volume adapté à votre activité. Tarifs mensuels.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {offers.map((offer) => (
            <Card key={offer.id}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{offer.name}</CardTitle>
                <div>
                  <span className="text-2xl font-bold">{offer.price}</span>
                  <span className="text-sm text-muted-foreground"> / mois</span>
                </div>
                <CardDescription>{offer.detail}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  className="w-full"
                  variant={offer.id === PlanId.PRO ? "default" : "outline"}
                  disabled={activeAction !== null}
                  onClick={() => handleUpgrade(offer.id)}
                >
                  {activeAction === offer.id ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <ArrowUpRight className="mr-2 h-4 w-4" aria-hidden="true" />
                  )}
                  Choisir {offer.name}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
