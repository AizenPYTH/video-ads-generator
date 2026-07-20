import { Suspense } from "react";
import { getSubscriptionInfo } from "@/features/billing/actions";
import { SubscriptionCard } from "@/features/billing/components/subscription-card";
import { UsageMeters } from "@/features/billing/components/usage-meter";
import { Pricing } from "@/components/marketing/pricing";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/server";
import { PLANS, PlanId } from "@/lib/billing/plans";

export const metadata = {
  title: "Abonnement — SNOWOLF",
};

async function SubscriptionContent() {
  const subResult = await getSubscriptionInfo();
  const sub = subResult.data ?? {
    planName: "Gratuit",
    statut: "ACTIVE",
    periode_fin: null,
  };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let quotas = [
    { label: "Analyses", used: 0, limit: PLANS[PlanId.FREE].quotas.analysesPerMonth },
    { label: "Publications", used: 0, limit: PLANS[PlanId.FREE].quotas.publicationsPerMonth },
    { label: "Imports", used: 0, limit: PLANS[PlanId.FREE].quotas.importsPerMonth },
    { label: "Imports URL", used: 0, limit: PLANS[PlanId.FREE].quotas.urlImportsPerMonth },
  ];

  if (user) {
    const period = new Date().toISOString().slice(0, 7);
    const { data: counters } = await supabase
      .from("usage_counters")
      .select("type_compteur, valeur, limite")
      .eq("user_id", user.id)
      .eq("periode", period);

    if (counters?.length) {
      const labelMap: Record<string, string> = {
        ANALYSES: "Analyses",
        PUBLICATIONS: "Publications",
        IMPORTS: "Imports",
        URL_IMPORTS: "Imports URL",
      };
      quotas = counters.map((c) => ({
        label: labelMap[c.type_compteur] ?? c.type_compteur,
        used: c.valeur,
        limit: c.limite ?? 0,
      }));
    }
  }

  return (
    <div className="space-y-8">
      <SubscriptionCard
        planName={sub.planName}
        statut={sub.statut}
        periodeFin={sub.periode_fin}
      />
      <div>
        <h2 className="mb-4 text-lg font-semibold">Utilisation ce mois-ci</h2>
        <UsageMeters quotas={quotas} />
      </div>
    </div>
  );
}

export default function AbonnementPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">Abonnement</h1>
        <p className="text-muted-foreground">
          Gérez votre formule et consultez votre utilisation
        </p>
      </div>

      <Suspense fallback={<Skeleton className="h-48 rounded-xl" />}>
        <SubscriptionContent />
      </Suspense>

      <div>
        <h2 className="mb-4 text-lg font-semibold">Toutes les formules</h2>
        <Pricing />
      </div>
    </div>
  );
}
