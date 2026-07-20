import { Suspense } from "react";
import { getSubscriptionInfo } from "@/features/billing/actions";
import { SubscriptionCard } from "@/features/billing/components/subscription-card";
import { UsageMeters } from "@/features/billing/components/usage-meter";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/server";
import { PLANS, PlanId } from "@/lib/billing/plans";

export const metadata = {
  title: "Abonnement — Smart Seller",
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
      <section aria-labelledby="utilisation-title">
        <div className="mb-4">
          <h2 id="utilisation-title" className="text-lg font-semibold">
            Utilisation ce mois-ci
          </h2>
          <p className="text-sm text-muted-foreground">
            Les compteurs sont remis à zéro au début de chaque mois.
          </p>
        </div>
        <UsageMeters quotas={quotas} />
      </section>
    </div>
  );
}

export default function AbonnementPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Abonnement"
        description="Consultez votre formule, votre utilisation et les options disponibles."
      />

      <Suspense
        fallback={
          <div className="space-y-6" aria-label="Chargement de l’abonnement">
            <Skeleton className="h-44 rounded-xl" />
            <div className="grid gap-4 md:grid-cols-3">
              <Skeleton className="h-44 rounded-xl" />
              <Skeleton className="h-44 rounded-xl" />
              <Skeleton className="h-44 rounded-xl" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Skeleton className="h-32 rounded-xl" />
              <Skeleton className="h-32 rounded-xl" />
              <Skeleton className="h-32 rounded-xl" />
              <Skeleton className="h-32 rounded-xl" />
            </div>
          </div>
        }
      >
        <SubscriptionContent />
      </Suspense>
    </div>
  );
}
