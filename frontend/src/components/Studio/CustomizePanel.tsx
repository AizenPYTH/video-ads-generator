import { useState } from "react";
import { ArrowLeft, Clapperboard } from "lucide-react";
import { Button } from "@/components/Common/Button";
import { Spinner } from "@/components/Common/Loader";
import { DeviceMockup } from "./DeviceMockup";
import { MetadataForm } from "./MetadataForm";
import { deviceIsWide } from "./deviceSpecs";
import { assetsForDevice } from "@/utils/assets";
import { Timeline, ScenePreview } from "./Timeline";
import { cn } from "@/lib/utils";
import { DEVICE_LABELS, STYLE_LABELS } from "@/utils/formatting";
import type {
  AssetRef,
  DeviceType,
  ProductMetadata,
  Storyboard,
  VideoStyle,
} from "@/types";

const STYLES = Object.keys(STYLE_LABELS) as VideoStyle[];
const DEVICES = Object.keys(DEVICE_LABELS) as DeviceType[];

/** A swatch of what each look does to the backdrop, not just its name. */
const STYLE_SWATCH: Record<VideoStyle, string> = {
  apple_premium: "linear-gradient(150deg,#0b0b10,#241a4d 55%,#0b0b10)",
  dynamic_startup: "linear-gradient(150deg,#2a1052,#6d28d9 45%,#db2777)",
  minimal_dark: "linear-gradient(150deg,#000,#101014)",
};

export const CustomizePanel: React.FC<{
  storyboard: Storyboard;
  assets: AssetRef[];
  style: VideoStyle;
  device: DeviceType;
  metadata: ProductMetadata;
  productName: string;
  busy: boolean;
  onStyle: (style: VideoStyle) => void;
  onDevice: (device: DeviceType) => void;
  onMetadata: (patch: Partial<ProductMetadata>) => void;
  onBack: () => void;
  onGenerate: () => void;
}> = ({
  storyboard,
  assets,
  style,
  device,
  metadata,
  productName,
  busy,
  onStyle,
  onDevice,
  onMetadata,
  onBack,
  onGenerate,
}) => {
  // Keyed by storyboard so switching concept falls back to its first scene
  // instead of pointing at an id that no longer exists - derived, rather
  // than reset from an effect.
  const [picked, setPicked] = useState<{
    storyboardId: string;
    sceneId: number;
  } | null>(null);
  const sceneId =
    picked?.storyboardId === storyboard.id ? picked.sceneId : null;

  const scene =
    storyboard.scenes.find((candidate) => candidate.id === sceneId) ??
    storyboard.scenes[0];

  // Same swap the renderer makes, so the preview matches the output.
  const shown = assetsForDevice(assets, device);

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Button variant="ghost" size="sm" onClick={onBack} className="-ml-3">
            <ArrowLeft />
            Other concepts
          </Button>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-white">
            {storyboard.title}
          </h2>
          <p className="text-sm text-mist-400">{storyboard.concept}</p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Preview */}
        <div className="panel flex flex-col items-center rounded-2xl px-6 py-8">
          {scene ? (
            <ScenePreview
              scene={scene}
              assets={shown}
              device={device}
              // A landscape screen needs the width a phone does not.
              width={deviceIsWide(device) ? 380 : 190}
            />
          ) : null}
        </div>

        {/* Controls */}
        <div className="space-y-7">
          <fieldset disabled={busy}>
            <legend className="mb-3 text-xs font-semibold tracking-wider text-mist-400 uppercase">
              Look
            </legend>
            <div className="space-y-2">
              {STYLES.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => onStyle(value)}
                  aria-pressed={style === value}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition-colors disabled:opacity-50",
                    style === value
                      ? "border-brand-400/60 bg-brand-500/10"
                      : "border-white/8 hover:border-white/20",
                  )}
                >
                  <span
                    className="size-10 shrink-0 rounded-lg"
                    style={{ background: STYLE_SWATCH[value] }}
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-white">
                      {STYLE_LABELS[value].name}
                    </span>
                    <span className="block truncate text-xs text-mist-400">
                      {STYLE_LABELS[value].blurb}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset disabled={busy}>
            <legend className="mb-3 text-xs font-semibold tracking-wider text-mist-400 uppercase">
              Show it on
            </legend>
            <div className="grid grid-cols-3 gap-2">
              {DEVICES.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => onDevice(value)}
                  aria-pressed={device === value}
                  title={DEVICE_LABELS[value]}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-xl border px-2 pt-3 pb-2 transition-colors disabled:opacity-50",
                    device === value
                      ? "border-brand-400/60 bg-brand-500/10"
                      : "border-white/8 hover:border-white/20",
                  )}
                >
                  <span className="flex h-12 items-center">
                    <DeviceMockup
                      device={value}
                      width={deviceIsWide(value) ? 46 : 22}
                    />
                  </span>
                  <span className="w-full truncate text-center text-[10px] leading-tight text-mist-300">
                    {DEVICE_LABELS[value]}
                  </span>
                </button>
              ))}
            </div>
          </fieldset>

          <MetadataForm
            metadata={metadata}
            productName={productName}
            disabled={busy}
            onChange={onMetadata}
          />
        </div>
      </div>

      <Timeline
        storyboard={storyboard}
        assets={shown}
        activeSceneId={scene?.id ?? null}
        onSelect={(next) =>
          setPicked({ storyboardId: storyboard.id, sceneId: next })
        }
      />

      <Button size="lg" className="w-full" disabled={busy} onClick={onGenerate}>
        {busy ? <Spinner /> : <Clapperboard />}
        {busy ? "Starting…" : "Generate video"}
      </Button>
    </div>
  );
};
