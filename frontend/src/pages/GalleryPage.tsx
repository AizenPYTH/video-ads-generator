import { useState } from "react";
import { TemplateCard } from "@/components/Gallery/TemplateCard";
import { CATEGORY_LABELS } from "@/components/Gallery/categories";
import { TEMPLATES } from "@/video/engine/registry";
import { cn } from "@/lib/utils";
import type { TemplateCategory } from "@/types";

const ORDER: TemplateCategory[] = ["laptop", "phone", "desktop", "duo", "logo"];

/**
 * The library first. A visitor should understand in a few seconds: pick
 * an animation, hand over your site or app, your product ends up inside.
 */
export default function GalleryPage() {
  const [filter, setFilter] = useState<TemplateCategory | "all">("all");
  const present = ORDER.filter((category) => TEMPLATES.some((t) => t.category === category));
  const shown = filter === "all" ? TEMPLATES : TEMPLATES.filter((t) => t.category === filter);

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-10">
      <header className="mb-8 max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Pick an animation.
          <br />
          <span className="bg-linear-to-r from-brand-400 to-accent-300 bg-clip-text text-transparent">
            Your product goes inside.
          </span>
        </h1>
        <p className="mt-3 text-[15px] text-mist-400">
          Each template is a finished motion design shot. Give it your website or your app and
          it films your screens in place - in 9:16, 16:9 or 1:1.
        </p>
      </header>

      <div role="tablist" aria-label="Template categories" className="mb-6 flex flex-wrap gap-2">
        {(["all", ...present] as const).map((value) => (
          <button
            key={value}
            role="tab"
            aria-selected={filter === value}
            onClick={() => setFilter(value)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
              filter === value
                ? "border-brand-400/60 bg-brand-500/15 text-white"
                : "border-white/10 text-mist-400 hover:border-white/20 hover:text-mist-200",
            )}
          >
            {value === "all" ? `All · ${TEMPLATES.length}` : CATEGORY_LABELS[value]}
          </button>
        ))}
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((template) => (
          <TemplateCard key={template.id} template={template} />
        ))}
      </div>
    </div>
  );
}
