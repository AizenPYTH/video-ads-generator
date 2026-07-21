import Link from "next/link";
import { Suspense } from "react";
import { PlusCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { fetchAds } from "@/features/ads/queries";
import { AdFilters } from "@/features/ads/components/ad-filters";
import { EmptyState } from "@/components/ads/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { type AdStatusGroup } from "@/features/ads/status";
import {
  AdsBulkBoard,
  type BulkAdRow,
} from "@/features/ads/components/bulk/ads-bulk-board";
import {
  buildEbayListingUrl,
  isEbaySandboxEnvironment,
} from "@/services/ebay/listing-url";
import type { AdStatus } from "@/types/ads";

export const metadata = {
  title: "Mes annonces — Smart Seller",
};

type PageProps = {
  searchParams: Promise<{
    search?: string;
    group?: string;
    page?: string;
    sort?: string;
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
  const sortBy =
    searchParams.sort === "titre"
      ? "titre"
      : searchParams.sort === "created_at"
        ? "created_at"
        : "updated_at";

  const { ads, totalPages, total } = await fetchAds(user.id, {
    search: searchParams.search,
    group,
    page,
    limit: 50,
    sortBy,
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
  const hasImage = new Set<string>();
  for (const image of imageRows ?? []) {
    hasImage.add(image.ad_id);
    if (image.est_principale || !imageByAd.has(image.ad_id)) {
      imageByAd.set(image.ad_id, image.url);
    }
  }

  const rows: BulkAdRow[] = ads.map((ad) => {
    const meta =
      ad.metadata && typeof ad.metadata === "object"
        ? (ad.metadata as Record<string, unknown>)
        : {};
    const categoryName =
      (typeof meta.category_name === "string" && meta.category_name) ||
      (meta.category_resolution &&
      typeof meta.category_resolution === "object" &&
      typeof (meta.category_resolution as { categoryName?: string }).categoryName ===
        "string"
        ? (meta.category_resolution as { categoryName: string }).categoryName
        : null);
    const listingId =
      typeof meta.ebay_listing_id === "string" ? meta.ebay_listing_id : null;
    const listingUrl =
      (typeof meta.ebay_listing_url === "string" && meta.ebay_listing_url) ||
      buildEbayListingUrl(listingId);
    const mpn =
      typeof meta.mpn === "string"
        ? meta.mpn
        : meta.item_specifics &&
            typeof meta.item_specifics === "object" &&
            typeof (meta.item_specifics as { MPN?: string }).MPN === "string"
          ? (meta.item_specifics as { MPN: string }).MPN
          : null;
    const metaImages = Array.isArray(meta.images)
      ? (meta.images as string[])
      : [];

    return {
      id: ad.id,
      titre: ad.titre,
      sku: ad.sku,
      prix_vente: ad.prix_vente != null ? String(ad.prix_vente) : null,
      quantite: ad.quantite ?? 1,
      statut: ad.statut as AdStatus,
      categoryName,
      imageUrl: imageByAd.get(ad.id) ?? metaImages[0] ?? null,
      hasImage: hasImage.has(ad.id) || metaImages.length > 0,
      mpn,
      listingUrl,
    };
  });

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {total} annonce{total > 1 ? "s" : ""} · page {page}/{totalPages || 1}
      </p>
      <AdsBulkBoard ads={rows} isSandbox={isEbaySandboxEnvironment()} />

      {totalPages > 1 && (
        <div className="flex flex-wrap justify-center gap-2 pt-2">
          {Array.from({ length: Math.min(totalPages, 20) }, (_, i) => i + 1).map(
            (p) => (
              <Button
                key={p}
                variant={p === page ? "default" : "outline"}
                size="sm"
                asChild
              >
                <Link
                  href={`/dashboard/annonces?page=${p}${searchParams.search ? `&search=${encodeURIComponent(searchParams.search)}` : ""}${searchParams.group ? `&group=${encodeURIComponent(searchParams.group)}` : ""}${searchParams.sort ? `&sort=${encodeURIComponent(searchParams.sort)}` : ""}`}
                >
                  {p}
                </Link>
              </Button>
            ),
          )}
        </div>
      )}
    </div>
  );
}

function AdsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full rounded-xl" />
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
        description="Gérez, enrichissez et publiez vos annonces en masse."
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
