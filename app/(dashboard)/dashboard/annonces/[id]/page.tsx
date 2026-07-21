import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchAdById, fetchAdImages } from "@/features/ads/queries";
import { validateAdForPublish } from "@/features/ads/validation";
import { AdDetailEditor } from "@/features/ads/components/ad-detail-editor";
import { ensureRemoteImagesOnAd } from "@/features/ads/ensure-ad-images";
import { dedupeImageUrls } from "@/lib/images/dedupe";
import {
  buildEbayListingUrl,
  buildEbaySellerListingsUrl,
  isEbaySandboxEnvironment,
} from "@/services/ebay/listing-url";
import type { IdentificationResult } from "@/types/identification";
import type { Ad } from "@/types/ads";

export const metadata = {
  title: "Détail annonce — Smart Seller",
};

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AnnonceDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) notFound();

  const ad = await fetchAdById(user.id, id);
  if (!ad) notFound();

  let dbImages = await fetchAdImages(user.id, id);

  // Réparer les imports où les images n'étaient que dans metadata
  if (
    dbImages.length === 0 &&
    ad.metadata &&
    typeof ad.metadata === "object"
  ) {
    const metaImages =
      (ad.metadata as { images?: string[] }).images?.filter(Boolean) ?? [];
    if (metaImages.length > 0) {
      const ensure = await ensureRemoteImagesOnAd({
        userId: user.id,
        adId: id,
        urls: metaImages,
        replace: true,
      });
      console.info("[annonce-detail] promoted metadata images", {
        adId: id,
        hosted: ensure.hosted.length,
        errors: ensure.errors.slice(0, 3),
      });
      if (ensure.hosted.length > 0) {
        await supabase
          .from("ads")
          .update({
            metadata: {
              ...(ad.metadata as Record<string, unknown>),
              images: ensure.hosted.map((h) => h.url),
            },
          })
          .eq("id", id)
          .eq("user_id", user.id);
        dbImages = await fetchAdImages(user.id, id);
      }
    }
  }

  const uniqueDb = dedupeImageUrls(
    dbImages.map((i) => i.url),
    { max: 12 },
  );
  const byNorm = new Map(
    uniqueDb.map((u) => [u.normalizedKey, u.url] as const),
  );
  const seenKeys = new Set<string>();
  let images = dbImages.filter((img) => {
    const key = [...byNorm.entries()].find(([, url]) => url === img.url)?.[0];
    const k =
      key ??
      dedupeImageUrls([img.url])[0]?.normalizedKey ??
      img.url;
    if (seenKeys.has(k)) return false;
    seenKeys.add(k);
    return true;
  });

  if (images.length) {
    const hasPrimary = images.some((i) => i.est_principale);
    if (!hasPrimary) {
      images = images.map((i, idx) => ({
        ...i,
        est_principale: idx === 0,
      }));
    } else {
      let found = false;
      images = images.map((i) => {
        if (i.est_principale && !found) {
          found = true;
          return i;
        }
        return { ...i, est_principale: false };
      });
    }
  }

  const validation = validateAdForPublish({
    id: ad.id,
    user_id: ad.user_id,
    titre: ad.titre,
    description: ad.description,
    statut: ad.statut,
    resultat_identification:
      ad.resultat_identification as IdentificationResult | null,
    prix_achat: ad.prix_achat,
    prix_vente: ad.prix_vente,
    quantite: ad.quantite,
    sku: ad.sku,
    ebay_category_id: ad.ebay_category_id,
    ebay_condition_id: ad.ebay_condition_id,
    notes: ad.notes,
  } satisfies Ad);

  const meta =
    ad.metadata && typeof ad.metadata === "object"
      ? (ad.metadata as Record<string, unknown>)
      : {};

  const resolution =
    meta.category_resolution && typeof meta.category_resolution === "object"
      ? (meta.category_resolution as {
          status?: string;
          categoryId?: string | null;
          categoryName?: string | null;
          rootCategoryName?: string | null;
          subcategoryName?: string | null;
          categoryPath?: string[];
          confidence?: number;
          message?: string;
          alternatives?: Array<{
            categoryId: string;
            categoryName: string;
            confidence: number;
          }>;
        })
      : null;

  let listingId =
    (typeof meta.ebay_listing_id === "string" && meta.ebay_listing_id) ||
    null;

  if (!listingId && ad.statut === "PUBLISHED") {
    const { data: pub } = await supabase
      .from("listing_publications")
      .select("ebay_listing_id, url_annonce")
      .eq("ad_id", id)
      .eq("user_id", user.id)
      .eq("statut", "SUCCESS")
      .order("published_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    listingId = pub?.ebay_listing_id ?? null;
    if (typeof pub?.url_annonce === "string" && pub.url_annonce) {
      meta.ebay_listing_url = pub.url_annonce;
    }
  }

  const listingUrl =
    (typeof meta.ebay_listing_url === "string" && meta.ebay_listing_url) ||
    buildEbayListingUrl(listingId);

  return (
    <AdDetailEditor
      adId={id}
      initial={{
        titre: ad.titre ?? "",
        description: ad.description ?? "",
        // NUMERIC Postgres → number via PostgREST : toujours stringifier
        prix_vente:
          ad.prix_vente == null || ad.prix_vente === ""
            ? ""
            : String(ad.prix_vente),
        quantite: ad.quantite ?? 1,
        ebay_condition_id: ad.ebay_condition_id
          ? String(ad.ebay_condition_id)
          : "1000",
        ebay_category_id: ad.ebay_category_id
          ? String(ad.ebay_category_id)
          : "",
        sku: ad.sku ? String(ad.sku) : "",
        statut: ad.statut,
      }}
      images={images.map((i) => ({
        id: i.id,
        url: i.url,
        ordre: i.ordre,
        est_principale: i.est_principale,
        storage_path: i.storage_path ?? null,
      }))}
      resolution={resolution}
      validation={validation}
      currency={(meta.currency as string) || "EUR"}
      ebayListingId={listingId}
      ebayListingUrl={listingUrl}
      ebaySellerListingsUrl={buildEbaySellerListingsUrl()}
      isSandbox={isEbaySandboxEnvironment()}
    />
  );
}
