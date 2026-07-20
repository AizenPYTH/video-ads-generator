import { z } from "zod";
import { requireApiUser } from "@/lib/api/auth";
import { jsonErrorResponse } from "@/lib/errors/handler";
import { runPhotoAnalysisPipeline } from "@/features/ai/photo-analysis-pipeline";
import { createAd } from "@/features/ads/actions";

const bodySchema = z.object({
  photoUrls: z.array(z.string().url()).min(1).max(12),
  notes: z.string().max(2000).optional(),
  adId: z.string().uuid().optional(),
  searchMode: z.enum(["FAST", "DEEP"]).optional(),
});

export async function POST(request: Request) {
  try {
    const { user } = await requireApiUser();
    const body = bodySchema.parse(await request.json());

    let adId = body.adId;

    if (!adId) {
      const adResult = await createAd({ notes: body.notes });
      if (adResult.error || !adResult.data) {
        return Response.json(
          { error: { message: adResult.error ?? "Impossible de créer l'annonce." } },
          { status: 400 },
        );
      }
      adId = adResult.data.id;
    }

    const result = await runPhotoAnalysisPipeline({
      userId: user.id,
      photoUrls: body.photoUrls,
      notes: body.notes,
      adId,
      searchMode: body.searchMode,
    });

    return Response.json({
      adId,
      analyzedProductId: result.analyzedProductId,
      analysisRunId: result.analysisRunId,
      result: result.result,
    });
  } catch (error) {
    return jsonErrorResponse(error);
  }
}
