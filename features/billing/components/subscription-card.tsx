"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { openBillingPortal, startCheckout } from "@/features/billing/actions";
import { PlanId } from "@/lib/billing/plans";
import { toast } from "sonner";
import { useState } from "react";

type SubscriptionCardProps = {
  planName: string;
  statut: string;
  periodeFin: string | null;
};

export function SubscriptionCard({ planName, statut, periodeFin }: SubscriptionCardProps) {
  const [isLoading, setIsLoading] = useState(false);

  async function handleUpgrade(plan: string) {
    setIsLoading(true);
    const result = await startCheckout(plan);
    if (result?.error) toast.error(result.error);
    setIsLoading(false);
  }

  async function handlePortal() {
    setIsLoading(true);
    const result = await openBillingPortal();
    if (result?.error) toast.error(result.error);
    setIsLoading(false);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Abonnement</CardTitle>
          <Badge>{statut}</Badge>
        </div>
        <CardDescription>
          Plan actuel : <strong>{planName}</strong>
          {periodeFin && (
            <> — Renouvellement le {new Date(periodeFin).toLocaleDateString("fr-FR")}</>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          disabled={isLoading}
          onClick={() => handleUpgrade(PlanId.STARTER)}
        >
          Starter
        </Button>
        <Button
          variant="outline"
          disabled={isLoading}
          onClick={() => handleUpgrade(PlanId.PRO)}
        >
          Pro
        </Button>
        <Button
          variant="outline"
          disabled={isLoading}
          onClick={() => handleUpgrade(PlanId.BUSINESS)}
        >
          Business
        </Button>
        <Button variant="ghost" disabled={isLoading} onClick={handlePortal}>
          Gérer l&apos;abonnement
        </Button>
      </CardContent>
    </Card>
  );
}
