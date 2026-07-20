"use client";

import { useId, useRef, useState } from "react";
import { FileText, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  fileIdentity,
  formatBytes,
  validateFile,
  type FileValidationOptions,
} from "./file-utils";

export type FileDropzoneProps = FileValidationOptions & {
  files: File[];
  onFilesChange: (files: File[]) => void;
  multiple?: boolean;
  maxFiles?: number;
  disabled?: boolean;
  label?: string;
  description?: string;
  acceptedFormatsLabel?: string;
  noClientSizeLimitLabel?: string;
  className?: string;
  validate?: (file: File) => string | null;
};

export function FileDropzone({
  files,
  onFilesChange,
  accept,
  extensions,
  maxSize,
  multiple = false,
  maxFiles,
  disabled = false,
  label = "Déposez un fichier ici",
  description = "ou cliquez pour parcourir",
  acceptedFormatsLabel,
  noClientSizeLimitLabel,
  className,
  validate,
}: FileDropzoneProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const inputAccept = [
    ...(extensions ?? []),
    ...(accept ?? []),
  ].join(",");

  function addFiles(incoming: File[]) {
    const nextErrors: string[] = [];
    const existingKeys = new Set(files.map(fileIdentity));
    const accepted: File[] = [];

    for (const file of incoming) {
      const validationError =
        validate?.(file) ?? validateFile(file, { accept, extensions, maxSize });

      if (validationError) {
        nextErrors.push(validationError);
        continue;
      }

      const key = fileIdentity(file);
      if (existingKeys.has(key) || accepted.some((item) => fileIdentity(item) === key)) {
        nextErrors.push(`« ${file.name} » est déjà sélectionné.`);
        continue;
      }

      accepted.push(file);
    }

    const limit = multiple ? (maxFiles ?? Number.POSITIVE_INFINITY) : 1;
    const base = multiple ? files : [];
    const available = Math.max(0, limit - base.length);
    if (accepted.length > available) {
      nextErrors.push(
        limit === 1
          ? "Un seul fichier peut être sélectionné."
          : `Vous pouvez sélectionner au maximum ${limit} fichiers.`,
      );
    }

    const nextFiles = [...base, ...accepted.slice(0, available)];
    if (accepted.length > 0) onFilesChange(nextFiles);
    setErrors(nextErrors);
  }

  function openPicker() {
    if (!disabled) inputRef.current?.click();
  }

  return (
    <div className={cn("space-y-3", className)}>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={inputAccept || undefined}
        multiple={multiple}
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
          if (!disabled) setIsDragging(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) {
            event.dataTransfer.dropEffect = "copy";
            setIsDragging(true);
          }
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setIsDragging(false);
          }
        }}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          if (!disabled) addFiles(Array.from(event.dataTransfer.files));
        }}
        className={cn(
          "flex min-h-40 w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/30 px-6 py-8 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          isDragging && "border-primary bg-primary/10",
          disabled && "cursor-not-allowed opacity-50",
        )}
      >
        <Upload className="mb-3 h-8 w-8 text-muted-foreground" aria-hidden="true" />
        <p className="font-medium">{label}</p>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        {(acceptedFormatsLabel || maxSize !== undefined || noClientSizeLimitLabel) && (
          <p className="mt-2 text-xs text-muted-foreground">
            {acceptedFormatsLabel}
            {acceptedFormatsLabel && (maxSize !== undefined || noClientSizeLimitLabel)
              ? " · "
              : ""}
            {maxSize !== undefined
              ? `Maximum ${formatBytes(maxSize)} par fichier`
              : noClientSizeLimitLabel}
          </p>
        )}
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
        <ul className="space-y-2" aria-label="Fichiers sélectionnés">
          {files.map((file, index) => (
            <li
              key={fileIdentity(file)}
              className="flex items-center gap-3 rounded-lg border bg-background p-3"
            >
              <FileText className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={disabled}
                aria-label={`Retirer ${file.name}`}
                onClick={(event) => {
                  event.stopPropagation();
                  onFilesChange(files.filter((_, itemIndex) => itemIndex !== index));
                  setErrors([]);
                }}
              >
                <X aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {!multiple && files.length === 1 && (
        <Button type="button" variant="outline" disabled={disabled} onClick={openPicker}>
          Remplacer le fichier
        </Button>
      )}
    </div>
  );
}
