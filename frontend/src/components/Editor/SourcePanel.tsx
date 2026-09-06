import { useState } from "react";
import { ArrowRight, Globe, ImagePlus, Loader2, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/Common/Button";
import { FileDropzone } from "@/components/Upload/FileDropzone";
import { isLikelyUrl, normalizeUrlInput } from "@/utils/validation";
import type { SourcePhase } from "@/hooks/useEditor";

/**
 * Where the screens come from: a website, an App Store listing, or files.
 * One field, because to the user a store link is just a link.
 */
export const SourcePanel: React.FC<{
  phase: SourcePhase;
  error: string | null;
  sourceLabel: string | null;
  screenCount: number;
  onUrl: (url: string) => void;
  onFiles: (files: File[]) => void;
  onCancel: () => void;
  onClear: () => void;
}> = ({ phase, error, sourceLabel, screenCount, onUrl, onFiles, onCancel, onClear }) => {
  const [value, setValue] = useState("");
  const [files, setFiles] = useState(false);
  const busy = phase === "capturing" || phase === "enriching";
  const valid = isLikelyUrl(value);

  if (sourceLabel && !busy && phase !== "error") {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/4 px-3.5 py-2.5">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-white">{sourceLabel}</p>
          <p className="text-xs text-mist-400">{screenCount} screenshot{screenCount === 1 ? "" : "s"} captured</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClear} title="Use a different source">
          <RefreshCw />
          Change
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {!files ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!valid || busy) return;
            onUrl(normalizeUrlInput(value));
          }}
          className="flex gap-2"
        >
          <div className="relative flex-1">
            <Globe className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-mist-400" />
            <input
              type="text"
              inputMode="url"
              spellCheck={false}
              placeholder="yoursite.com or an App Store link"
              value={value}
              disabled={busy}
              onChange={(event) => setValue(event.target.value)}
              className="h-11 w-full rounded-xl border border-white/10 bg-white/4 pr-3 pl-9 text-sm text-white placeholder:text-mist-400/50 focus:border-brand-400/60 focus:ring-2 focus:ring-brand-500/25 focus:outline-none disabled:opacity-60"
            />
          </div>
          {busy ? (
            <Button type="button" variant="secondary" onClick={onCancel}>
              <Loader2 className="animate-spin" />
              {phase === "capturing" ? "Capturing" : "Reading"}
            </Button>
          ) : (
            <Button type="submit" disabled={!valid}>
              Capture
              <ArrowRight />
            </Button>
          )}
        </form>
      ) : (
        <FileDropzone loading={busy} onSubmit={onFiles} />
      )}

      <button
        type="button"
        disabled={busy}
        onClick={() => setFiles((current) => !current)}
        className="flex items-center gap-1.5 text-xs text-mist-400 transition-colors hover:text-mist-200 disabled:opacity-50"
      >
        {files ? <X className="size-3.5" /> : <ImagePlus className="size-3.5" />}
        {files ? "Use a link instead" : "Or upload screenshots"}
      </button>

      {error ? <p className="text-xs text-red-300">{error}</p> : null}
    </div>
  );
};
