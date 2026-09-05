import { Download } from "lucide-react";
import { Button } from "@/components/Common/Button";
import { PreviewVideo } from "@/components/Generator/PreviewVideo";
import { MoreOptions } from "./MoreOptions";
import { api } from "@/services/api";
import type { DeviceType, StatusResponse, Storyboard, VideoStyle } from "@/types";

const FORMATS = [
  { format: "9x16", label: "9:16", platform: "TikTok, Reels, Shorts" },
  { format: "16x9", label: "16:9", platform: "YouTube, your site" },
  { format: "1x1", label: "1:1", platform: "Instagram, LinkedIn" },
] as const;

export const ResultPanel: React.FC<{
  jobId: string;
  status: StatusResponse;
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
}> = ({
  jobId,
  status,
  storyboards,
  storyboardId,
  style,
  device,
  busy,
  onApply,
}) => {
  if (!status.outputs) return null;

  return (
    <div className="space-y-6">
      <PreviewVideo
        outputs={status.outputs}
        {...(status.poster ? { poster: status.poster } : {})}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        {FORMATS.map((entry) => (
          <Button key={entry.format} variant="secondary" asChild>
            <a
              href={api.downloadUrl(jobId, entry.format)}
              download
              className="!h-auto flex-col gap-0.5 py-3"
            >
              <span className="flex items-center gap-2 font-semibold text-white">
                <Download className="size-4" />
                {entry.label}
              </span>
              <span className="text-[11px] font-normal text-mist-400">
                {entry.platform}
              </span>
            </a>
          </Button>
        ))}
      </div>

      <MoreOptions
        storyboards={storyboards}
        storyboardId={storyboardId}
        style={style}
        device={device}
        busy={busy}
        onApply={onApply}
      />
    </div>
  );
};
