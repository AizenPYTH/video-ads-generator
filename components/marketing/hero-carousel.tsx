"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

export type HeroSlide = {
  src: string;
  alt: string;
};

type HeroCarouselProps = {
  slides: HeroSlide[];
  intervalMs?: number;
  className?: string;
};

export function HeroCarousel({
  slides,
  intervalMs = 5000,
  className,
}: HeroCarouselProps) {
  const [index, setIndex] = useState(0);
  const count = slides.length;

  useEffect(() => {
    if (count <= 1) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % count);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [count, intervalMs]);

  if (count === 0) return null;

  return (
    <div className={cn("relative w-full", className)}>
      <div className="relative aspect-[16/9] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10">
        {slides.map((slide, i) => (
          <div
            key={slide.src}
            className={cn(
              "absolute inset-0 transition-opacity duration-700",
              i === index ? "opacity-100" : "opacity-0 pointer-events-none",
            )}
            aria-hidden={i !== index}
          >
            <Image
              src={slide.src}
              alt={slide.alt}
              fill
              priority={i === 0}
              sizes="(max-width: 768px) 100vw, 560px"
              className="object-contain object-center p-2 sm:p-4"
            />
          </div>
        ))}
      </div>
      {count > 1 && (
        <div className="mt-4 flex justify-center gap-2">
          {slides.map((slide, i) => (
            <button
              key={slide.src}
              type="button"
              aria-label={`Slide ${i + 1}`}
              aria-current={i === index}
              onClick={() => setIndex(i)}
              className={cn(
                "h-2 w-2 rounded-full transition-colors",
                i === index ? "bg-sky-500" : "bg-slate-300 hover:bg-slate-400",
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
