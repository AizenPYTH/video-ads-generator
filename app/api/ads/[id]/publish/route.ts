import { requireApiUser } from "@/lib/api/auth";
import { jsonErrorResponse } from "@/lib/errors/handler";
import { publishAd } from "@/features/ebay/publish";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  try {
    await requireApiUser();
    const { id } = await context.params;

    const result = await publishAd(id);

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
