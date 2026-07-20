"use client";

import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { getImportBatchStatus } from "@/features/imports/actions";

type ImportProgressProps = {
  batchId: string;
  onComplete?: () => void;
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Analyse en cours",
  PROCESSING: "Analyse en cours",
  COMPLETED: "Import terminé",
  FAILED: "Une erreur est survenue",
};

export function ImportProgress({ batchId, onComplete }: ImportProgressProps) {
  const [status, setStatus] = useState<{
    statut: string;
    nombre_lignes: number;
    lignes_traitees: number;
    lignes_reussies: number;
    lignes_echouees: number;
  } | null>(null);

  useEffect(() => {
    async function poll() {
      const result = await getImportBatchStatus(batchId);
      if (result.data) {
        setStatus(result.data);
        if (
          result.data.statut === "COMPLETED" ||
          result.data.statut === "FAILED" ||
          result.data.statut === "PARTIAL"
        ) {
          clearInterval(interval);
          onComplete?.();
        }
      }
    }

    const interval = setInterval(poll, 2000);
    poll();
    return () => clearInterval(interval);
  }, [batchId, onComplete]);

  if (!status) {
    return (
      <div className="space-y-3 rounded-xl border bg-card p-4" aria-busy="true">
        <div className="h-4 w-40 animate-pulse rounded bg-muted" />
        <div className="h-2 animate-pulse rounded-full bg-muted" />
        <p className="text-xs text-muted-foreground">
          Récupération de l’avancement…
        </p>
      </div>
    );
  }

  const percent =
    status.nombre_lignes > 0
      ? Math.round((status.lignes_traitees / status.nombre_lignes) * 100)
      : 0;
  const statusLabel =
    status.statut === "PARTIAL"
      ? `${status.lignes_echouees} ligne${status.lignes_echouees > 1 ? "s" : ""} à corriger`
      : STATUS_LABELS[status.statut] ?? "Analyse en cours";

  return (
    <div
      className="space-y-3 rounded-xl border bg-card p-4 shadow-xs"
      aria-live="polite"
      aria-busy={status.statut === "PENDING" || status.statut === "PROCESSING"}
    >
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium">
          {statusLabel}
        </span>
        <span className="tabular-nums text-muted-foreground">
          {status.lignes_traitees}/{status.nombre_lignes}
        </span>
      </div>
      <Progress value={percent} aria-label={`Progression : ${percent} %`} />
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
        <span>{percent} % terminé</span>
        <span>{status.lignes_reussies} réussies</span>
        <span>{status.lignes_echouees} échouées</span>
      </div>
    </div>
  );
}
