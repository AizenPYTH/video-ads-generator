"use client";

import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { getImportBatchStatus } from "@/features/imports/actions";

type ImportProgressProps = {
  batchId: string;
  onComplete?: () => void;
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

  if (!status) return null;

  const percent =
    status.nombre_lignes > 0
      ? Math.round((status.lignes_traitees / status.nombre_lignes) * 100)
      : 0;

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span>Traitement : {status.statut}</span>
        <span>
          {status.lignes_traitees}/{status.nombre_lignes}
        </span>
      </div>
      <Progress value={percent} />
      <div className="flex gap-4 text-sm text-muted-foreground">
        <span>{status.lignes_reussies} réussies</span>
        <span>{status.lignes_echouees} échouées</span>
      </div>
    </div>
  );
}
