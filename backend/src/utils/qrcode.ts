import QRCode from "qrcode";
import { logger } from "./logger";

/**
 * Renders a URL as a PNG data URI sized for the video outro.
 *
 * White-on-black, because the CTA overlay is a dark scrim: the usual
 * black-on-white code would sit on the frame as a bright rectangle. Error
 * correction stays at the default M - the code is displayed on a screen, not
 * printed, so there is nothing to survive.
 *
 * Never throws. A missing QR code costs the viewer a scan; a failed render
 * costs them the whole ad.
 */
export async function generateQrCode(url: string): Promise<string | null> {
  try {
    return await QRCode.toDataURL(url, {
      width: 320,
      margin: 2,
      color: { dark: "#ffffff", light: "#00000000" },
    });
  } catch (error) {
    logger.warn({ error, url }, "qr code generation failed");
    return null;
  }
}
