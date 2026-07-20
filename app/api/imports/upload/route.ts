import { requireApiUser } from "@/lib/api/auth";
import { jsonErrorResponse } from "@/lib/errors/handler";
import { AppError } from "@/lib/errors/app-error";
import { createImportBatch } from "@/features/imports/actions";

export async function POST(request: Request) {
  try {
    await requireApiUser();

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      throw AppError.validation("Fichier requis.");
    }

    const isXlsx = file.name.toLowerCase().endsWith(".xlsx");
    const content = isXlsx
      ? await file.arrayBuffer()
      : await file.text();

    const result = await createImportBatch(file.name, content);

    if (result.error) {
      return Response.json(
        { error: { message: result.error } },
        { status: 400 },
      );
    }

    return Response.json({ success: true, batchId: result.data?.batchId });
  } catch (error) {
    return jsonErrorResponse(error);
  }
}
