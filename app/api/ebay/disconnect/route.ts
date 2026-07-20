import { z } from "zod";
import { requireApiUser } from "@/lib/api/auth";
import { jsonErrorResponse } from "@/lib/errors/handler";
import { disconnectEbay } from "@/features/ebay/actions";

const bodySchema = z.object({
  accountId: z.string().uuid(),
});

export async function POST(request: Request) {
  try {
    await requireApiUser();
    const body = bodySchema.parse(await request.json());

    const result = await disconnectEbay(body.accountId);

    if (result.error) {
      return Response.json(
        { error: { message: result.error } },
        { status: 400 },
      );
    }

    return Response.json({ success: true });
  } catch (error) {
    return jsonErrorResponse(error);
  }
}
