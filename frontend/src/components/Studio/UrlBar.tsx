import { useState } from "react";
import { ArrowRight, ImagePlus, Link2, X } from "lucide-react";
import { Button } from "@/components/Common/Button";
import { FileDropzone } from "@/components/Upload/FileDropzone";
import { isLikelyUrl, normalizeUrlInput } from "@/utils/validation";

/** The whole input surface: one field, one button. */
export const UrlBar: React.FC<{
  onSubmit: (input: { url?: string; files?: File[] }) => void;
  busy: boolean;
}> = ({ onSubmit, busy }) => {
  const [value, setValue] = useState("");
  const [showFiles, setShowFiles] = useState(false);
  const valid = isLikelyUrl(value);

  return (
    <div className="space-y-4">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!valid || busy) return;
          onSubmit({ url: normalizeUrlInput(value) });
        }}
        className="flex flex-col gap-3 sm:flex-row"
      >
        <div className="relative flex-1">
          <Link2 className="pointer-events-none absolute top-1/2 left-4 size-4.5 -translate-y-1/2 text-mist-400" />
          <input
            type="text"
            inputMode="url"
            autoComplete="url"
            autoFocus
            spellCheck={false}
            aria-label="Your website address"
            placeholder="yoursite.com"
            value={value}
            disabled={busy}
            onChange={(event) => setValue(event.target.value)}
            className="h-14 w-full rounded-2xl border border-white/10 bg-white/4 pr-4 pl-12 text-lg text-white placeholder:text-mist-400/50 focus:border-brand-400/60 focus:ring-2 focus:ring-brand-500/25 focus:outline-none disabled:opacity-60"
          />
        </div>
        <Button
          type="submit"
          size="lg"
          disabled={busy || !valid}
          className="h-14 shrink-0 px-8 text-base"
        >
          Create my video
          <ArrowRight />
        </Button>
      </form>

      {!showFiles ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => setShowFiles(true)}
          className="mx-auto flex items-center gap-1.5 text-sm text-mist-400 transition-colors hover:text-mist-200 disabled:opacity-50"
        >
          <ImagePlus className="size-3.5" />
          No website? Upload screenshots instead
        </button>
      ) : (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setShowFiles(false)}
            className="flex items-center gap-1.5 text-sm text-mist-400 transition-colors hover:text-mist-200"
          >
            <X className="size-3.5" />
            Use a link instead
          </button>
          <FileDropzone
            loading={busy}
            onSubmit={(files) => onSubmit({ files })}
          />
        </div>
      )}
    </div>
  );
};
