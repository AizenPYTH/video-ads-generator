"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { uploadProductImage } from "@/services/storage/images";
import {
  generateMarketingImage,
  type MarketingGenerationLog,
} from "./generator";
import { APP_NAME } from "@/lib/brand";

export type MarketingImageActionResult<T = void> = {
  error?: string;
  success?: boolean;
  data?: T;
};

async function requireUserId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Non authentifié.");
  }

  return user.id;
}

export type MarketingPreviewData = {
  previewDataUrl: string;
  log: MarketingGenerationLog;
  title: string;
  price?: string;
};

export type MarketingCommitData = {
  imageUrl: string;
  imageId: string;
  adImageId: string;
};

/** Étape 1 : génère un aperçu PNG (base64) sans toucher à l'annonce. */
export async function previewMarketingImage(input: {
  adId: string;
  productImageUrl: string;
  storagePath?: string | null;
  title: string;
  price?: string;
  brand?: string;
  templateId?: string;
}): Promise<MarketingImageActionResult<MarketingPreviewData>> {
  try {
    const userId = await requireUserId();
    const supabase = await createClient();

    const { data: ad } = await supabase
      .from("ads")
      .select("id")
      .eq("id", input.adId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!ad) return { error: "Annonce introuvable." };

    if (!input.productImageUrl?.trim()) {
      return { error: "Aucune image principale disponible." };
    }

    let templateConfig: Record<string, unknown> | undefined;
    if (input.templateId) {
      const { data: template } = await supabase
        .from("marketing_templates")
        .select("contenu")
        .eq("id", input.templateId)
        .eq("user_id", userId)
        .maybeSingle();
      templateConfig = template?.contenu as Record<string, unknown> | undefined;
    } else {
      const { data: template } = await supabase
        .from("marketing_templates")
        .select("contenu")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      templateConfig = template?.contenu as Record<string, unknown> | undefined;
    }

    const { buffer, log } = await generateMarketingImage({
      productImageUrl: input.productImageUrl,
      storagePath: input.storagePath,
      title: input.title,
      price: input.price,
      brand: input.brand,
      template: templateConfig as Parameters<
        typeof generateMarketingImage
      >[0]["template"],
    });

    const previewDataUrl = `data:image/png;base64,${buffer.toString("base64")}`;

    return {
      success: true,
      data: {
        previewDataUrl,
        log,
        title: input.title,
        price: input.price,
      },
    };
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : `Échec de la génération ${APP_NAME}.`;
    console.error("[marketing] preview failed", message);
    return { error: message };
  }
}

/** @deprecated Utiliser previewMarketingImage */
export const previewSnowolfMarketingImage = previewMarketingImage;

/** Étape 2 : upload + ajout à l'annonce après validation de l'aperçu. */
export async function commitMarketingImage(input: {
  adId: string;
  previewDataUrl: string;
  title: string;
  templateId?: string;
}): Promise<MarketingImageActionResult<MarketingCommitData>> {
  try {
    const userId = await requireUserId();
    const supabase = await createClient();
    const admin = createAdminClient();

    const { data: ad } = await supabase
      .from("ads")
      .select("id")
      .eq("id", input.adId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!ad) return { error: "Annonce introuvable." };

    const match = input.previewDataUrl.match(/^data:image\/png;base64,(.+)$/);
    if (!match?.[1]) {
      return { error: "Aperçu invalide — régénérez l'image." };
    }

    const imageBuffer = Buffer.from(match[1], "base64");
    if (imageBuffer.byteLength < 1000) {
      return { error: "Aperçu invalide — fichier trop petit." };
    }

    const uploaded = await uploadProductImage(
      userId,
      input.adId,
      imageBuffer,
      "image/png",
      "marketing",
    );
    console.info("[marketing] upload Supabase OK", { path: uploaded.path });

    const { data: image, error } = await admin
      .from("marketing_images")
      .insert({
        user_id: userId,
        template_id: input.templateId ?? null,
        url: uploaded.publicUrl,
        storage_path: uploaded.path,
        type_image: "marketing",
      })
      .select("id, url")
      .single();

    if (error || !image) {
      console.error("[marketing] marketing_images insert", error?.message);
      return { error: "Impossible d'enregistrer l'image marketing." };
    }

    const { data: existing } = await admin
      .from("ad_images")
      .select("ordre")
      .eq("ad_id", input.adId)
      .eq("user_id", userId)
      .order("ordre", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextOrdre = (existing?.ordre ?? -1) + 1;
    const { data: adImage, error: attachError } = await admin
      .from("ad_images")
      .insert({
        user_id: userId,
        ad_id: input.adId,
        url: uploaded.publicUrl,
        storage_path: uploaded.path,
        ordre: nextOrdre,
        est_principale: false,
      })
      .select("id")
      .single();

    if (attachError || !adImage) {
      console.error("[marketing] ad_images attach", attachError?.message);
      return {
        error:
          "Image uploadée mais non ajoutée à l'annonce. Réessayez ou ajoutez-la manuellement.",
      };
    }

    console.info("[marketing] URL finale", {
      urlHost: new URL(uploaded.publicUrl).host,
      adImageId: adImage.id,
    });

    revalidatePath(`/dashboard/annonces/${input.adId}`);
    revalidatePath("/dashboard/annonces");
    return {
      success: true,
      data: {
        imageUrl: image.url,
        imageId: image.id,
        adImageId: adImage.id,
      },
    };
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : `Échec de l'enregistrement ${APP_NAME}.`;
    console.error("[marketing] commit failed", message);
    return { error: message };
  }
}

/** @deprecated Utiliser commitMarketingImage */
export const commitSnowolfMarketingImage = commitMarketingImage;

/** Compat : génère + enregistre en une étape (API). */
export async function generateAndStoreMarketingImage(input: {
  adId: string;
  productImageUrl: string;
  storagePath?: string | null;
  title: string;
  price?: string;
  brand?: string;
  templateId?: string;
  attachToAd?: boolean;
}): Promise<MarketingImageActionResult<{ imageUrl: string; imageId: string }>> {
  const preview = await previewMarketingImage(input);
  if (preview.error || !preview.data) {
    return { error: preview.error ?? "Échec de génération." };
  }

  if (input.attachToAd === false) {
    return {
      success: true,
      data: { imageUrl: preview.data.previewDataUrl, imageId: "preview" },
    };
  }

  const committed = await commitMarketingImage({
    adId: input.adId,
    previewDataUrl: preview.data.previewDataUrl,
    title: input.title,
    templateId: input.templateId,
  });

  if (committed.error || !committed.data) {
    return { error: committed.error ?? "Échec d'enregistrement." };
  }

  return {
    success: true,
    data: {
      imageUrl: committed.data.imageUrl,
      imageId: committed.data.imageId,
    },
  };
}
