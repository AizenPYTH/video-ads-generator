"use client";

import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import {
  ArrowLeft,
  ArrowRight,
  ImagePlus,
  Star,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  fileIdentity,
  formatBytes,
  IMAGE_EXTENSIONS,
  IMAGE_MAX_SIZE,
  IMAGE_MIME_TYPES,
  validateFile,
} from "./file-utils";

type ImagePreviewProps = {
  file: File;
  alt: string;
};

function ImagePreview({ file, alt }: ImagePreviewProps) {
  const [url] = useState(() => URL.createObjectURL(file));

  useEffect(() => {
    return () => URL.revokeObjectURL(url);
  }, [url]);

  return <Image src={url} alt={alt} fill unoptimized className="object-cover" />;
}

export type ImageDropzoneProps = {
  files: File[];
  onFilesChange: (files: File[]) => void;
  maxFiles?: number;
  disabled?: boolean;
  label?: string;
  className?: string;
};

export function ImageDropzone({
  files,
  onFilesChange,
  maxFiles = 12,
  disabled = false,
  label = "Glissez vos images ici",
  className,
}: ImageDropzoneProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const debugMode = process.env.NEXT_PUBLIC_DEBUG_MODE === "true";

  function photoLabel(index: number): string {
    return index === 0 ? "Photo principale" : `Photo ${index + 1}`;
  }

  function userFacingError(message: string, fileName?: string): string {
    if (debugMode && fileName) return message;
    // Masquer les chemins / noms longs pour l'utilisateur
    if (fileName && fileName.length > 40) {
      return message.replace(fileName, "cette image");
    }
    if (fileName) {
      return message.replace(`« ${fileName} »`, "Cette image").replace(fileName, "cette image");
    }
    return message;
  }

  function addFiles(incoming: File[]) {
    const existing = new Set(files.map(fileIdentity));
    const accepted: File[] = [];
    const nextErrors: string[] = [];

    for (const file of incoming) {
      const validationError = validateFile(file, {
        accept: [...IMAGE_MIME_TYPES],
        extensions: [...IMAGE_EXTENSIONS],
        maxSize: IMAGE_MAX_SIZE,
      });
      const key = fileIdentity(file);

      if (validationError) {
        nextErrors.push(userFacingError(validationError, file.name));
      } else if (
        existing.has(key) ||
        accepted.some((candidate) => fileIdentity(candidate) === key)
      ) {
        nextErrors.push(
          debugMode
            ? `« ${file.name} » est déjà sélectionnée.`
            : "Cette image est déjà sélectionnée.",
        );
      } else {
        accepted.push(file);
      }
    }

    const available = Math.max(0, maxFiles - files.length);
    if (accepted.length > available) {
      nextErrors.push(`Vous pouvez sélectionner au maximum ${maxFiles} images.`);
    }

    if (accepted.length > 0) {
      onFilesChange([...files, ...accepted.slice(0, available)]);
    }
    setErrors(nextErrors);
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= files.length || from === to) return;
    const next = [...files];
    const [file] = next.splice(from, 1);
    next.splice(to, 0, file);
    onFilesChange(next);
  }

  function openPicker() {
    if (!disabled && files.length < maxFiles) inputRef.current?.click();
  }

  return (
    <div className={cn("space-y-4", className)}>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={[...IMAGE_EXTENSIONS, ...IMAGE_MIME_TYPES].join(",")}
        multiple
        disabled={disabled}
        className="sr-only"
        onChange={(event) => {
          addFiles(Array.from(event.target.files ?? []));
          event.target.value = "";
        }}
      />

      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-controls={inputId}
        aria-disabled={disabled}
        onClick={openPicker}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openPicker();
          }
        }}
        onDragEnter={(event) => {
          event.preventDefault();
          if (!disabled && draggedIndex === null) setIsDraggingFiles(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled && draggedIndex === null) {
            event.dataTransfer.dropEffect = "copy";
            setIsDraggingFiles(true);
          }
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setIsDraggingFiles(false);
          }
        }}
        onDrop={(event) => {
          event.preventDefault();
          setIsDraggingFiles(false);
          if (!disabled && event.dataTransfer.files.length > 0) {
            addFiles(Array.from(event.dataTransfer.files));
          }
        }}
        className={cn(
          "flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/30 px-6 py-6 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          isDraggingFiles && "border-primary bg-primary/10",
          disabled && "cursor-not-allowed opacity-50",
        )}
      >
        <ImagePlus className="mb-3 h-8 w-8 text-muted-foreground" aria-hidden="true" />
        <p className="font-medium">{label}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          ou cliquez pour parcourir ({files.length}/{maxFiles})
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          JPEG, PNG, WebP ou GIF · Maximum {formatBytes(IMAGE_MAX_SIZE)} par image
        </p>
      </div>

      <div aria-live="polite" aria-atomic="true">
        {errors.length > 0 && (
          <ul className="space-y-1 text-sm text-destructive">
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        )}
      </div>

      {files.length > 0 && (
        <ul
          className="grid grid-cols-2 gap-3 sm:grid-cols-3"
          aria-label="Images sélectionnées, dans leur ordre d'envoi"
        >
          {files.map((file, index) => (
            <li
              key={fileIdentity(file)}
              draggable={!disabled}
              onDragStart={(event) => {
                event.stopPropagation();
                setDraggedIndex(index);
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("text/plain", String(index));
              }}
              onDragEnd={() => setDraggedIndex(null)}
              onDragOver={(event) => {
                if (draggedIndex !== null) {
                  event.preventDefault();
                  event.stopPropagation();
                  event.dataTransfer.dropEffect = "move";
                }
              }}
              onDrop={(event) => {
                if (draggedIndex !== null) {
                  event.preventDefault();
                  event.stopPropagation();
                  move(draggedIndex, index);
                  setDraggedIndex(null);
                }
              }}
              className={cn(
                "overflow-hidden rounded-lg border bg-background",
                draggedIndex === index && "opacity-50",
              )}
            >
              <div className="relative aspect-square bg-muted">
                <ImagePreview file={file} alt={`Aperçu de ${photoLabel(index)}`} />
                {index === 0 && (
                  <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-primary px-2 py-1 text-xs font-medium text-primary-foreground">
                    <Star className="h-3 w-3 fill-current" aria-hidden="true" />
                    Principale
                  </span>
                )}
              </div>
              <div className="space-y-2 p-2">
                <p
                  className="truncate text-xs font-medium"
                  title={debugMode ? file.name : photoLabel(index)}
                >
                  {debugMode ? file.name : photoLabel(index)}
                </p>
                <div className="flex flex-wrap gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={disabled || index === 0}
                    aria-label={`Déplacer ${photoLabel(index)} vers la gauche`}
                    onClick={(event) => {
                      event.stopPropagation();
                      move(index, index - 1);
                    }}
                  >
                    <ArrowLeft aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={disabled || index === files.length - 1}
                    aria-label={`Déplacer ${photoLabel(index)} vers la droite`}
                    onClick={(event) => {
                      event.stopPropagation();
                      move(index, index + 1);
                    }}
                  >
                    <ArrowRight aria-hidden="true" />
                  </Button>
                  {index > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={disabled}
                      aria-label={`Définir ${photoLabel(index)} comme image principale`}
                      onClick={(event) => {
                        event.stopPropagation();
                        move(index, 0);
                      }}
                    >
                      <Star aria-hidden="true" />
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={disabled}
                    aria-label={`Retirer ${photoLabel(index)}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      onFilesChange(files.filter((_, itemIndex) => itemIndex !== index));
                      setErrors([]);
                    }}
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {files.length > 0 && files.length < maxFiles && (
        <Button type="button" variant="outline" disabled={disabled} onClick={openPicker}>
          <Upload aria-hidden="true" />
          Ajouter des images
        </Button>
      )}
    </div>
  );
}
