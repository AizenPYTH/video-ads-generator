"use client";

import { cn } from "@/lib/utils";

export type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";

const LABELS: Record<SaveStatus, string> = {
  idle: "",
  dirty: "Non enregistré",
  saving: "Enregistrement…",
  saved: "Enregistré",
  error: "Erreur",
};

export function SaveStatusIndicator({
  status,
  className,
}: {
  status: SaveStatus;
  className?: string;
}) {
  if (status === "idle") return null;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        status === "dirty" && "bg-amber-50 text-amber-800",
        status === "saving" && "bg-sky-50 text-sky-800",
        status === "saved" && "bg-emerald-50 text-emerald-800",
        status === "error" && "bg-red-50 text-red-800",
        className,
      )}
      aria-live="polite"
    >
      {LABELS[status]}
    </span>
  );
}
