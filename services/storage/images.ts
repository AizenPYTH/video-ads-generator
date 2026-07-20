import { createAdminClient } from "@/lib/supabase/admin";
import { AppError } from "@/lib/errors/app-error";

const BUCKET_NAME = "product-images";

export interface UploadedImage {
  path: string;
  publicUrl: string;
  bucket: string;
}

function getPublicUrl(path: string): string {
  const supabase = createAdminClient();
  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadProductImage(
  workspaceId: string,
  productId: string,
  file: Buffer,
  contentType: string,
  filename?: string,
): Promise<UploadedImage> {
  const supabase = createAdminClient();
  const ext = contentType.split("/")[1] ?? "jpg";
  const safeName = (filename ?? `image-${Date.now()}`).replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${workspaceId}/${productId}/${safeName}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(path, file, {
      contentType,
      upsert: true,
    });

  if (error) {
    throw AppError.internal("Failed to upload image", error);
  }

  return {
    path,
    publicUrl: getPublicUrl(path),
    bucket: BUCKET_NAME,
  };
}

export async function downloadProductImage(path: string): Promise<Buffer> {
  const supabase = createAdminClient();

  const { data, error } = await supabase.storage.from(BUCKET_NAME).download(path);

  if (error || !data) {
    throw AppError.notFound("Image not found");
  }

  return Buffer.from(await data.arrayBuffer());
}

export async function deleteProductImage(path: string): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase.storage.from(BUCKET_NAME).remove([path]);

  if (error) {
    throw AppError.internal("Failed to delete image", error);
  }
}

export async function listProductImages(
  workspaceId: string,
  productId: string,
): Promise<string[]> {
  const supabase = createAdminClient();
  const prefix = `${workspaceId}/${productId}`;

  const { data, error } = await supabase.storage.from(BUCKET_NAME).list(prefix);

  if (error) {
    throw AppError.internal("Failed to list images", error);
  }

  return (data ?? []).map((file) => `${prefix}/${file.name}`);
}

export function getImagePublicUrl(path: string): string {
  return getPublicUrl(path);
}
