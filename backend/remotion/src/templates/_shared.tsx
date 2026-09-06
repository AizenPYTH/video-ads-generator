import React from "react";
import { useCurrentFrame } from "remotion";
import { BoxAt } from "../engine/scene/Overlay";
import { Headline, Subline } from "../engine/content/Copy";
import { Logo } from "../engine/content/Logo";
import { ease, progress } from "../engine/motion/easing";
import { rgba } from "../engine/palette";
import type { Layout } from "../engine/layout";
import type { Brand, Copy, ImageAsset, TemplateDefinition } from "../engine/types";

/**
 * The parts most templates share verbatim: the copy band and the small
 * logo signature. Kept here so a template file is only its shot.
 */
export const CopyBand: React.FC<{
  layout: Layout;
  copy: Copy;
  brand: Brand;
  from: number;
  leave: number;
}> = ({ layout: L, copy, brand, from, leave }) => (
  <BoxAt
    box={L.copy}
    align={L.align === "left" ? "flex-start" : "center"}
    justify={L.aspect === "16:9" ? "center" : "flex-start"}
  >
    {copy.headline ? (
      <Headline text={copy.headline} size={L.headlineSize} from={from} leave={leave} align={L.align} glow={rgba(brand.accent, 0.25)} />
    ) : null}
    {copy.subline ? (
      <Subline text={copy.subline} size={L.sublineSize} from={from + 10} leave={leave} align={L.align} style={{ marginTop: L.unit * 0.02 }} />
    ) : null}
  </BoxAt>
);

export const Signature: React.FC<{
  layout: Layout;
  logo: ImageAsset | null;
  from: number;
  leave: number;
}> = ({ layout: L, logo, from, leave }) => {
  const frame = useCurrentFrame();
  if (!logo) return null;
  const p = progress(frame, from, from + 24) * (1 - ease.cinematicIn(progress(frame, leave - 6, leave + 8)));
  return (
    <BoxAt box={L.signature} align={L.align === "left" ? "flex-start" : "center"}>
      <Logo asset={logo} width={L.signature.width} height={L.signature.height} reveal="rise" progress={p} />
    </BoxAt>
  );
};

/** Tall captures go to phones, wide ones to laptops and monitors. */
export function splitBySurface(screens: ImageAsset[]): { mobile: ImageAsset[]; desktop: ImageAsset[] } {
  const mobile = screens.filter((s) => s.height >= s.width);
  const desktop = screens.filter((s) => s.width > s.height);
  return {
    mobile: mobile.length > 0 ? mobile : screens,
    desktop: desktop.length > 0 ? desktop : screens,
  };
}

export const STANDARD_SLOTS: TemplateDefinition["slots"] = {
  screens: { min: 1, max: 4, surface: "desktop" },
  logo: "optional",
  headline: true,
  subline: true,
  cta: true,
  accent: true,
  duration: null,
};
