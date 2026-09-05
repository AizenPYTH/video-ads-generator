import { useState } from "react";
import { ChevronDown, RefreshCw } from "lucide-react";
import { Button } from "@/components/Common/Button";
import { cn } from "@/lib/utils";
import { DEVICE_LABELS, STYLE_LABELS } from "@/utils/formatting";
import type { DeviceType, Storyboard, VideoStyle } from "@/types";

const STYLES = Object.keys(STYLE_LABELS) as VideoStyle[];
const DEVICES = Object.keys(DEVICE_LABELS) as DeviceType[];

const Chip: React.FC<{
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ selected, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={selected}
    className={cn(
      "rounded-lg border px-3 py-1.5 text-sm transition-colors",
      selected
        ? "border-brand-400/60 bg-brand-500/12 text-white"
        : "border-white/8 text-mist-300 hover:border-white/20 hover:text-white",
    )}
  >
    {children}
  </button>
);

/**
 * Everything the wizard used to demand up front, folded away behind one
 * disclosure and applied to a video you can already watch.
 */
export const MoreOptions: React.FC<{
  storyboards: Storyboard[];
  storyboardId: string | null;
  style: VideoStyle;
  device: DeviceType;
  busy: boolean;
  onApply: (next: {
    storyboardId?: string;
    style?: VideoStyle;
    device?: DeviceType;
  }) => void;
}> = ({ storyboards, storyboardId, style, device, busy, onApply }) => {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ storyboardId, style, device });

  const dirty =
    draft.storyboardId !== storyboardId ||
    draft.style !== style ||
    draft.device !== device;

  return (
    <div className="rounded-2xl border border-white/7">
      <button
        type="button"
        onClick={() => {
          setDraft({ storyboardId, style, device });
          setOpen((value) => !value);
        }}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-5 py-3.5 text-sm font-medium text-mist-300 transition-colors hover:text-white"
      >
        Change the look, the device or the angle
        <ChevronDown
          className={cn("size-4 transition-transform", open && "rotate-180")}
        />
      </button>

      {open ? (
        <div className="space-y-5 border-t border-white/7 px-5 py-5">
          {storyboards.length > 1 ? (
            <div>
              <p className="mb-2 text-xs font-semibold tracking-wider text-mist-400 uppercase">
                Angle
              </p>
              <div className="flex flex-wrap gap-2">
                {storyboards.map((storyboard) => (
                  <Chip
                    key={storyboard.id}
                    selected={draft.storyboardId === storyboard.id}
                    onClick={() =>
                      setDraft((d) => ({ ...d, storyboardId: storyboard.id }))
                    }
                  >
                    {storyboard.title}
                  </Chip>
                ))}
              </div>
            </div>
          ) : null}

          <div>
            <p className="mb-2 text-xs font-semibold tracking-wider text-mist-400 uppercase">
              Look
            </p>
            <div className="flex flex-wrap gap-2">
              {STYLES.map((value) => (
                <Chip
                  key={value}
                  selected={draft.style === value}
                  onClick={() => setDraft((d) => ({ ...d, style: value }))}
                >
                  {STYLE_LABELS[value].name}
                </Chip>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold tracking-wider text-mist-400 uppercase">
              Show it on
            </p>
            <div className="flex flex-wrap gap-2">
              {DEVICES.map((value) => (
                <Chip
                  key={value}
                  selected={draft.device === value}
                  onClick={() => setDraft((d) => ({ ...d, device: value }))}
                >
                  {DEVICE_LABELS[value]}
                </Chip>
              ))}
            </div>
          </div>

          <Button
            disabled={!dirty || busy}
            onClick={() =>
              onApply({
                ...(draft.storyboardId
                  ? { storyboardId: draft.storyboardId }
                  : {}),
                style: draft.style,
                device: draft.device,
              })
            }
          >
            <RefreshCw />
            Make it again
          </Button>
        </div>
      ) : null}
    </div>
  );
};
