import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Clock, Laptop, Monitor, Smartphone, Sparkles } from "lucide-react";
import { LivePreview, PreviewFrame } from "@/components/Editor/LivePreview";
import { placeholderInput } from "@/video/engine/placeholders";
import { FPS } from "@/video/engine/aspect";
import { cn } from "@/lib/utils";
import { CATEGORY_LABELS } from "./categories";
import type { AspectRatio, TemplateCategory, TemplateDefinition } from "@/types";

const CATEGORY_ICON: Record<TemplateCategory, typeof Laptop> = {
  laptop: Laptop,
  phone: Smartphone,
  desktop: Monitor,
  duo: Sparkles,
  logo: Sparkles,
};

/** Which aspect a card shows. Square is the honest middle for a grid. */
function cardAspect(template: TemplateDefinition): AspectRatio {
  if (template.aspects.includes("1:1")) return "1:1";
  return template.aspects[0] ?? "1:1";
}

/**
 * A template in the gallery, with the device empty. A single frame until
 * the card is hovered or visible, then the real animation: ten players at
 * 30 fps is a fan, one at a time is a preview.
 */
export const TemplateCard: React.FC<{ template: TemplateDefinition }> = ({ template }) => {
  const [hovered, setHovered] = useState(false);
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const input = useMemo(() => placeholderInput(template), [template]);
  const aspect = cardAspect(template);
  const Icon = CATEGORY_ICON[template.category];

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(Boolean(entry?.isIntersecting)),
      { threshold: 0.6 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const playing = hovered || visible;

  return (
    <Link
      to={`/t/${template.id}`}
      className="group block focus-visible:outline-none"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        ref={ref}
        className={cn(
          "panel panel-hover overflow-hidden rounded-2xl p-2 transition-transform duration-300 group-hover:-translate-y-0.5 group-focus-visible:ring-2 group-focus-visible:ring-brand-400/70",
        )}
      >
        <div className="relative overflow-hidden rounded-[14px] bg-black">
          {playing ? (
            <LivePreview template={template} input={input} aspect={aspect} controls={false} />
          ) : (
            <PreviewFrame template={template} input={input} aspect={aspect} />
          )}
          <span className="pointer-events-none absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur">
            <Icon className="size-3" />
            {CATEGORY_LABELS[template.category]}
          </span>
          <span className="pointer-events-none absolute top-3 right-3 flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur">
            <Clock className="size-3" />
            {Math.round(template.durationInFrames / FPS)}s
          </span>
        </div>
        <div className="px-2.5 pt-3 pb-1.5">
          <h3 className="text-[15px] font-semibold text-white">{template.name}</h3>
          <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-mist-400">{template.tagline}</p>
          <p className="mt-2.5 flex gap-1.5">
            {template.aspects.map((value) => (
              <span key={value} className="rounded-md border border-white/10 px-1.5 py-0.5 font-mono text-[10px] text-mist-300">
                {value}
              </span>
            ))}
          </p>
        </div>
      </div>
    </Link>
  );
};
