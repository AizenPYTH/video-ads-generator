import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../middleware/errorHandler";
import { searchApps, type AppStoreMatch } from "../services/appstore.service";
import type { ApiResponse } from "../types";

const router = Router();

const querySchema = z.object({
  term: z.string().trim().min(2).max(120),
  country: z
    .string()
    .trim()
    .regex(/^[a-zA-Z]{2}$/)
    .optional(),
});

/**
 * Looks an app up on the App Store so the user does not have to hunt for the
 * link themselves. Proxied rather than called from the browser: Apple's
 * search endpoint does not reliably send CORS headers. A failure answers
 * with an empty list rather than an error - the form falls back to a link
 * the user pastes.
 */
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { term, country } = querySchema.parse(req.query);
    const matches = await searchApps(term, country ?? "us");
    const payload: ApiResponse<{ matches: AppStoreMatch[] }> = {
      success: true,
      data: { matches },
    };
    res.json(payload);
  }),
);

export default router;
