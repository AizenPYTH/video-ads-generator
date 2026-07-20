import { z } from "zod";
import { requireApiUser } from "@/lib/api/auth";
import { jsonErrorResponse } from "@/lib/errors/handler";
import { AppError } from "@/lib/errors/app-error";
import { fetchAdById } from "@/features/ads/queries";
import { updateAd } from "@/features/ads/actions";
import { generateEbayListing } from "@/services/ai/listing-generator";
import type { IdentificationResult } from "@/types/identification";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const bodySchema = z.object({
  marketplaceId: z.string().optional(),
  language: z.enum(["fr", "en", "de", "es", "it"]).optional(),
  tone: z.enum(["professional", "concise", "detailed"]).optional(),
});

export async function POST(request: Request, context: RouteContext) {
  try {
    const { user } = await requireApiUser();
    const { id } = await context.params;
    const body = bodySchema.parse(await request.json().catch(() => ({})));

    const ad = await fetchAdById(user.id, id);
    if (!ad) {
      throw AppError.notFound("Annonce introuvable.");
    }

    const identification = ad.resultat_identification as IdentificationResult | null;
    if (!identification) {
      throw AppError.validation("Aucune identification disponible pour générer l'annonce.");
    }

    const listing = await generateEbayListing({
      product: identification as unknown as Parameters<typeof generateEbayListing>[0]["product"],
      marketplaceId: body.marketplaceId,
      language: body.language,
      tone: body.tone,
    });

    await updateAd(id, {
      titre: listing.title,
      description: listing.description,
      prix_vente: listing.suggestedPrice?.toString() ?? ad.prix_vente,
      statut: identification.needsReview ? "NEEDS_REVIEW" : "READY",
    });

    return Response.json({ success: true, listing });
  } catch (error) {
    return jsonErrorResponse(error);
  }
}
