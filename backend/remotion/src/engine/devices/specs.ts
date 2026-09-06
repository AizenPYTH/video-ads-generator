import type { DeviceKind } from "../types";

/**
 * Physical proportions, as ratios of the device width so any device can be
 * drawn at any size. Real-world values, because a laptop whose deck is the
 * wrong depth reads as a toy before anyone can say why.
 */
export interface MacBookSpec {
  screenAspect: number;
  /** Bezel around the screen, / width. */
  bezel: number;
  /** Extra bezel under the screen carrying the wordmark, / width. */
  chin: number;
  /** Deck depth, / width. A 14" MacBook Pro is 312 x 221 mm. */
  deckDepth: number;
  /** Lid thickness, / width. */
  lidThickness: number;
  deckThickness: number;
  cornerRadius: number;
  /** Lid angle when open, degrees back from vertical. */
  openLean: number;
}

export const MACBOOK: MacBookSpec = {
  screenAspect: 3024 / 1964,
  bezel: 0.014,
  chin: 0.03,
  deckDepth: 221 / 312,
  lidThickness: 0.012,
  deckThickness: 0.026,
  cornerRadius: 0.018,
  openLean: 12,
};

export interface IPhoneSpec {
  screenAspect: number;
  /** Body aspect (width / height). 15 Pro: 70.6 x 146.6 mm. */
  bodyAspect: number;
  bezel: number;
  cornerRadius: number;
  /** Body thickness, / width. 8.25 mm on a 70.6 mm body. */
  thickness: number;
  island: { width: number; height: number; top: number };
}

export const IPHONE: IPhoneSpec = {
  screenAspect: 1179 / 2556,
  bodyAspect: 70.6 / 146.6,
  bezel: 0.03,
  cornerRadius: 0.16,
  thickness: 0.117,
  island: { width: 0.3, height: 0.085, top: 0.02 },
};

export interface MonitorSpec {
  screenAspect: number;
  bezel: number;
  cornerRadius: number;
  thickness: number;
  /** Stand neck: width and height / panel width. */
  neck: { width: number; height: number };
  /** Foot: width and depth / panel width. */
  foot: { width: number; depth: number; thickness: number };
}

export const MONITOR: MonitorSpec = {
  screenAspect: 16 / 9,
  bezel: 0.014,
  cornerRadius: 0.012,
  thickness: 0.03,
  neck: { width: 0.11, height: 0.17 },
  foot: { width: 0.34, depth: 0.22, thickness: 0.012 },
};

export const DEVICE_LABELS: Record<DeviceKind, string> = {
  macbook: "MacBook Pro",
  iphone: "iPhone",
  monitor: "Studio Display",
};

/** Screen aspect for the capture surface a device expects. */
export const DEVICE_SURFACE: Record<DeviceKind, "mobile" | "desktop"> = {
  macbook: "desktop",
  iphone: "mobile",
  monitor: "desktop",
};
