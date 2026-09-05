import type { VideoCompositionProps } from "../../src/types";

/** Only used by `remotion studio` so the compositions open with something. */
export const defaultProps: VideoCompositionProps = {
  productName: "Acme",
  cta: {
    headline: "Visit Acme",
    url: "acme.example",
    hint: "Scan to open",
    qrCode: null,
  },
  style: "apple_premium",
  device: "iphone_15_pro",
  palette: {
    primary: "#5b6cff",
    secondary: "#8b5cf6",
    accent: "#22d3ee",
    background: "#0b0b12",
    text: "#f8fafc",
  },
  assets: [
    {
      id: "screenshot_main",
      url: "https://remotion.dev/img/logo-small.png",
      width: 1170,
      height: 2532,
      label: "Placeholder",
    },
  ],
  storyboard: {
    id: "demo",
    title: "Demo",
    concept: "Preview",
    description: "Placeholder storyboard for the Remotion studio.",
    style: "apple_premium",
    device: "iphone_15_pro",
    totalDuration: 10,
    scenes: [
      {
        id: 1,
        name: "Hero",
        duration: 5,
        description: "Push in on the product.",
        actions: [
          {
            type: "display",
            target: "screenshot_main",
            animation: "zoomIn",
            duration: 5,
            easing: "easeOut",
            delay: 0,
          },
        ],
        textOverlay: {
          content: "Built for speed",
          position: "bottom",
          fontSize: 60,
          color: "#ffffff",
          animation: "slideInBottom",
        },
      },
      {
        id: 2,
        name: "Close",
        duration: 5,
        description: "Land on the CTA.",
        actions: [
          {
            type: "display",
            target: "screenshot_main",
            animation: "scaleUp",
            duration: 5,
            easing: "easeOutCubic",
            delay: 0,
          },
        ],
        textOverlay: {
          content: "Try it free",
          position: "bottom",
          fontSize: 64,
          color: "#ffffff",
          animation: "fadeIn",
        },
      },
    ],
  },
};
