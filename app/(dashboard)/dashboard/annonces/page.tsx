import Link from "next/link";
import { Suspense } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { PlusCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { fetchAds } from "@/features/ads/queries";
import { AdFilters } from "@/features/ads/components/ad-filters";
import { AdCard } from "@/components/ads/ad-card";
import { EmptyState } from "@/components/ads/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toBadgeStatus } from "@/lib/ads/status-map";
import type { AdStatusGroup } from "@/features/ads/status";

export const metadata = {
  title: "Mes annonces — SNOWOLF",
};

type PageProps = {
  searchParams: Promise<{
    search?: string;
    group?: string;
    page?: string;
  }>;
};

async function AdsList({
  searchParams,
}: {
  searchParams: Awaited<PageProps["searchParams"]>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const page = Number(searchParams.page) || 1;
  const group = searchParams.group as AdStatusGroup | undefined;

  const { ads, totalPages } = await fetchAds(user.id, {
    search: searchParams.search,
    group,
    page,
    limit: 12,
  });

  if (ads.length === 0) {
    return (
      <EmptyState
        title="Aucune annonce"
        description="Créez votre première annonce pour commencer à vendre sur eBay."
        actionLabel="Créer une annonce"
        actionHref="/dashboard/creer"
      />
    );
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {ads.map((ad) => (
          <AdCard
            key={ad.id}
            id={ad.id}
            title={ad.titre ?? "Sans titre"}
            price={ad.prix_vente ? `${ad.prix_vente} €` : undefined}
            status={toBadgeStatus(ad.statut)}
            updatedAt={format(new Date(ad.updated_at), "d MMM yyyy", {
              locale: fr,
            })}
            href={`/dashboard/annonces/${ad.id}`}
          />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="mt-8 flex justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Button
              key={p}
              variant={p === page ? "default" : "outline"}
              size="sm"
              asChild
            >
              <Link
                href={`/dashboard/annonces?page=${p}${searchParams.search ? `&search=${searchParams.search}` : ""}${searchParams.group ? `&group=${searchParams.group}` : ""}`}
              >
                {p}
              </Link>
            </Button>
          ))}
        </div>
      )}
    </>
  );
}

function AdsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="aspect-[4/3] rounded-xl" />
      ))}
    </div>
  );
}

export default async function AnnoncesPage({ searchParams }: PageProps) {
  const params = await searchParams;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Mes annonces</h1>
          <p className="text-muted-foreground">
            Gérez et publiez vos annonces eBay
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/creer">
            <PlusCircle className="mr-2 h-4 w-4" />
            Nouvelle annonce
          </Link>
        </Button>
      </div>

      <Suspense fallback={<Skeleton className="h-10 w-full max-w-md" />}>
        <AdFilters />
      </Suspense>

      <Suspense fallback={<AdsSkeleton />}>
        <AdsList searchParams={params} />
      </Suspense>
    </div>
  );
}
