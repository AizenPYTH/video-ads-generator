import { Router } from "express";
import { listTemplates } from "../../remotion/src/engine/registry";
import type { ApiResponse } from "../types";

const router = Router();

/**
 * The template library, minus the components. The frontend carries its own
 * copy of the registry for the gallery and the live preview; this lets it
 * confirm the backend renders the same set before offering one.
 */
router.get("/", (_req, res) => {
  const payload: ApiResponse<{ templates: ReturnType<typeof listTemplates> }> = {
    success: true,
    data: { templates: listTemplates() },
  };
  res.json(payload);
});

export default router;
