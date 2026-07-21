"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  executeTestDataCleanup,
  previewTestDataCleanup,
  type TestDataPreview,
} from "@/features/settings/cleanup-actions";

const CONFIRM_PHRASE = "SUPPRIMER LES DONNÉES DE TEST";

export function CleanupPanel() {
  const [preview, setPreview] = useState<TestDataPreview | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [phrase, setPhrase] = useState("");
  const [deleteDrafts, setDeleteDrafts] = useState(true);
  const [deleteImports, setDeleteImports] = useState(true);
  const [deleteAnalyzed, setDeleteAnalyzed] = useState(false);
  const [deleteOrphanImages, setDeleteOrphanImages] = useState(true);
  const [disconnectEbay, setDisconnectEbay] = useState(false);
  const [pending, startTransition] = useTransition();
  const [loadingPreview, setLoadingPreview] = useState(true);

  async function loadPreview() {
    setLoadingPreview(true);
    setLoadError(null);
    const r = await previewTestDataCleanup();
    if (r.error) setLoadError(r.error);
    else setPreview(r.data ?? null);
    setLoadingPreview(false);
  }

  useEffect(() => {
    void loadPreview();
  }, []);

  function runCleanup() {
    startTransition(async () => {
      const r = await executeTestDataCleanup({
        confirmPhrase: phrase,
        deleteDrafts,
        deleteImports,
        deleteAnalyzed,
        deleteOrphanImages,
        disconnectEbay,
      });
      if (r.error) {
        toast.error(r.error);
        return;
      }
      toast.success("Nettoyage terminé.");
      setPhrase("");
      await loadPreview();
    });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        <div className="flex gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">Dry-run d’abord, suppression manuelle ensuite</p>
            <p className="mt-1 text-amber-900/90">
              Aucune suppression automatique. Les annonces déjà{" "}
              <strong>publiées</strong> ne sont jamais touchées. Les comptes
              utilisateurs et le projet Supabase restent intacts.
            </p>
          </div>
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-sm font-medium text-[var(--navy-900)]">Aperçu (dry-run)</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={loadingPreview}
            onClick={() => void loadPreview()}
          >
            {loadingPreview ? (
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            ) : null}
            Actualiser
          </Button>
        </div>

        {loadError ? (
          <p className="text-sm text-destructive">{loadError}</p>
        ) : preview ? (
          <dl className="grid gap-2 sm:grid-cols-2 text-sm">
            {(
              [
                ["Brouillons / à revoir", preview.draftAds],
                ["Publiées (protégées)", preview.publishedAds],
                ["Autres statuts", preview.otherAds],
                ["Lots d’import", preview.importBatches],
                ["Lignes d’import", preview.importRows],
                ["Imports URL", preview.urlImports],
                ["Produits analysés", preview.analyzedProducts],
                ["Images d’annonces", preview.adImages],
                ["Tentatives de publication", preview.publicationAttempts],
                ["Publications listing", preview.listingPublications],
                ["Comptes eBay liés", preview.ebayAccounts],
              ] as const
            ).map(([label, value]) => (
              <div
                key={label}
                className="flex items-center justify-between rounded-md border border-[var(--ss-border)] bg-[var(--ss-surface)] px-3 py-2"
              >
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="font-medium tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">Chargement…</p>
        )}
      </div>

      <div className="space-y-3 border-t pt-6">
        <h3 className="text-sm font-medium text-[var(--navy-900)]">
          Suppression manuelle
        </h3>
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={deleteDrafts}
              onCheckedChange={(v) => setDeleteDrafts(v === true)}
            />
            Supprimer brouillons / analyses / échecs (pas les publiées)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={deleteImports}
              onCheckedChange={(v) => setDeleteImports(v === true)}
            />
            Supprimer imports CSV / URL
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={deleteAnalyzed}
              onCheckedChange={(v) => setDeleteAnalyzed(v === true)}
            />
            Supprimer produits analysés (photo)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={deleteOrphanImages}
              onCheckedChange={(v) => setDeleteOrphanImages(v === true)}
            />
            Supprimer images orphelines
          </label>
          <label className="flex items-center gap-2 text-sm text-destructive">
            <Checkbox
              checked={disconnectEbay}
              onCheckedChange={(v) => setDisconnectEbay(v === true)}
            />
            Désactiver le compte eBay lié (confirm séparée — coché = oui)
          </label>
        </div>

        <div className="space-y-2 pt-2">
          <Label htmlFor="cleanup-phrase">
            Tapez <code className="text-xs">{CONFIRM_PHRASE}</code> pour confirmer
          </Label>
          <Input
            id="cleanup-phrase"
            value={phrase}
            onChange={(e) => setPhrase(e.target.value)}
            placeholder={CONFIRM_PHRASE}
            autoComplete="off"
          />
        </div>

        <Button
          type="button"
          variant="destructive"
          disabled={pending || phrase !== CONFIRM_PHRASE}
          onClick={runCleanup}
        >
          {pending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="mr-2 h-4 w-4" />
          )}
          Exécuter le nettoyage
        </Button>
      </div>
    </div>
  );
}
