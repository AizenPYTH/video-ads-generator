import type { DeviceType } from "@/types";

/**
 * The same geometry the renderer uses, so what you approve on screen is the
 * frame that comes out of the encoder. Bezel and corner radius are fractions
 * of the device width, which is why one mockup holds up at 92px in a card
 * and at 400px in the preview.
 */
interface Spec {
  /** screen width / screen height */
  screenAspect: number;
  bezelRatio: number;
  cornerRadiusRatio: number;
  notch: boolean;
  homeIndicator: boolean;
  laptop: boolean;
}

export const DEVICE_SPECS: Record<DeviceType, Spec> = {
  iphone_15_pro: { screenAspect: 1179 / 2556, bezelRatio: 0.022, cornerRadiusRatio: 0.11, notch: true, homeIndicator: true, laptop: false },
  iphone_15: { screenAspect: 1179 / 2556, bezelRatio: 0.026, cornerRadiusRatio: 0.11, notch: true, homeIndicator: true, laptop: false },
  iphone_14: { screenAspect: 1170 / 2532, bezelRatio: 0.028, cornerRadiusRatio: 0.1, notch: true, homeIndicator: true, laptop: false },
  android_phone: { screenAspect: 1080 / 2400, bezelRatio: 0.02, cornerRadiusRatio: 0.07, notch: false, homeIndicator: false, laptop: false },
  ipad_pro: { screenAspect: 1668 / 2388, bezelRatio: 0.035, cornerRadiusRatio: 0.045, notch: false, homeIndicator: true, laptop: false },
  macbook_14: { screenAspect: 3024 / 1964, bezelRatio: 0.012, cornerRadiusRatio: 0.012, notch: true, homeIndicator: false, laptop: true },
  macbook_16: { screenAspect: 3456 / 2234, bezelRatio: 0.011, cornerRadiusRatio: 0.011, notch: true, homeIndicator: false, laptop: true },
  desktop_27: { screenAspect: 16 / 9, bezelRatio: 0.018, cornerRadiusRatio: 0.008, notch: false, homeIndicator: false, laptop: true },
  desktop_monitor: { screenAspect: 16 / 9, bezelRatio: 0.02, cornerRadiusRatio: 0.006, notch: false, homeIndicator: false, laptop: true },
};

export function deviceIsWide(device: DeviceType): boolean {
  return DEVICE_SPECS[device].screenAspect > 1;
}
