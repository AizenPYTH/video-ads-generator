import { useState } from "react";
import { Globe, Sparkles } from "lucide-react";
import { Button } from "@/components/Common/Button";
import { Spinner } from "@/components/Common/Loader";
import { isLikelyUrl, normalizeUrlInput } from "@/utils/validation";

const EXAMPLES = ["linear.app", "stripe.com", "notion.so"];

export const URLInput: React.FC<{
  onSubmit: (url: string) => void;
  loading: boolean;
}> = ({ onSubmit, loading }) => {
  const [value, setValue] = useState("");
  const [touched, setTouched] = useState(false);

  const valid = isLikelyUrl(value);
  const showError = touched && value.length > 0 && !valid;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        setTouched(true);
        if (!valid || loading) return;
        onSubmit(normalizeUrlInput(value));
      }}
      className="space-y-4"
    >
      <div>
        <label
          htmlFor="product-url"
          className="mb-2 block text-sm font-medium text-mist-300"
        >
          Product URL
        </label>
        <div className="relative">
          <Globe className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-mist-400" />
          <input
            id="product-url"
            type="text"
            inputMode="url"
            autoComplete="url"
            spellCheck={false}
            placeholder="yourproduct.com"
            value={value}
            disabled={loading}
            onChange={(event) => setValue(event.target.value)}
            onBlur={() => setTouched(true)}
            aria-invalid={showError}
            aria-describedby={showError ? "product-url-error" : undefined}
            className="h-13 w-full rounded-xl border border-white/10 bg-white/4 pr-4 pl-11 text-[15px] text-white placeholder:text-mist-400/60 focus:border-brand-400/60 focus:ring-2 focus:ring-brand-500/25 focus:outline-none disabled:opacity-60"
          />
        </div>
        {showError ? (
          <p id="product-url-error" className="mt-2 text-sm text-red-300">
            That does not look like a web address.
          </p>
        ) : null}
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={loading || !valid}>
        {loading ? <Spinner /> : <Sparkles />}
        {loading ? "Capturing your product…" : "Capture and analyse"}
      </Button>

      <div className="flex flex-wrap items-center gap-2 text-xs text-mist-400">
        <span>Try:</span>
        {EXAMPLES.map((example) => (
          <button
            key={example}
            type="button"
            disabled={loading}
            onClick={() => {
              setValue(example);
              setTouched(false);
            }}
            className="rounded-full border border-white/10 px-2.5 py-1 transition-colors hover:border-brand-400/40 hover:text-mist-200 disabled:opacity-50"
          >
            {example}
          </button>
        ))}
      </div>
    </form>
  );
};
