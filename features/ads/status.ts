import type { AdStatus } from "@/types/ads";
import { AD_STATUS_LABELS } from "@/types/ads";
import { statusLabelFr } from "./recalculate-status";

export type AdStatusGroup =
  | "Brouillons"
  | "Prêtes"
  | "Publiées"
  | "À vérifier"
  | "Erreurs";

export const AD_STATUS_GROUPS: Record<AdStatusGroup, AdStatus[]> = {
  Brouillons: ["DRAFT", "ANALYZING"],
  Prêtes: ["READY", "SENDING_TO_EBAY"],
  Publiées: ["PUBLISHED", "ENDED"],
  "À vérifier": ["NEEDS_REVIEW"],
  Erreurs: ["FAILED"],
};

const STATUS_TO_GROUP = new Map<AdStatus, AdStatusGroup>(
  Object.entries(AD_STATUS_GROUPS).flatMap(([group, statuses]) =>
    statuses.map((status) => [status, group as AdStatusGroup]),
  ),
);

export function getStatusLabel(status: AdStatus): string {
  return statusLabelFr(status) || AD_STATUS_LABELS[status];
}

export function getStatusGroup(status: AdStatus): AdStatusGroup | null {
  return STATUS_TO_GROUP.get(status) ?? null;
}

export function getStatusesForGroup(group: AdStatusGroup): AdStatus[] {
  return AD_STATUS_GROUPS[group];
}

export function isPublishableStatus(status: AdStatus): boolean {
  return status === "READY";
}

export function isEditableStatus(status: AdStatus): boolean {
  return ["DRAFT", "NEEDS_REVIEW", "READY", "FAILED"].includes(status);
}
