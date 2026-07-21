"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { uploadImageWithPath } from "@/components/uploads/upload-image";
import {
  IMAGE_EXTENSIONS,
  IMAGE_MAX_SIZE,
  IMAGE_MIME_TYPES,
  validateFile,
} from "@/components/uploads/file-utils";
import { addAdImages } from "@/features/ads/actions";

type Props = {
  adId: string;
  imageUrl?: string | null;
  hasImage: boolean;
  disabled?: boolean;
  onUploaded?: (url: string) => void;
};

export function AdRowImageDrop({
  adId,
  imageUrl,
  hasImage,
  disabled,
  onUploaded,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const displayUrl = preview ?? imageUrl ?? null;

  async function handleFile(file: File | undefined) {
    if (!file || disabled || busy) return;
    const err = validateFile(file, {
      accept: [...IMAGE_MIME_TYPES],
      extensions: [...IMAGE_EXTENSIONS],
      maxSize: IMAGE_MAX_SIZE,
    });
    if (err) {
      toast.error(err);
      return;
    }

    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);
    setBusy(true);
    try {
      const uploaded = await uploadImageWithPath(file, `ads/${adId}`);
      const result = await addAdImages(adId, [
        { url: uploaded.url, storagePath: uploaded.path },
      ]);
      if (result.error || !result.data?.[0]) {
        toast.error(result.error ?? "Impossible d’ajouter l’image.");
        setPreview(null);
        return;
      }
      const url = result.data[0].url;
      setPreview(url);
      onUploaded?.(url);
      toast.success("Image ajoutée");
    } catch (e) {
      setPreview(null);
      toast.error(e instanceof Error ? e.message : "Échec du téléversement.");
    } finally {
      setBusy(false);
      URL.revokeObjectURL(localUrl);
    }
  }

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label={hasImage ? "Remplacer l’image" : "Ajouter une image"}
      onClick={() => !disabled && !busy && inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      onDragEnter={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!disabled) setDragOver(true);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!disabled) {
          e.dataTransfer.dropEffect = "copy";
          setDragOver(true);
        }
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setDragOver(false);
        }
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOver(false);
        const file = e.dataTransfer.files?.[0];
        void handleFile(file);
      }}
      className={cn(
        "relative flex h-14 w-14 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-lg border bg-muted/40 transition",
        dragOver && "border-primary ring-2 ring-primary/30",
        disabled && "cursor-not-allowed opacity-50",
        !hasImage && !displayUrl && "border-dashed",
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={[...IMAGE_EXTENSIONS, ...IMAGE_MIME_TYPES].join(",")}
        className="sr-only"
        disabled={disabled || busy}
        onChange={(e) => {
          void handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {displayUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={displayUrl}
          alt=""
          className="h-full w-full object-cover"
        />
      ) : (
        <ImagePlus className="h-5 w-5 text-muted-foreground" aria-hidden />
      )}
      {busy ? (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
          <Loader2 className="h-4 w-4 animate-spin text-white" />
        </div>
      ) : null}
    </div>
  );
}
