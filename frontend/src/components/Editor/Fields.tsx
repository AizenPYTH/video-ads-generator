import { useRef, useState } from "react";
import { Check, ImagePlus, Loader2, Search, Trash2 } from "lucide-react";
import { api } from "@/services/api";
import { isLikelyUrl } from "@/utils/validation";
import { ASPECT_LABELS } from "@/video/engine/aspect";
import { cn } from "@/lib/utils";
import type { AppStoreMatch, AspectRatio, ImageAsset, ProductLinks } from "@/types";

const INPUT =
  "h-10 w-full rounded-xl border border-white/10 bg-white/4 px-3 text-sm text-white placeholder:text-mist-400/50 focus:border-brand-400/60 focus:ring-2 focus:ring-brand-500/25 focus:outline-none disabled:opacity-60";

export const Section: React.FC<{ title: string; hint?: string; children: React.ReactNode }> = ({ title, hint, children }) => (
  <section>
    <h3 className="mb-2.5 flex items-baseline justify-between text-xs font-semibold tracking-wider text-mist-400 uppercase">
      {title}
      {hint ? <span className="text-[11px] font-normal normal-case tracking-normal text-mist-400/70">{hint}</span> : null}
    </h3>
    {children}
  </section>
);

export const LogoField: React.FC<{
  logo: ImageAsset | null;
  required: boolean;
  onUpload: (file: File) => Promise<string | null>;
  onClear: () => void;
}> = ({ logo, required, onUpload, onClear }) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setError(await onUpload(file));
    setBusy(false);
  };

  return (
    <div className="flex items-center gap-3">
      <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-xl border border-white/10 bg-white/4 p-2">
        {logo ? <img src={logo.url} alt="Logo" className="max-h-full max-w-full object-contain" /> : <ImagePlus className="size-5 text-mist-400" />}
      </div>
      <div className="min-w-0 flex-1">
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          className="hidden"
          onChange={(event) => void pick(event.target.files?.[0])}
        />
        <div className="flex gap-2">
          <button type="button" disabled={busy} onClick={() => inputRef.current?.click()} className="flex h-9 items-center gap-1.5 rounded-lg border border-white/10 px-3 text-sm text-mist-200 hover:border-white/25 disabled:opacity-50">
            {busy ? <Loader2 className="size-3.5 animate-spin" /> : <ImagePlus className="size-3.5" />}
            {logo ? "Replace" : "Upload logo"}
          </button>
          {logo ? (
            <button type="button" onClick={onClear} className="flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm text-mist-400 hover:text-red-300" aria-label="Remove logo">
              <Trash2 className="size-3.5" />
            </button>
          ) : null}
        </div>
        <p className="mt-1.5 text-[11px] text-mist-400">
          PNG, SVG, WebP or JPG. Kept at its own ratio, never stretched.{required ? " Required by this template." : ""}
        </p>
        {error ? <p className="mt-1 text-xs text-red-300">{error}</p> : null}
      </div>
    </div>
  );
};

export const TextFields: React.FC<{
  headline: string;
  subline: string;
  showHeadline: boolean;
  showSubline: boolean;
  onChange: (patch: { headline?: string; subline?: string }) => void;
}> = ({ headline, subline, showHeadline, showSubline, onChange }) => (
  <div className="space-y-2">
    {showHeadline ? (
      <input type="text" maxLength={90} placeholder="Headline - three to seven words" value={headline} onChange={(event) => onChange({ headline: event.target.value })} className={INPUT} />
    ) : null}
    {showSubline ? (
      <input type="text" maxLength={140} placeholder="A line under it (optional)" value={subline} onChange={(event) => onChange({ subline: event.target.value })} className={INPUT} />
    ) : null}
  </div>
);

export const BrandFields: React.FC<{
  name: string;
  primary: string;
  accent: string;
  showColours: boolean;
  onChange: (patch: { brandName?: string; primary?: string; accent?: string }) => void;
}> = ({ name, primary, accent, showColours, onChange }) => (
  <div className="space-y-2">
    <input type="text" maxLength={80} placeholder="Product name" value={name} onChange={(event) => onChange({ brandName: event.target.value })} className={INPUT} />
    {showColours ? (
      <div className="flex gap-2">
        {(
          [
            ["primary", primary, "Backdrop"],
            ["accent", accent, "Light"],
          ] as const
        ).map(([key, value, label]) => (
          <label key={key} className="flex flex-1 items-center gap-2 rounded-xl border border-white/10 bg-white/4 px-2.5 py-1.5">
            <input type="color" value={value} onChange={(event) => onChange({ [key]: event.target.value })} className="size-7 cursor-pointer rounded-md border-0 bg-transparent p-0" aria-label={label} />
            <span className="text-xs text-mist-300">{label}</span>
            <span className="ml-auto font-mono text-[11px] text-mist-400">{value}</span>
          </label>
        ))}
      </div>
    ) : null}
  </div>
);

export const LinkFields: React.FC<{
  links: ProductLinks;
  productName: string;
  onChange: (patch: Partial<ProductLinks>) => void;
}> = ({ links, productName, onChange }) => {
  const [searching, setSearching] = useState(false);
  const [matches, setMatches] = useState<AppStoreMatch[] | null>(null);

  const search = async () => {
    const term = productName.trim();
    if (term.length < 2) return;
    setSearching(true);
    try {
      setMatches((await api.appStore(term)).matches);
    } catch {
      setMatches([]);
    } finally {
      setSearching(false);
    }
  };

  const field = (key: keyof ProductLinks, placeholder: string) => {
    const value = links[key] ?? "";
    const invalid = value.trim() !== "" && !isLikelyUrl(value);
    return (
      <div>
        <input type="text" inputMode="url" spellCheck={false} placeholder={placeholder} value={value} onChange={(event) => onChange({ [key]: event.target.value })} aria-invalid={invalid} className={cn(INPUT, invalid && "border-red-400/60")} />
        {invalid ? <p className="mt-1 text-[11px] text-red-300">Not a link we can open - it will be left out.</p> : null}
      </div>
    );
  };

  return (
    <div className="space-y-2">
      {field("productUrl", "Website - yoursite.com")}
      {field("appStoreUrl", "App Store link (optional)")}
      {field("googlePlayUrl", "Google Play link (optional)")}
      <button type="button" onClick={() => void search()} disabled={searching || productName.trim().length < 2} className="flex items-center gap-1.5 text-xs text-mist-400 hover:text-mist-200 disabled:opacity-50">
        {searching ? <Loader2 className="size-3.5 animate-spin" /> : <Search className="size-3.5" />}
        Find "{productName.trim() || "this app"}" on the App Store
      </button>
      {matches !== null && matches.length === 0 && !searching ? <p className="text-[11px] text-mist-400">Nothing came back. Paste the link above instead.</p> : null}
      {matches && matches.length > 0 ? (
        <ul className="space-y-1.5">
          {matches.map((match) => {
            const chosen = links.appStoreUrl === match.appStoreUrl;
            return (
              <li key={match.appStoreUrl}>
                <button type="button" onClick={() => onChange({ appStoreUrl: match.appStoreUrl })} aria-pressed={chosen} className={cn("flex w-full items-center gap-2.5 rounded-xl border p-2 text-left transition-colors", chosen ? "border-brand-400/60 bg-brand-500/10" : "border-white/8 hover:border-white/20")}>
                  {match.icon ? <img src={match.icon} alt="" className="size-8 shrink-0 rounded-lg" /> : <span className="size-8 shrink-0 rounded-lg bg-white/8" />}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-white">{match.name}</span>
                    <span className="block truncate text-xs text-mist-400">{match.publisher}</span>
                  </span>
                  {chosen ? <Check className="size-4 shrink-0 text-brand-300" /> : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
};

export const FormatPicker: React.FC<{
  available: AspectRatio[];
  selected: AspectRatio[];
  onChange: (aspects: AspectRatio[]) => void;
}> = ({ available, selected, onChange }) => (
  <div className="grid gap-2">
    {available.map((aspect) => {
      const on = selected.includes(aspect);
      return (
        <button key={aspect} type="button" aria-pressed={on} onClick={() => onChange(on ? selected.filter((value) => value !== aspect) : [...selected, aspect])} className={cn("flex items-center gap-3 rounded-xl border px-3 py-2 text-left transition-colors", on ? "border-brand-400/60 bg-brand-500/10" : "border-white/8 hover:border-white/20")}>
          <span className={cn("grid size-5 place-items-center rounded-md border", on ? "border-brand-400 bg-brand-500 text-white" : "border-white/20")}>{on ? <Check className="size-3" /> : null}</span>
          <span className="font-mono text-sm text-white">{aspect}</span>
          <span className="text-xs text-mist-400">{ASPECT_LABELS[aspect].split(" · ")[1]}</span>
        </button>
      );
    })}
    <p className="text-[11px] text-mist-400">Each format renders separately - about a minute each.</p>
  </div>
);
