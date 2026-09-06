import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Clock, Laptop, Monitor, Smartphone, Sparkles } from "lucide-react";
import { FPS } from "@/video/engine/aspect";
import { cn } from "@/lib/utils";
import { CATEGORY_LABELS } from "./categories";
import type { TemplateCategory, TemplateDefinition } from "@/types";

const CATEGORY_ICON: Record<TemplateCategory, typeof Laptop> = {
  laptop: Laptop,
  phone: Smartphone,
  desktop: Monitor,
  duo: Sparkles,
  logo: Sparkles,
};

/** Pre-rendered by `backend/scripts/render-previews.mjs`. */
const posterUrl = (id: string) => `/previews/${id}.jpg`;
const previewUrl = (id: string) => `/previews/${id}.mp4`;

/**
 * A template in the gallery. A poster image by default; the pre-rendered
 * preview loop plays on hover or when the card is the one in view. No
 * WebGL here at all - ten live scenes on one page is a fan, and a 540p
 * loop shows the same motion for nothing.
 */
export const TemplateCard: React.FC<{ template: TemplateDefinition }> = ({ template }) => {
  const [hovered, setHovered] = useState(false);
  const [visible, setVisible] = useState(false);
  const [posterMissing, setPosterMissing] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const Icon = CATEGORY_ICON[template.category];

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setVisible(Boolean(entry?.isIntersecting)), { threshold: 0.75 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const playing = hovered || visible;

  // Play/pause imperatively: `autoPlay` would start every card at once.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (playing) {
      void video.play().catch(() => undefined);
    } else {
      video.pause();
    }
  }, [playing]);

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
        <div className="relative aspect-square overflow-hidden rounded-[14px] bg-black">
          {posterMissing ? (
            <div className="grid h-full w-full place-items-center text-xs text-mist-400">Preview not rendered yet</div>
          ) : (
            <>
              <img
                src={posterUrl(template.id)}
                alt=""
                loading="lazy"
                onError={() => setPosterMissing(true)}
                className={cn("absolute inset-0 h-full w-full object-cover transition-opacity duration-300", playing ? "opacity-0" : "opacity-100")}
              />
              {playing ? (
                <video
                  ref={videoRef}
                  src={previewUrl(template.id)}
                  poster={posterUrl(template.id)}
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : null}
            </>
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
