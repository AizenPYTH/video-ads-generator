import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../middleware/errorHandler";
import { logger } from "../utils/logger";
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

export interface AppStoreMatch {
  name: string;
  appStoreUrl: string;
  icon: string | null;
  publisher: string;
}

interface ItunesResult {
  trackName?: unknown;
  trackViewUrl?: unknown;
  artworkUrl100?: unknown;
  artistName?: unknown;
}

const SEARCH_TIMEOUT_MS = 6000;

/**
 * Looks an app up on the App Store so the user does not have to hunt for the
 * link themselves.
 *
 * Proxied rather than called from the browser: Apple's search endpoint does
 * not reliably send CORS headers, and going through the API also keeps the
 * timeout and the result shape under our control.
 *
 * A failure here is never fatal - the form falls back to a link the user
 * pastes, so this answers with an empty list rather than an error.
 */
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { term, country } = querySchema.parse(req.query);

    const url = new URL("https://itunes.apple.com/search");
    url.searchParams.set("term", term);
    url.searchParams.set("media", "software");
    url.searchParams.set("limit", "5");
    url.searchParams.set("country", country ?? "us");

    let matches: AppStoreMatch[] = [];
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(SEARCH_TIMEOUT_MS),
      });
      if (!response.ok) throw new Error(`itunes responded ${response.status}`);

      const body = (await response.json()) as { results?: unknown };
      const results = Array.isArray(body.results) ? body.results : [];
      matches = results
        .map((item) => item as ItunesResult)
        .filter(
          (item): item is ItunesResult & { trackViewUrl: string; trackName: string } =>
            typeof item.trackViewUrl === "string" &&
            typeof item.trackName === "string",
        )
        .map((item) => ({
          name: item.trackName,
          appStoreUrl: item.trackViewUrl,
          icon: typeof item.artworkUrl100 === "string" ? item.artworkUrl100 : null,
          publisher: typeof item.artistName === "string" ? item.artistName : "",
        }));
    } catch (error) {
      logger.warn({ error, term }, "app store lookup failed");
    }

    const payload: ApiResponse<{ matches: AppStoreMatch[] }> = {
      success: true,
      data: { matches },
    };
    res.json(payload);
  }),
);

export default router;
