"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { uploadProductImage } from "@/services/storage/images";
import { generateMarketingImage } from "./generator";

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

export async function generateAndStoreMarketingImage(input: {
  adId: string;
  productImageUrl: string;
  title: string;
  price?: string;
  brand?: string;
  templateId?: string;
}): Promise<MarketingImageActionResult<{ imageUrl: string; imageId: string }>> {
  try {
    const userId = await requireUserId();
    const supabase = await createClient();

    let templateConfig;
    if (input.templateId) {
      const { data: template } = await supabase
        .from("marketing_templates")
        .select("contenu")
        .eq("id", input.templateId)
        .eq("user_id", userId)
        .maybeSingle();

      templateConfig = template?.contenu as Record<string, unknown> | undefined;
    }

    const imageBuffer = await generateMarketingImage({
      productImageUrl: input.productImageUrl,
      title: input.title,
      price: input.price,
      brand: input.brand,
      template: templateConfig as Parameters<typeof generateMarketingImage>[0]["template"],
    });

    const uploaded = await uploadProductImage(
      userId,
      input.adId,
      imageBuffer,
      "image/jpeg",
      "marketing",
    );

    const { data: image, error } = await supabase
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
      return { error: "Impossible d'enregistrer l'image marketing." };
    }

    revalidatePath(`/ads/${input.adId}`);
    return { success: true, data: { imageUrl: image.url, imageId: image.id } };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erreur inconnue." };
  }
}
