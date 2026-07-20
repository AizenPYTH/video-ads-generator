import { z } from "zod";
import { requireApiUser } from "@/lib/api/auth";
import { jsonErrorResponse } from "@/lib/errors/handler";
import { importProductFromUrl } from "@/features/url-import/actions";
import { validateUrl } from "@/lib/validation/url";

const bodySchema = z.object({
  url: z
    .string()
    .trim()
    .min(1, "URL requise")
    .refine((value) => {
      try {
        validateUrl(value);
        return true;
      } catch {
        return false;
      }
    }, "URL invalide ou bloquée"),
});

export async function POST(request: Request) {
  try {
    await requireApiUser();
    const body = bodySchema.parse(await request.json());

    const result = await importProductFromUrl(body.url);

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
