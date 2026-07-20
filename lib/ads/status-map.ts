import type { AdStatut } from "@/types/database";
import type { AdStatus } from "@/components/ads/status-badge";

const STATUS_MAP: Record<AdStatut, AdStatus> = {
  DRAFT: "draft",
  ANALYZING: "analyzing",
  NEEDS_REVIEW: "draft",
  READY: "ready",
  VALIDATING: "analyzing",
  INVENTORY_CREATED: "publishing",
  OFFER_CREATED: "publishing",
  PUBLISHING: "publishing",
  PUBLISHED: "published",
  FAILED: "failed",
  ARCHIVED: "archived",
  ENDED: "archived",
  SENDING_TO_EBAY: "publishing",
};

export function toBadgeStatus(statut: AdStatut): AdStatus {
  return STATUS_MAP[statut] ?? "draft";
}
