/**
 * Héberge des images dans product-images + ad_images.
 * Utilisé par l'import URL et la réparation des annonces metadata-only.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import {
  prepareProductImages,
  type DedupedImage,
} from "@/lib/images/dedupe";
import { uploadProductImage } from "@/services/storage/images";

export type HostedAdImage = {
  id?: string;
  url: string;
  storage_path: string;
  ordre: number;
  est_principale: boolean;
};

export type EnsureAdImagesResult = {
  hosted: HostedAdImage[];
  skipped: number;
  errors: string[];
};

async function uploadPreparedImages(input: {
  userId: string;
  adId: string;
  images: DedupedImage[];
}): Promise<{ hosted: HostedAdImage[]; skipped: number; errors: string[] }> {
  const hosted: HostedAdImage[] = [];
  const errors: string[] = [];
  let skipped = 0;

  for (let index = 0; index < input.images.length; index++) {
    const image = input.images[index];
    if (!image?.buffer || !image.contentType) {
      skipped += 1;
      errors.push(`Image invalide ou inaccessible: ${image?.url ?? "?"}`);
      continue;
    }

    try {
      const uploaded = await uploadProductImage(
        input.userId,
        input.adId,
        image.buffer,
        image.contentType,
        `import-${index}`,
      );
      hosted.push({
        url: uploaded.publicUrl,
        storage_path: uploaded.path,
        ordre: hosted.length,
        est_principale: hosted.length === 0,
      });
      console.info("[ad-images] uploaded", {
        adId: input.adId,
        path: uploaded.path,
        bytes: image.buffer.byteLength,
        width: image.width,
        height: image.height,
      });
    } catch (err) {
      skipped += 1;
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Upload échoué: ${msg}`);
      console.error("[ad-images] upload failed", { adId: input.adId, msg });
    }
  }

  return { hosted, skipped, errors };
}

/**
 * Télécharge, valide, upload Supabase et insert dans ad_images.
 * Si des images préparées (avec buffer) sont fournies, elles sont utilisées directement.
 */
export async function ensureRemoteImagesOnAd(input: {
  userId: string;
  adId: string;
  urls?: string[];
  preparedImages?: DedupedImage[];
  /** Si true et qu'il y a déjà des images, ne fait rien (sauf si replace). */
  replace?: boolean;
}): Promise<EnsureAdImagesResult> {
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("ad_images")
    .select("id, url, storage_path, ordre, est_principale")
    .eq("ad_id", input.adId)
    .eq("user_id", input.userId)
    .order("ordre", { ascending: true });

  if (!input.replace && (existing?.length ?? 0) > 0) {
    return {
      hosted: (existing ?? []).map((row) => ({
        id: row.id,
        url: row.url,
        storage_path: row.storage_path ?? "",
        ordre: row.ordre,
        est_principale: row.est_principale,
      })),
      skipped: 0,
      errors: [],
    };
  }

  let images = input.preparedImages ?? [];
  if (!images.length && input.urls?.length) {
    const prepared = await prepareProductImages(input.urls, {
      max: 12,
      contentHash: true,
    });
    images = prepared.images;
    console.info("[ad-images] prepare", {
      adId: input.adId,
      input: input.urls.length,
      afterDedupe: prepared.afterContentDedupe,
      withBuffer: images.filter((i) => i.buffer).length,
    });
  }

  const { hosted, skipped, errors } = await uploadPreparedImages({
    userId: input.userId,
    adId: input.adId,
    images,
  });

  if (hosted.length === 0) {
    return { hosted: [], skipped, errors };
  }

  if (input.replace && (existing?.length ?? 0) > 0) {
    await admin
      .from("ad_images")
      .delete()
      .eq("ad_id", input.adId)
      .eq("user_id", input.userId);
  }

  const { data: inserted, error } = await admin
    .from("ad_images")
    .insert(
      hosted.map((row) => ({
        user_id: input.userId,
        ad_id: input.adId,
        url: row.url,
        storage_path: row.storage_path,
        ordre: row.ordre,
        est_principale: row.est_principale,
      })),
    )
    .select("id, url, storage_path, ordre, est_principale");

  if (error) {
    console.error("[ad-images] insert failed", error.message);
    errors.push(`Insertion ad_images: ${error.message}`);
    return { hosted: [], skipped, errors };
  }

  return {
    hosted: (inserted ?? []).map((row) => ({
      id: row.id,
      url: row.url,
      storage_path: row.storage_path ?? "",
      ordre: row.ordre,
      est_principale: row.est_principale,
    })),
    skipped,
    errors,
  };
}
