import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { easingFor } from "../animations";
import { progressIn } from "../phases";
import { DEVICE_SPECS } from "../../../src/utils/constants";
import type { AnimatedDeviceProps } from "./stage";

/**
 * Lid angles, as a CSS `rotateX` about the hinge along the lid's bottom edge.
 *
 * The camera looks horizontally at the laptop, so the page plane is the
 * camera plane, not the table: an open screen sits near 0deg (leaning a few
 * degrees back), and the deck is tipped `DECK_TILT` out of that plane toward
 * the viewer. Closing the lid folds it down onto the deck, which is 180deg
 * minus that tilt away - hence the negative angle. Between the two, the
 * screen turns to face the camera as the lid passes -90deg, which is what
 * makes the open read as an open rather than a flat rectangle rotating.
 */
const DECK_TILT = 72;
const LID_CLOSED = -(180 - DECK_TILT);
const LID_OPEN = 8;

/** The lid has turned far enough that its screen faces the camera. */
const LID_FACING = -90;
/** ...and far enough that the screen is worth lighting up. */
const LID_LIT = -34;

/**
 * How much of the deck's depth is left after foreshortening, and how far it
 * reaches toward the camera. Both are the tilt resolved into the two axes.
 */
const DECK_VISIBLE = Math.cos((DECK_TILT * Math.PI) / 180);

export const MacbookAnimated: React.FC<AnimatedDeviceProps> = ({
  device,
  theme,
  phases,
  box,
  screen,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const spec = DEVICE_SPECS[device];

  // Geometry, built from the lid outward: screen, bezels, the chin that
  // carries the wordmark, then a deck about as deep as the screen is tall.
  const width = box.width * 0.99;
  const bezel = width * spec.bezelRatio;
  const screenWidth = width - bezel * 2;
  const screenHeight = screenWidth / spec.screenAspect;
  const chin = bezel * 3.4;
  const lidHeight = screenHeight + bezel + chin;
  const deckDepth = lidHeight * 0.72;
  const deckVisible = deckDepth * DECK_VISIBLE;

  // Perspective magnifies whatever leans toward the camera - the deck always,
  // the lid while it is still shut. Pushing the assembly half a lid back
  // centres it on the projection plane, and the margin covers the rest.
  const depthOffset = -lidHeight * 0.5;
  const naturalHeight = (lidHeight + deckVisible) * 1.12;
  const fit = Math.min(1, box.height / naturalHeight);

  const introRaw = progressIn(frame, 0, phases.introEnd);
  // The lid does not snap open: slow to break the seal, quick through the
  // middle, slow as it settles. That single easing is most of the effect.
  const lidAngle = interpolate(
    easingFor("easeInOut")(introRaw),
    [0, 1],
    [LID_CLOSED, LID_OPEN],
  );
  const appear = interpolate(introRaw, [0, 0.18], [0, 1], {
    extrapolateRight: "clamp",
  });

  // The screen only lights up once it is actually facing the camera.
  const screenLit = interpolate(lidAngle, [LID_FACING, LID_LIT], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const seconds = (frame - phases.introEnd) / fps;
  const idle = easingFor("easeOutCubic")(introRaw);
  const breath = 1 + Math.sin((seconds * Math.PI * 2) / 6) * 0.012 * idle;
  const glow = (0.1 + Math.sin((seconds * Math.PI * 2) / 4) * 0.05) * idle * screenLit;

  // A slow push in on the screen through the content act.
  const contentRaw = progressIn(frame, phases.introEnd, phases.contentEnd);
  const screenZoom = interpolate(contentRaw, [0, 1], [1, 1.06]);

  const outro = easingFor("easeInOut")(
    progressIn(frame, phases.contentEnd, phases.outroEnd),
  );
  const outroScale = interpolate(outro, [0, 1], [1, 0.88]);

  const aluminium =
    "linear-gradient(168deg, #d8d9de 0%, #b6b8bf 34%, #94969e 68%, #cfd1d6 100%)";

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        perspective: Math.max(box.width, box.height) * 2.4,
        perspectiveOrigin: "50% 34%",
      }}
    >
      <div
        style={{
          position: "relative",
          width,
          height: lidHeight + deckVisible,
          transformStyle: "preserve-3d",
          opacity: appear,
          transform: `scale(${fit * breath * outroScale}) translateZ(${depthOffset}px)`,
        }}
      >
        {/* Glow spilling out of the open screen onto the backdrop. */}
        <div
          style={{
            position: "absolute",
            left: -width * 0.12,
            top: -lidHeight * 0.08,
            width: width * 1.24,
            height: lidHeight * 1.1,
            background: `radial-gradient(ellipse at 50% 45%, ${theme.glowA} 0%, transparent 68%)`,
            opacity: glow * 6,
            filter: "blur(30px)",
            pointerEvents: "none",
          }}
        />

        {/* Deck. Wider at the front edge so it reads as receding. */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: lidHeight,
            width,
            height: deckDepth,
            transformOrigin: "top center",
            transform: `rotateX(${DECK_TILT}deg)`,
            background: aluminium,
            borderRadius: `${bezel}px ${bezel}px ${bezel * 2.6}px ${bezel * 2.6}px`,
            boxShadow: `0 ${deckDepth * 0.3}px ${deckDepth * 0.9}px rgba(0,0,0,0.55)`,
            overflow: "hidden",
          }}
        >
          {/* Keyboard well and trackpad, suggested rather than drawn. */}
          <div
            style={{
              position: "absolute",
              left: "8%",
              top: "14%",
              width: "84%",
              height: "44%",
              borderRadius: bezel * 0.6,
              background:
                "linear-gradient(180deg, #26262b 0%, #1b1b20 60%, #303036 100%)",
              opacity: 0.9,
            }}
          />
          <div
            style={{
              position: "absolute",
              left: "34%",
              top: "66%",
              width: "32%",
              height: "26%",
              borderRadius: bezel * 0.5,
              background:
                "linear-gradient(180deg, rgba(0,0,0,0.14) 0%, rgba(0,0,0,0.05) 100%)",
              border: "1px solid rgba(0,0,0,0.12)",
            }}
          />
          {/* Hinge shadow where the lid meets the deck. */}
          <div
            style={{
              position: "absolute",
              inset: `0 0 auto 0`,
              height: deckDepth * 0.16,
              background:
                "linear-gradient(180deg, rgba(0,0,0,0.5) 0%, transparent 100%)",
            }}
          />
        </div>

        {/* Lid. Hinged on its bottom edge, which sits on the deck's top edge. */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width,
            height: lidHeight,
            transformOrigin: "bottom center",
            transformStyle: "preserve-3d",
            transform: `rotateX(${lidAngle}deg)`,
          }}
        >
          {/* Front: bezel + screen. */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              backfaceVisibility: "hidden",
              borderRadius: `${bezel * 2.2}px ${bezel * 2.2}px ${bezel}px ${bezel}px`,
              background:
                "linear-gradient(160deg, #303036 0%, #131317 26%, #0b0b0e 74%, #232329 100%)",
              padding: bezel,
              boxSizing: "border-box",
              boxShadow: theme.deviceShadow,
            }}
          >
            <div
              style={{
                position: "relative",
                width: screenWidth,
                height: screenHeight,
                borderRadius: width * spec.cornerRadiusRatio,
                overflow: "hidden",
                background: "#000",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  opacity: screenLit,
                  transform: `scale(${screenZoom})`,
                  transformOrigin: "center",
                }}
              >
                {screen({ width: screenWidth, height: screenHeight })}
              </div>

              {/* Reflection sliding across the glass as the lid settles. */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: `linear-gradient(${104 + introRaw * 26}deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0) 46%)`,
                  pointerEvents: "none",
                }}
              />
            </div>

            {/* Chin wordmark. */}
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: chin * 0.3,
                textAlign: "center",
                fontFamily: theme.fontFamily,
                fontSize: chin * 0.34,
                letterSpacing: "0.14em",
                color: "rgba(255,255,255,0.24)",
              }}
            >
              {spec.label.split(" ")[0]}
            </div>
          </div>

          {/* Back: the aluminium the viewer sees while the lid is shut. */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              backfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
              borderRadius: `${bezel * 2.2}px ${bezel * 2.2}px ${bezel}px ${bezel}px`,
              background: aluminium,
              boxShadow: "0 30px 80px rgba(0,0,0,0.6)",
            }}
          >
            <div
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                width: width * 0.13,
                height: width * 0.13,
                marginLeft: -width * 0.065,
                marginTop: -width * 0.065,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.5)",
                boxShadow: "inset 0 2px 8px rgba(0,0,0,0.15)",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
