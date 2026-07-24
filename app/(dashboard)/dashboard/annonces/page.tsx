import Link from "next/link";
import { Suspense } from "react";
import { FileUp, PlusCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { fetchAds } from "@/features/ads/queries";
import { fetchDashboardStats } from "@/features/dashboard/queries";
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
import { buildEbayListingUrl } from "@/services/ebay/listing-url";
import type { AdStatus } from "@/types/ads";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Mes annonces — Smart Seller",
};

type PageProps = {
  searchParams: Promise<{
    search?: string;
    group?: string;
    page?: string;
    sort?: string;
    ids?: string;
  }>;
};

async function AdsStatsStrip() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const stats = await fetchDashboardStats(user.id);
  const items = [
    { label: "Total", value: stats.totalAds, href: "/dashboard/annonces" },
    {
      label: "Brouillons",
      value: stats.drafts,
      href: "/dashboard/annonces?group=Brouillons",
    },
    {
      label: "Prêtes",
      value: stats.ready,
      href: "/dashboard/annonces?group=Prêtes",
    },
    {
      label: "Publiées",
      value: stats.published,
      href: "/dashboard/annonces?group=Publiées",
    },
    {
      label: "Erreurs",
      value: stats.errors,
      href: "/dashboard/annonces?group=Erreurs",
      danger: true,
    },
  ];

  return (
    <div
      className="flex flex-wrap divide-x divide-[var(--ss-border)] overflow-hidden rounded-[var(--ss-radius)] border border-[var(--ss-border)] bg-[var(--ss-surface)] shadow-[var(--ss-shadow-sm)]"
      role="region"
      aria-label="Synthèse des annonces"
    >
      {items.map((item) => (
        <Link
          key={item.label}
          href={item.href}
          className="min-w-[7.5rem] flex-1 px-4 py-3 transition-colors duration-150 hover:bg-[var(--ss-glacier-50)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--ss-glacier-500)]"
        >
          <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--ss-text-muted)]">
            {item.label}
          </p>
          <p
            className={cn(
              "mt-0.5 text-xl font-semibold tabular-nums tracking-tight",
              item.danger && item.value > 0
                ? "text-[var(--ss-danger)]"
                : "text-[var(--ss-text)]",
            )}
          >
            {item.value}
          </p>
        </Link>
      ))}
    </div>
  );
}

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

  const ids = (searchParams.ids ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((id) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        id,
      ),
    )
    .slice(0, 100);

  const { ads, totalPages, total } = await fetchAds(user.id, {
    search: searchParams.search,
    group,
    ids: ids.length > 0 ? ids : undefined,
    page,
    limit: ids.length > 0 ? Math.max(50, ids.length) : 50,
    sortBy,
  });

  if (ads.length === 0) {
    const filtered = Boolean(
      searchParams.search || searchParams.group || ids.length > 0,
    );
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
      <p className="text-sm text-[var(--ss-text-muted)]">
        {total} annonce{total > 1 ? "s" : ""} · page {page}/{totalPages || 1}
      </p>
      <AdsBulkBoard ads={rows} />

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
        <Skeleton key={i} className="h-16 w-full rounded-[var(--ss-radius)]" />
      ))}
    </div>
  );
}

export default async function AnnoncesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const idsCount = (params.ids ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title={idsCount > 0 ? "Produits importés" : "Mes annonces"}
        description={
          idsCount > 0
            ? `Affichage des ${idsCount} produit${idsCount > 1 ? "s" : ""} de cet import uniquement.`
            : "Gérez, enrichissez et publiez vos annonces eBay."
        }
      >
        {idsCount > 0 ? (
          <Button variant="outline" asChild>
            <Link href="/dashboard/annonces">Voir toutes les annonces</Link>
          </Button>
        ) : (
          <>
            <Button variant="outline" asChild>
              <Link href="/dashboard/creer/import">
                <FileUp className="mr-2 size-4" />
                Importer un fichier
              </Link>
            </Button>
            <Button asChild>
              <Link href="/dashboard/creer">
                <PlusCircle className="mr-2 size-4" />
                Créer une annonce
              </Link>
            </Button>
          </>
        )}
      </PageHeader>

      {idsCount === 0 ? (
        <Suspense
          fallback={
            <Skeleton className="h-[4.5rem] w-full rounded-[var(--ss-radius)]" />
          }
        >
          <AdsStatsStrip />
        </Suspense>
      ) : null}

      {idsCount === 0 ? (
        <Suspense fallback={<Skeleton className="h-10 w-full max-w-md" />}>
          <AdFilters />
        </Suspense>
      ) : null}

      <Suspense fallback={<AdsSkeleton />}>
        <AdsList searchParams={params} />
      </Suspense>
    </div>
  );
}
