import { z } from "zod";
import { requireApiUser } from "@/lib/api/auth";
import { jsonErrorResponse } from "@/lib/errors/handler";
import { generateAndStoreMarketingImage } from "@/features/marketing-images/actions";

const bodySchema = z.object({
  adId: z.string().uuid(),
  productImageUrl: z.string().url(),
  title: z.string().min(1).max(200),
  price: z.string().optional(),
  brand: z.string().optional(),
  templateId: z.string().uuid().optional(),
});

export async function POST(request: Request) {
  try {
    await requireApiUser();
    const body = bodySchema.parse(await request.json());

    const result = await generateAndStoreMarketingImage(body);

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
