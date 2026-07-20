import { z } from "zod";
import { requireApiUser } from "@/lib/api/auth";
import { jsonErrorResponse } from "@/lib/errors/handler";
import { processImportBatch } from "@/features/imports/actions";

const bodySchema = z.object({
  batchId: z.string().uuid(),
});

export async function POST(request: Request) {
  try {
    await requireApiUser();
    const body = bodySchema.parse(await request.json());

    const result = await processImportBatch(body.batchId);

    if (result.error) {
      return Response.json(
        { error: { message: result.error } },
        { status: 400 },
      );
    }

    return Response.json({ success: true, data: result.data });
  } catch (error) {
    return jsonErrorResponse(error);
  }
}
