"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Loader2,
  Star,
  Trash2,
  ZoomIn,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ImageDropzone } from "@/components/uploads/image-dropzone";
import { uploadImageWithPath } from "@/components/uploads/upload-image";
import {
  addAdImages,
  deleteAdImage,
  reorderAdImages,
  setPrimaryAdImage,
} from "@/features/ads/actions";
import { detectWatermarkHint } from "@/lib/images/watermark-hint";
import { cn } from "@/lib/utils";

export type EditorAdImage = {
  id: string;
  url: string;
  ordre: number;
  est_principale: boolean;
  storage_path?: string | null;
};

type Props = {
  adId: string;
  images: EditorAdImage[];
  onImagesChange: (images: EditorAdImage[]) => void;
  disabled?: boolean;
};

const MAX = 12;

export function AdImagesPanel({
  adId,
  images,
  onImagesChange,
  disabled,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const busy = disabled || pending;

  const selectedCount = images.length;
  const hasWatermarkRisk = images.some(
    (img) => detectWatermarkHint({ url: img.url }).suspected,
  );

  function move(from: number, to: number) {
    if (to < 0 || to >= images.length || from === to) return;
    const next = [...images];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    const ordered = next.map((img, ordre) => ({
      ...img,
      ordre,
      est_principale: ordre === 0,
    }));
    onImagesChange(ordered);
    startTransition(async () => {
      const reorder = await reorderAdImages(
        adId,
        ordered.map((i) => i.id),
      );
      if (reorder.error) {
        toast.error(reorder.error);
        return;
      }
      if (ordered[0] && images[0]?.id !== ordered[0].id) {
        const primary = await setPrimaryAdImage(adId, ordered[0].id);
        if (primary.error) toast.error(primary.error);
      }
    });
  }

  function makePrimary(imageId: string) {
    const next = [...images]
      .map((img) => ({
        ...img,
        est_principale: img.id === imageId,
      }))
      .sort((a, b) => {
        if (a.id === imageId) return -1;
        if (b.id === imageId) return 1;
        return a.ordre - b.ordre;
      })
      .map((img, ordre) => ({ ...img, ordre }));
    onImagesChange(next);
    startTransition(async () => {
      const primaryResult = await setPrimaryAdImage(adId, imageId);
      if (primaryResult.error) {
        toast.error(primaryResult.error);
        return;
      }
      await reorderAdImages(
        adId,
        next.map((i) => i.id),
      );
      toast.success("Image principale mise à jour");
    });
  }

  function remove(imageId: string) {
    const previous = images;
    const next = images
      .filter((i) => i.id !== imageId)
      .map((img, ordre) => ({
        ...img,
        ordre,
        est_principale: ordre === 0,
      }));
    onImagesChange(next);
    startTransition(async () => {
      const result = await deleteAdImage(adId, imageId);
      if (result.error) {
        onImagesChange(previous);
        toast.error(result.error);
        return;
      }
      toast.success("Image retirée");
    });
  }

  function uploadFiles() {
    if (!newFiles.length) return;
    startTransition(async () => {
      try {
        const uploaded = [];
        for (const file of newFiles) {
          const result = await uploadImageWithPath(file, `ads/${adId}`);
          uploaded.push({
            url: result.url,
            storagePath: result.path,
          });
        }
        const result = await addAdImages(adId, uploaded);
        if (result.error || !result.data) {
          toast.error(result.error ?? "Impossible d'ajouter les images.");
          return;
        }
        onImagesChange([
          ...images,
          ...result.data.map((row) => ({
            id: row.id,
            url: row.url,
            ordre: row.ordre,
            est_principale: row.est_principale,
            storage_path: row.storage_path,
          })),
        ]);
        setNewFiles([]);
        toast.success("Images ajoutées");
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Échec du téléversement.",
        );
      }
    });
  }

  useEffect(() => {
    // sync primary if none
    if (images.length && !images.some((i) => i.est_principale)) {
      onImagesChange(
        images.map((img, ordre) => ({
          ...img,
          est_principale: ordre === 0,
        })),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images.length]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Images de l’annonce</h2>
          <p className="text-sm text-muted-foreground">
            {selectedCount} image{selectedCount !== 1 ? "s" : ""} sélectionnée
            {selectedCount !== 1 ? "s" : ""}
            {images.some((i) => i.est_principale)
              ? " · 1 principale"
              : ""}
          </p>
        </div>
      </div>

      {hasWatermarkRisk && (
        <div className="flex gap-2 rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Certaines images marketplace peuvent contenir un filigrane. Vous
            pouvez les retirer et utiliser vos photos personnelles. Aucun
            filigrane n’est effacé automatiquement.
          </p>
        </div>
      )}

      {images.length === 0 ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Aucune image pour le moment. Ajoutez vos photos produit.
          </p>
          <ImageDropzone
            files={newFiles}
            onFilesChange={setNewFiles}
            maxFiles={MAX}
            disabled={busy}
            label="Ajouter des photos"
          />
          <Button
            type="button"
            disabled={busy || newFiles.length === 0}
            onClick={uploadFiles}
          >
            {pending ? (
              <Loader2 className="animate-spin" aria-hidden="true" />
            ) : null}
            Ajouter à l’annonce
          </Button>
        </div>
      ) : (
        <>
          <ul
            className="grid grid-cols-2 gap-3 sm:grid-cols-3"
            aria-label="Images sélectionnées"
          >
            {images.map((image, index) => {
              const wm = detectWatermarkHint({ url: image.url });
              return (
                <li
                  key={image.id}
                  draggable={!busy}
                  onDragStart={(e) => {
                    setDraggedId(image.id);
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  onDragEnd={() => setDraggedId(null)}
                  onDragOver={(e) => {
                    if (draggedId && draggedId !== image.id) {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const from = images.findIndex((i) => i.id === draggedId);
                    setDraggedId(null);
                    if (from >= 0) move(from, index);
                  }}
                  className={cn(
                    "overflow-hidden rounded-xl border bg-background",
                    image.est_principale && "border-primary ring-2 ring-primary/25",
                    draggedId === image.id && "opacity-50",
                  )}
                >
                  <div className="relative aspect-square bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={image.url}
                      alt={
                        image.est_principale
                          ? "Photo principale"
                          : `Photo ${index + 1}`
                      }
                      className="h-full w-full object-cover"
                    />
                    {image.est_principale && (
                      <Badge className="absolute left-2 top-2 gap-1">
                        <Star className="h-3 w-3 fill-current" />
                        Principale
                      </Badge>
                    )}
                    {wm.suspected && (
                      <Badge
                        variant="outline"
                        className="absolute right-2 top-2 bg-amber-50 text-amber-900"
                      >
                        Filigrane ?
                      </Badge>
                    )}
                    <div className="absolute bottom-2 left-2">
                      <label className="inline-flex items-center gap-1.5 rounded-md bg-black/55 px-2 py-1 text-xs text-white">
                        <Checkbox
                          checked
                          disabled={busy}
                          onCheckedChange={(checked) => {
                            if (checked !== true) remove(image.id);
                          }}
                          aria-label={`Inclure ${image.est_principale ? "la photo principale" : `la photo ${index + 1}`}`}
                        />
                        Inclure
                      </label>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 p-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={busy}
                      onClick={() => setPreviewUrl(image.url)}
                    >
                      <ZoomIn className="h-4 w-4" />
                      Aperçu
                    </Button>
                    {!image.est_principale && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={busy}
                        onClick={() => makePrimary(image.id)}
                      >
                        <Star className="h-4 w-4" />
                        Principale
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={busy}
                      onClick={() => remove(image.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                      Retirer
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>

          {images.length < MAX && (
            <div className="space-y-2 border-t pt-4">
              <p className="text-sm text-muted-foreground">
                Remplacer ou ajouter une photo personnelle
              </p>
              <ImageDropzone
                files={newFiles}
                onFilesChange={setNewFiles}
                maxFiles={MAX - images.length}
                disabled={busy}
                label="Ajouter une photo"
              />
              {newFiles.length > 0 && (
                <Button
                  type="button"
                  disabled={busy}
                  onClick={uploadFiles}
                >
                  {pending ? (
                    <Loader2 className="animate-spin" aria-hidden="true" />
                  ) : null}
                  Ajouter à l’annonce
                </Button>
              )}
            </div>
          )}
        </>
      )}

      <Dialog open={Boolean(previewUrl)} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Aperçu</DialogTitle>
          </DialogHeader>
          {previewUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="Aperçu agrandi"
              className="mx-auto max-h-[70vh] w-full object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
