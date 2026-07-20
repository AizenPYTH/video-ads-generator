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
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toBadgeStatus } from "@/lib/ads/status-map";
import { getStatusLabel, type AdStatusGroup } from "@/features/ads/status";

export const metadata = {
  title: "Mes annonces — Smart Seller",
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
    const filtered = Boolean(searchParams.search || searchParams.group);
    return (
      <EmptyState
        title={filtered ? "Aucune annonce trouvée" : "Aucune annonce"}
        description={
          filtered
            ? "Essayez une autre recherche ou affichez toutes vos annonces."
            : "Créez votre première annonce pour commencer à vendre sur eBay."
        }
        actionLabel={filtered ? "Voir toutes les annonces" : "Créer une annonce"}
        actionHref={filtered ? "/dashboard/annonces" : "/dashboard/creer"}
      />
    );
  }

  const { data: imageRows } = await supabase
    .from("ad_images")
    .select("ad_id, url, ordre, est_principale")
    .eq("user_id", user.id)
    .in(
      "ad_id",
      ads.map((ad) => ad.id),
    )
    .order("ordre", { ascending: true });

  const imageByAd = new Map<string, string>();
  for (const image of imageRows ?? []) {
    if (image.est_principale || !imageByAd.has(image.ad_id)) {
      imageByAd.set(image.ad_id, image.url);
    }
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {ads.map((ad) => {
          const metadata =
            ad.metadata && typeof ad.metadata === "object"
              ? (ad.metadata as { images?: string[] })
              : null;
          return (
            <AdCard
              key={ad.id}
              id={ad.id}
              title={ad.titre ?? "Sans titre"}
              price={ad.prix_vente ? `${ad.prix_vente} €` : undefined}
              imageUrl={imageByAd.get(ad.id) ?? metadata?.images?.[0]}
              status={toBadgeStatus(ad.statut)}
              statusLabel={getStatusLabel(ad.statut)}
              updatedAt={format(new Date(ad.updated_at), "d MMM yyyy", {
                locale: fr,
              })}
              href={`/dashboard/annonces/${ad.id}`}
            />
          );
        })}
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
        <div key={i} className="overflow-hidden rounded-xl border">
          <Skeleton className="aspect-[4/3] rounded-none" />
          <div className="space-y-3 p-4">
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default async function AnnoncesPage({ searchParams }: PageProps) {
  const params = await searchParams;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mes annonces"
        description="Retrouvez, complétez et publiez vos annonces."
      >
        <Button asChild>
          <Link href="/dashboard/creer">
            <PlusCircle className="mr-2 h-4 w-4" />
            Nouvelle annonce
          </Link>
        </Button>
      </PageHeader>

      <Suspense fallback={<Skeleton className="h-10 w-full max-w-md" />}>
        <AdFilters />
      </Suspense>

      <Suspense fallback={<AdsSkeleton />}>
        <AdsList searchParams={params} />
      </Suspense>
    </div>
  );
}
