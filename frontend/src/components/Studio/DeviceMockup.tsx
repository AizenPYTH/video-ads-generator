import { cn } from "@/lib/utils";
import { DEVICE_SPECS } from "./deviceSpecs";
import type { DeviceType } from "@/types";

export const DeviceMockup: React.FC<{
  device: DeviceType;
  /** Frame width in px. Everything else is derived from it. */
  width: number;
  src?: string | undefined;
  alt?: string;
  className?: string;
  /** Slides the screenshot down, so a card and its scene can differ. */
  offset?: number;
}> = ({ device, width, src, alt = "", className, offset = 0 }) => {
  const spec = DEVICE_SPECS[device];
  const bezel = width * spec.bezelRatio;
  const screenWidth = width - bezel * 2;
  const screenHeight = screenWidth / spec.screenAspect;
  const chin = spec.laptop ? bezel * 3.2 : bezel;
  const radius = width * spec.cornerRadiusRatio;

  return (
    <div
      className={cn("relative shrink-0", className)}
      style={{
        width,
        height: screenHeight + bezel + chin,
        borderRadius: radius + bezel,
        padding: bezel,
        boxSizing: "border-box",
        background:
          "linear-gradient(150deg, #3a3a42 0%, #101014 28%, #0a0a0d 70%, #26262c 100%)",
        boxShadow: "0 24px 60px rgba(0,0,0,.55), 0 2px 0 rgba(255,255,255,.06) inset",
      }}
    >
      <div
        className="relative overflow-hidden bg-black"
        style={{ width: screenWidth, height: screenHeight, borderRadius: radius }}
      >
        {src ? (
          <img
            src={src}
            alt={alt}
            loading="lazy"
            className="size-full object-cover transition-[object-position] duration-500"
            style={{ objectPosition: `center ${offset * 100}%` }}
          />
        ) : (
          <div className="size-full bg-linear-to-br from-ink-700 to-ink-900" />
        )}

        {/* One diagonal sheen, the way real glass catches a light. */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(115deg, rgba(255,255,255,.10) 0%, rgba(255,255,255,0) 38%)",
          }}
        />

        {spec.notch && !spec.laptop ? (
          <div
            className="absolute left-1/2 -translate-x-1/2 rounded-full bg-black"
            style={{
              top: screenHeight * 0.012,
              width: screenWidth * 0.3,
              height: Math.max(3, screenWidth * 0.085),
            }}
          />
        ) : null}

        {spec.homeIndicator ? (
          <div
            className="absolute left-1/2 -translate-x-1/2 rounded-full bg-white/75"
            style={{
              bottom: screenHeight * 0.01,
              width: screenWidth * 0.34,
              height: Math.max(2, screenWidth * 0.012),
            }}
          />
        ) : null}
      </div>

      {spec.laptop ? (
        <div
          className="absolute left-1/2 -translate-x-1/2 rounded-full bg-white/20"
          style={{
            bottom: chin * 0.42,
            width: screenWidth * 0.22,
            height: Math.max(2, bezel * 0.35),
          }}
        />
      ) : null}
    </div>
  );
};
