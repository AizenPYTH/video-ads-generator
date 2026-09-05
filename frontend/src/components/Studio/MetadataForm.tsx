import { useCallback, useRef, useState } from "react";
import { Check, Globe, Loader2, Search, Smartphone } from "lucide-react";
import { api } from "@/services/api";
import { isLikelyUrl } from "@/utils/validation";
import { cn } from "@/lib/utils";
import type { AppStoreMatch, ProductMetadata } from "@/types";

const FIELDS = [
  {
    key: "productUrl",
    label: "Website",
    placeholder: "yoursite.com",
    icon: Globe,
  },
  {
    key: "appStoreUrl",
    label: "App Store",
    placeholder: "apps.apple.com/…",
    icon: Smartphone,
  },
  {
    key: "googlePlayUrl",
    label: "Google Play",
    placeholder: "play.google.com/…",
    icon: Smartphone,
  },
] as const satisfies readonly {
  key: keyof ProductMetadata;
  label: string;
  placeholder: string;
  icon: typeof Globe;
}[];

/**
 * The links the ad closes on.
 *
 * Nothing here is required: the run already knows the page it captured, and
 * that is what the outro falls back to. The fields exist for the two things
 * we cannot work out - a store listing, and a site that is not the one the
 * screenshots came from.
 */
export const MetadataForm: React.FC<{
  metadata: ProductMetadata;
  productName: string;
  disabled: boolean;
  onChange: (patch: Partial<ProductMetadata>) => void;
}> = ({ metadata, productName, disabled, onChange }) => {
  const [searching, setSearching] = useState(false);
  const [matches, setMatches] = useState<AppStoreMatch[] | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const lookUp = useCallback(async () => {
    const term = (metadata.appName ?? productName).trim();
    if (term.length < 2) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setSearching(true);
    try {
      const found = await api.appStore(term, controller.signal);
      if (!controller.signal.aborted) setMatches(found.matches);
    } catch {
      // The route answers with an empty list on failure, so reaching here
      // means the request itself did not land. An empty state says as much.
      if (!controller.signal.aborted) setMatches([]);
    } finally {
      if (!controller.signal.aborted) setSearching(false);
    }
  }, [metadata.appName, productName]);

  return (
    <fieldset disabled={disabled} className="space-y-3">
      <legend className="mb-3 text-xs font-semibold tracking-wider text-mist-400 uppercase">
        Where the ad sends people
      </legend>

      {FIELDS.map(({ key, label, placeholder, icon: Icon }) => {
        const value = metadata[key] ?? "";
        const invalid = value.trim() !== "" && !isLikelyUrl(value);
        return (
          <label key={key} className="block">
            <span className="mb-1 block text-xs text-mist-400">{label}</span>
            <span className="relative block">
              <Icon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-mist-400" />
              <input
                type="text"
                inputMode="url"
                spellCheck={false}
                placeholder={placeholder}
                value={value}
                onChange={(event) => onChange({ [key]: event.target.value })}
                aria-invalid={invalid}
                className={cn(
                  "h-10 w-full rounded-xl border bg-white/4 pr-3 pl-9 text-sm text-white placeholder:text-mist-400/50 focus:ring-2 focus:ring-brand-500/25 focus:outline-none disabled:opacity-60",
                  invalid
                    ? "border-red-400/60"
                    : "border-white/10 focus:border-brand-400/60",
                )}
              />
            </span>
            {invalid ? (
              <span className="mt-1 block text-xs text-red-300">
                That is not a link we can open — it will be left out.
              </span>
            ) : null}
          </label>
        );
      })}

      <button
        type="button"
        onClick={() => void lookUp()}
        disabled={disabled || searching}
        className="flex items-center gap-1.5 text-sm text-mist-400 transition-colors hover:text-mist-200 disabled:opacity-50"
      >
        {searching ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <Search className="size-3.5" />
        )}
        Find “{(metadata.appName ?? productName).trim() || "this app"}” on the
        App Store
      </button>

      {matches !== null && matches.length === 0 && !searching ? (
        <p className="text-xs text-mist-400">
          Nothing came back. Paste the link above instead.
        </p>
      ) : null}

      {matches && matches.length > 0 ? (
        <ul className="space-y-1.5">
          {matches.map((match) => {
            const chosen = metadata.appStoreUrl === match.appStoreUrl;
            return (
              <li key={match.appStoreUrl}>
                <button
                  type="button"
                  onClick={() =>
                    onChange({
                      appStoreUrl: match.appStoreUrl,
                      appName: match.name,
                    })
                  }
                  aria-pressed={chosen}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-xl border p-2 text-left transition-colors",
                    chosen
                      ? "border-brand-400/60 bg-brand-500/10"
                      : "border-white/8 hover:border-white/20",
                  )}
                >
                  {match.icon ? (
                    <img
                      src={match.icon}
                      alt=""
                      className="size-8 shrink-0 rounded-lg"
                    />
                  ) : (
                    <span className="size-8 shrink-0 rounded-lg bg-white/8" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-white">
                      {match.name}
                    </span>
                    <span className="block truncate text-xs text-mist-400">
                      {match.publisher}
                    </span>
                  </span>
                  {chosen ? (
                    <Check className="size-4 shrink-0 text-brand-300" />
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </fieldset>
  );
};
