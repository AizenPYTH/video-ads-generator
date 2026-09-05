import { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import { ImagePlus, Sparkles, X } from "lucide-react";
import { Button } from "@/components/Common/Button";
import { Spinner } from "@/components/Common/Loader";
import {
  ACCEPTED_IMAGE_TYPES,
  MAX_FILE_BYTES,
  MAX_FILES,
} from "@/utils/validation";
import { cn } from "@/lib/utils";

interface Preview {
  file: File;
  url: string;
}

export const FileDropzone: React.FC<{
  onSubmit: (files: File[]) => void;
  loading: boolean;
}> = ({ onSubmit, loading }) => {
  const [previews, setPreviews] = useState<Preview[]>([]);
  const [rejected, setRejected] = useState<string | null>(null);

  const onDrop = useCallback((accepted: File[], fileRejections: unknown[]) => {
    setRejected(
      fileRejections.length > 0
        ? "Some files were skipped — PNG, JPG or WebP under 8 MB only."
        : null,
    );
    setPreviews((current) => {
      const next = [...current];
      for (const file of accepted) {
        if (next.length >= MAX_FILES) break;
        next.push({ file, url: URL.createObjectURL(file) });
      }
      return next;
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_IMAGE_TYPES as unknown as Record<string, string[]>,
    maxSize: MAX_FILE_BYTES,
    maxFiles: MAX_FILES,
    disabled: loading,
  });

  // Object URLs leak until revoked; drop them when the component unmounts.
  useEffect(
    () => () => {
      for (const preview of previews) URL.revokeObjectURL(preview.url);
    },
    [previews],
  );

  const remove = (index: number): void =>
    setPreviews((current) => {
      const target = current[index];
      if (target) URL.revokeObjectURL(target.url);
      return current.filter((_, position) => position !== index);
    });

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors",
          isDragActive
            ? "border-brand-400/70 bg-brand-500/8"
            : "border-white/12 hover:border-white/25 hover:bg-white/3",
          loading && "pointer-events-none opacity-60",
        )}
      >
        <input {...getInputProps()} />
        <span className="grid size-11 place-items-center rounded-xl bg-white/6 text-mist-300">
          <ImagePlus className="size-5" />
        </span>
        <div>
          <p className="text-sm font-medium text-white">
            {isDragActive ? "Drop them here" : "Drop screenshots, or click to browse"}
          </p>
          <p className="mt-1 text-xs text-mist-400">
            Up to {MAX_FILES} images · PNG, JPG or WebP · 8 MB each
          </p>
        </div>
      </div>

      {rejected ? <p className="text-sm text-amber-300">{rejected}</p> : null}

      {previews.length > 0 ? (
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          {previews.map((preview, index) => (
            <li key={preview.url} className="group relative">
              <img
                src={preview.url}
                alt={preview.file.name}
                className="aspect-9/16 w-full rounded-lg border border-white/10 object-cover object-top"
              />
              <button
                type="button"
                aria-label={`Remove ${preview.file.name}`}
                onClick={() => remove(index)}
                className="absolute -top-2 -right-2 grid size-6 place-items-center rounded-full border border-white/15 bg-ink-800 text-mist-300 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
              >
                <X className="size-3" />
              </button>
              {index === 0 ? (
                <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  Hero
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      <Button
        size="lg"
        className="w-full"
        disabled={loading || previews.length === 0}
        onClick={() => onSubmit(previews.map((preview) => preview.file))}
      >
        {loading ? <Spinner /> : <Sparkles />}
        {loading ? "Uploading…" : `Analyse ${previews.length || ""} screenshot${previews.length === 1 ? "" : "s"}`}
      </Button>
    </div>
  );
};
