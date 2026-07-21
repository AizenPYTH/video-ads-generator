"use client";

import { useMemo, useState } from "react";
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
import { uploadImageWithPath } from "@/components/uploads/upload-image";
import { addAdImages } from "@/features/ads/actions";
import {
  matchImagesToAds,
  type ImageMatchSuggestion,
  type MatchableAd,
} from "@/features/ads/image-match";
import {
  IMAGE_EXTENSIONS,
  IMAGE_MAX_SIZE,
  IMAGE_MIME_TYPES,
  validateFile,
} from "@/components/uploads/file-utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ads: MatchableAd[];
  onDone?: () => void;
};

export function BulkImageMatchDialog({
  open,
  onOpenChange,
  ads,
  onDone,
}: Props) {
  const [files, setFiles] = useState<File[]>([]);
  const [suggestions, setSuggestions] = useState<ImageMatchSuggestion[]>([]);
  const [busy, setBusy] = useState(false);

  const unmatched = useMemo(
    () => suggestions.filter((s) => !s.adId).length,
    [suggestions],
  );

  function onPick(list: FileList | null) {
    if (!list?.length) return;
    const accepted: File[] = [];
    for (const file of Array.from(list)) {
      const err = validateFile(file, {
        accept: [...IMAGE_MIME_TYPES],
        extensions: [...IMAGE_EXTENSIONS],
        maxSize: IMAGE_MAX_SIZE,
      });
      if (err) {
        toast.error(err);
        continue;
      }
      accepted.push(file);
    }
    setFiles(accepted);
    setSuggestions(matchImagesToAds(accepted.map((f) => f.name), ads));
  }

  function reassign(fileName: string, adId: string | null) {
    setSuggestions((prev) =>
      prev.map((s) => {
        if (s.fileName !== fileName) return s;
        if (!adId) {
          return {
            ...s,
            adId: null,
            adTitle: null,
            adSku: null,
            confidence: 0,
            reason: "Corrigé manuellement",
          };
        }
        const ad = ads.find((a) => a.id === adId);
        return {
          ...s,
          adId,
          adTitle: ad?.titre ?? null,
          adSku: ad?.sku ?? null,
          confidence: 1,
          reason: "Corrigé manuellement",
        };
      }),
    );
  }

  async function applyMatches() {
    const paired = suggestions.filter((s) => s.adId);
    if (!paired.length) {
      toast.error("Aucune association à appliquer.");
      return;
    }
    setBusy(true);
    let ok = 0;
    let fail = 0;
    for (const suggestion of paired) {
      const file = files.find((f) => f.name === suggestion.fileName);
      if (!file || !suggestion.adId) continue;
      try {
        const uploaded = await uploadImageWithPath(
          file,
          `ads/${suggestion.adId}`,
        );
        const result = await addAdImages(suggestion.adId, [
          { url: uploaded.url, storagePath: uploaded.path },
        ]);
        if (result.error) fail += 1;
        else ok += 1;
      } catch {
        fail += 1;
      }
    }
    setBusy(false);
    toast.success(`${ok} image(s) associée(s), ${fail} échec(s).`);
    onDone?.();
    onOpenChange(false);
    setFiles([]);
    setSuggestions([]);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (busy) return;
        onOpenChange(next);
        if (!next) {
          setFiles([]);
          setSuggestions([]);
        }
      }}
    >
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Associer des images aux annonces</DialogTitle>
          <DialogDescription>
            Correspondance automatique via SKU, MPN, référence ou titre.
            Vérifiez avant d’appliquer.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <input
            type="file"
            multiple
            accept={[...IMAGE_EXTENSIONS, ...IMAGE_MIME_TYPES].join(",")}
            onChange={(e) => onPick(e.target.files)}
            className="block w-full text-sm"
          />

          {suggestions.length > 0 ? (
            <>
              <p className="text-sm text-muted-foreground">
                {suggestions.length - unmatched} associées · {unmatched} non
                associées
              </p>
              <ul className="max-h-72 space-y-2 overflow-y-auto rounded-lg border p-2 text-sm">
                {suggestions.map((s) => (
                  <li
                    key={s.fileName}
                    className="flex flex-col gap-1 rounded-md border bg-card p-2 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{s.fileName}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.adId
                          ? `${s.adSku ?? s.adTitle ?? s.adId} · ${Math.round(s.confidence * 100)} % · ${s.reason}`
                          : s.reason}
                      </p>
                    </div>
                    <select
                      className="h-9 max-w-full rounded-md border bg-background px-2 text-xs"
                      value={s.adId ?? ""}
                      onChange={(e) =>
                        reassign(s.fileName, e.target.value || null)
                      }
                    >
                      <option value="">— Non associé —</option>
                      {ads.map((ad) => (
                        <option key={ad.id} value={ad.id}>
                          {(ad.sku || ad.titre || ad.id).slice(0, 60)}
                        </option>
                      ))}
                    </select>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <LoadingButton
            loading={busy}
            disabled={!suggestions.some((s) => s.adId)}
            onClick={() => void applyMatches()}
          >
            Appliquer les associations
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
