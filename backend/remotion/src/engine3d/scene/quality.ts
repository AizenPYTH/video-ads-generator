import { createContext, useContext } from "react";

/**
 * Two quality levels. The preview has to stay fluid in a browser tab
 * beside an editor; the server render has all the time it wants.
 */
export interface Quality {
  level: "preview" | "render";
  dpr: number;
  shadowMap: number;
  envResolution: number;
  contactShadowResolution: number;
  /** Long edge of the screen canvas texture. */
  screenTexture: number;
  antialias: boolean;
}

export const PREVIEW_QUALITY: Quality = {
  level: "preview",
  dpr: 1,
  shadowMap: 1024,
  envResolution: 128,
  contactShadowResolution: 256,
  screenTexture: 1024,
  antialias: true,
};

export const RENDER_QUALITY: Quality = {
  level: "render",
  dpr: 1,
  shadowMap: 2048,
  envResolution: 256,
  contactShadowResolution: 512,
  screenTexture: 1536,
  antialias: true,
};

export const QualityContext = createContext<Quality>(PREVIEW_QUALITY);
export const useQuality = (): Quality => useContext(QualityContext);
