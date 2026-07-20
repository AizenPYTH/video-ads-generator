import { requireApiUser } from "@/lib/api/auth";
import { jsonErrorResponse } from "@/lib/errors/handler";
import { AppError } from "@/lib/errors/app-error";
import { uploadProductImage } from "@/services/storage/images";

const MAX_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export async function POST(request: Request) {
  try {
    const { user } = await requireApiUser();
    const formData = await request.formData();
    const file = formData.get("file");
    const folder = (formData.get("folder") as string | null) ?? "uploads";
    const productId = (formData.get("productId") as string | null) ?? folder;

    if (!(file instanceof File)) {
      throw AppError.validation("Fichier image requis.");
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      throw AppError.validation("Format d'image non supporté.");
    }

    if (file.size > MAX_SIZE) {
      throw AppError.validation("L'image ne doit pas dépasser 10 Mo.");
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const uploaded = await uploadProductImage(
      user.id,
      productId,
      buffer,
      file.type,
      file.name,
    );

    return Response.json({
      success: true,
      url: uploaded.publicUrl,
      path: uploaded.path,
    });
  } catch (error) {
    return jsonErrorResponse(error);
  }
}
