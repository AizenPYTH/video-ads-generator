"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  bulkPublishAds,
  bulkValidateAds,
  type BulkPublishItemResult,
  type BulkValidateResult,
} from "@/features/ads/bulk-actions";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  adIds: string[];
  onDone?: () => void;
};

type Phase = "validate" | "confirm" | "running" | "done";

export function BulkPublishDialog({
  open,
  onOpenChange,
  adIds,
  onDone,
}: Props) {
  const [phase, setPhase] = useState<Phase>("validate");
  const [busy, setBusy] = useState(false);
  const [validation, setValidation] = useState<BulkValidateResult | null>(null);
  const [results, setResults] = useState<BulkPublishItemResult[]>([]);
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setBusy(true);
      setPhase("validate");
      setValidation(null);
      setResults([]);
      const result = await bulkValidateAds(adIds);
      if (cancelled) return;
      setBusy(false);
      if (result.error || !result.data) {
        toast.error(result.error ?? "Validation impossible.");
        onOpenChange(false);
        return;
      }
      setValidation(result.data);
      setPhase("confirm");
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, adIds.join(",")]);

  async function runPublish(ids: string[]) {
    if (!ids.length) {
      toast.error("Aucune annonce prête à publier.");
      return;
    }
    setBusy(true);
    setPhase("running");
    setProgress({ done: 0, total: ids.length });
    setResults([]);

    const result = await bulkPublishAds(ids);
    setBusy(false);

    if (result.error || !result.data) {
      toast.error(result.error ?? "Publication groupée échouée.");
      setPhase("confirm");
      return;
    }

    setResults(result.data.results);
    setProgress({
      done: result.data.results.length,
      total: result.data.results.length,
    });
    setPhase("done");

    const ok = result.data.results.filter((r) => r.success).length;
    const fail = result.data.results.length - ok;
    toast.success(`${ok} publiée(s), ${fail} échec(s).`);
    onDone?.();
  }

  function handleOpenChange(next: boolean) {
    if (busy) return;
    onOpenChange(next);
    if (!next) {
      setPhase("validate");
      setValidation(null);
      setResults([]);
    }
  }

  const readyCount = validation?.ready.length ?? 0;
  const blockedCount = validation?.blocked.length ?? 0;
  const failedIds = results.filter((r) => !r.success).map((r) => r.id);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Publication groupée</DialogTitle>
          <DialogDescription>
            Validation puis confirmation — aucune publication automatique.
          </DialogDescription>
        </DialogHeader>

        {(phase === "validate" || phase === "running") && busy ? (
          <p className="text-sm text-muted-foreground">
            {phase === "running"
              ? `Publication en cours… ${progress.done}/${progress.total || "…"}`
              : "Validation des annonces…"}
          </p>
        ) : null}

        {phase === "confirm" && validation ? (
          <div className="space-y-3 text-sm">
            <p>
              <strong>{adIds.length}</strong> sélectionnée(s) —{" "}
              <strong className="text-emerald-700">{readyCount}</strong> prêtes —{" "}
              <strong className="text-amber-700">{blockedCount}</strong> à
              corriger.
            </p>
            {blockedCount > 0 ? (
              <ul className="max-h-40 space-y-2 overflow-y-auto rounded-lg border bg-muted/30 p-3 text-xs">
                {validation.blocked.map((b) => (
                  <li key={b.id}>
                    <span className="font-medium">
                      {b.titre ?? b.sku ?? b.id.slice(0, 8)}
                    </span>
                    <ul className="mt-0.5 list-inside list-disc text-destructive">
                      {b.reasons.map((r) => (
                        <li key={r}>{r}</li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        {phase === "done" ? (
          <div className="space-y-3 text-sm">
            <p>
              Terminé : {results.filter((r) => r.success).length} OK /{" "}
              {results.filter((r) => !r.success).length} échec(s).
            </p>
            <ul className="max-h-48 space-y-1 overflow-y-auto rounded-lg border p-3 text-xs">
              {results.map((r) => (
                <li
                  key={r.id}
                  className={r.success ? "text-emerald-700" : "text-destructive"}
                >
                  {r.titre ?? r.id.slice(0, 8)} —{" "}
                  {r.success ? `OK ${r.listingId ?? ""}` : r.error}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => handleOpenChange(false)}
          >
            Fermer
          </Button>
          {phase === "confirm" ? (
            <LoadingButton
              loading={busy}
              disabled={!readyCount}
              onClick={() =>
                void runPublish(validation?.ready.map((r) => r.id) ?? [])
              }
            >
              Publier {readyCount} annonce{readyCount > 1 ? "s" : ""}
            </LoadingButton>
          ) : null}
          {phase === "done" && failedIds.length > 0 ? (
            <LoadingButton
              loading={busy}
              onClick={() => void runPublish(failedIds)}
            >
              Relancer les échecs ({failedIds.length})
            </LoadingButton>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
