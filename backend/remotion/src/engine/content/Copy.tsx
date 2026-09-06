import React from "react";
import { useCurrentFrame } from "remotion";
import { ease, progress, stagger } from "../motion/easing";

const FONT =
  '"SF Pro Display", -apple-system, "Helvetica Neue", Inter, system-ui, sans-serif';

/**
 * Words rise one after another, each on its own curve. `from` is the frame
 * the first word starts; the whole line is up about half a second later.
 * `leave`, when set, is the frame the line starts fading out.
 */
export const Headline: React.FC<{
  text: string;
  size: number;
  from: number;
  leave?: number;
  weight?: number;
  color?: string;
  align?: "left" | "center" | "right";
  letterSpacing?: string;
  maxWidth?: number | string;
  glow?: string;
  style?: React.CSSProperties;
}> = ({
  text,
  size,
  from,
  leave,
  weight = 700,
  color = "#fff",
  align = "center",
  letterSpacing = "-0.03em",
  maxWidth = "90%",
  glow,
  style,
}) => {
  const frame = useCurrentFrame();
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return null;

  const exit = leave === undefined ? 1 : 1 - ease.cinematicIn(progress(frame, leave, leave + 12));

  return (
    <div
      style={{
        fontFamily: FONT,
        fontSize: size,
        fontWeight: weight,
        lineHeight: 1.06,
        letterSpacing,
        color,
        textAlign: align,
        maxWidth,
        opacity: exit,
        textShadow: glow
          ? `0 6px 30px rgba(0,0,0,0.5), 0 0 ${size}px ${glow}`
          : "0 6px 30px rgba(0,0,0,0.55)",
        ...({ textWrap: "balance" } as React.CSSProperties),
        ...style,
      }}
    >
      {words.map((word, index) => {
        const start = from + stagger(index, 3, 24);
        const p = ease.cinematicOut(progress(frame, start, start + 18));
        return (
          <span
            key={`${word}-${index}`}
            style={{
              display: "inline-block",
              marginRight: "0.26em",
              opacity: p,
              transform: `translateY(${(1 - p) * size * 0.5}px)`,
            }}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
};

export const Subline: React.FC<{
  text: string;
  size: number;
  from: number;
  leave?: number;
  color?: string;
  align?: "left" | "center" | "right";
  maxWidth?: number | string;
  style?: React.CSSProperties;
}> = ({ text, size, from, leave, color = "rgba(255,255,255,0.7)", align = "center", maxWidth = "80%", style }) => {
  const frame = useCurrentFrame();
  if (!text.trim()) return null;
  const p = ease.cinematicOut(progress(frame, from, from + 20));
  const exit = leave === undefined ? 1 : 1 - ease.cinematicIn(progress(frame, leave, leave + 12));
  return (
    <div
      style={{
        fontFamily: FONT,
        fontSize: size,
        fontWeight: 500,
        lineHeight: 1.3,
        letterSpacing: "-0.01em",
        color,
        textAlign: align,
        maxWidth,
        opacity: p * exit,
        transform: `translateY(${(1 - p) * size * 0.4}px)`,
        textShadow: "0 4px 20px rgba(0,0,0,0.5)",
        ...({ textWrap: "balance" } as React.CSSProperties),
        ...style,
      }}
    >
      {text}
    </div>
  );
};

export const COPY_FONT = FONT;
