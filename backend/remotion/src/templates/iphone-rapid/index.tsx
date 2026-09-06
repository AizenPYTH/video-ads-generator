import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Environment } from "../../engine/scene/Environment";
import { Stage, Placed } from "../../engine/scene/Stage";
import { IPhone, iphoneGeometry } from "../../engine/devices/IPhone";
import { ScreenSequence, scheduleScreens } from "../../engine/content/ScreenSequence";
import { EndCard } from "../../engine/content/EndCard";
import { addCamera, cameraAt } from "../../engine/motion/camera";
import { drift, DRIFT_PERIODS, ease, progress } from "../../engine/motion/easing";
import { layoutFor } from "../../engine/layout";
import { rgba } from "../../engine/palette";
import { CopyBand, Signature } from "../_shared";
import type { TemplateDefinition, TemplateInput } from "../../engine/types";

const DURATION = 240;
const T = { enterEnd: 24, seqStart: 20, seqEnd: 196, headline: 28, copyLeave: 190, endCard: 200 };
const HOLD_SECONDS = 0.85;

/**
 * Front-on and fast. The screens cut every 0.85s with a slide, and the
 * phone takes the hit each time - a small kick in scale and roll that
 * decays over a few frames. Built for a beat.
 */
const Component: React.FC<TemplateInput> = ({ screens, logo, brand, copy, cta }) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const L = layoutFor(width, height);
  const t = frame / fps;
  const wide = L.aspect === "16:9";

  const phoneWidth = Math.min(L.device.height * (wide ? 0.44 : 0.4), L.device.width * (wide ? 0.4 : 0.48));
  const g = iphoneGeometry(phoneWidth);
  const centreX = L.device.x + L.device.width / 2 - width / 2;
  const centreY = L.device.y + L.device.height / 2 - height / 2;

  const hold = Math.round(fps * HOLD_SECONDS);
  const slots = scheduleScreens(screens.length, T.seqStart, T.seqEnd, hold);

  // The kick: at every cut, a 0.06 scale bump and a 2.5deg roll, decaying.
  let kick = 0;
  let kickSign = 1;
  for (const [index, slot] of slots.entries()) {
    if (index === 0) continue;
    const since = frame - slot.start;
    if (since >= 0 && since < 14) {
      const decay = Math.exp(-since * 0.32) * Math.cos(since * 0.9);
      kick = Math.max(kick, Math.max(0, decay));
      kickSign = index % 2 === 0 ? 1 : -1;
    }
  }

  const enter = ease.settle(progress(frame, 0, T.enterEnd));
  const scale = 0.7 + 0.3 * enter + kick * 0.05;
  const roll = kick * 2.5 * kickSign;
  const yaw = drift(t, DRIFT_PERIODS.medium, 5, 1) + kick * 4 * kickSign;
  const pitch = drift(t, DRIFT_PERIODS.slow, 3, 3);

  const move = cameraAt(frame, [
    { at: 0, dolly: 1, orbitX: 0 },
    { at: T.seqEnd, dolly: 1.06, easing: ease.smooth },
    { at: T.endCard + 20, dolly: 0.98, easing: ease.cinematicInOut },
  ]);
  const camera = addCamera(move, { y: drift(t, DRIFT_PERIODS.breath, L.unit * 0.004, 2) });

  const exposure = ease.cinematicOut(progress(frame, 0, 12));
  const endDim = ease.cinematicIn(progress(frame, T.endCard, T.endCard + 16));

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <Environment primary={brand.primary} accent={brand.accent} exposure={(exposure + kick * 0.35) * (1 - endDim * 0.6)} keyLight={{ x: 0.5, y: 0.15 }} grain={false} />
      <Stage camera={camera} origin={{ x: 0.5, y: 0.5 }}>
        <Placed x={centreX} y={centreY} width={0} height={0}>
          <Placed x={0} y={0} z={-g.width * 0.7} width={g.width * 2.4} height={g.height * 1.5}>
            <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: `radial-gradient(ellipse at center, ${rgba(brand.accent, 0.4 + kick * 0.3)} 0%, transparent 60%)`, filter: "blur(50px)", opacity: enter }} />
          </Placed>
          <IPhone
            width={phoneWidth}
            brightness={enter}
            sheenAngle={112 + yaw}
            transform={`scale(${scale}) rotateY(${yaw}deg) rotateX(${pitch}deg) rotateZ(${roll}deg)`}
            screen={(dims) => (
              <ScreenSequence screens={screens} width={dims.width} height={dims.height} from={T.seqStart} to={T.endCard + 10} hold={hold} transition="slide-left" transitionFrames={7} scrollAmount={0.3} dim={endDim * 0.7} />
            )}
          />
        </Placed>
      </Stage>
      <CopyBand layout={L} copy={copy} brand={brand} from={T.headline} leave={T.copyLeave} />
      <Signature layout={L} logo={logo} from={16} leave={T.endCard} />
      <EndCard from={T.endCard} cta={cta} brand={brand} logo={logo} badges="both" />
    </AbsoluteFill>
  );
};

export const template: TemplateDefinition = {
  id: "iphone-rapid",
  name: "iPhone — Rapid Cuts",
  tagline: "Front-on and fast: a screen every beat, and the phone takes the hit each time.",
  category: "phone",
  devices: ["iphone"],
  durationInFrames: DURATION,
  aspects: ["9:16", "1:1", "16:9"],
  slots: { screens: { min: 2, max: 8, surface: "mobile" }, logo: "optional", headline: true, subline: false, cta: true, accent: true, duration: null },
  component: Component,
};
