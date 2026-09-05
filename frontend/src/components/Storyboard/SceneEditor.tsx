import { Lock } from "lucide-react";
import { Badge } from "@/components/Common/Badge";
import type { Scene } from "@/types";

/**
 * Read-only in this version: scenes are shown exactly as they will render, so
 * what you approve here is what comes out of the encoder. Editing is the next
 * milestone, not a stub to click through.
 */
export const SceneEditor: React.FC<{ scene: Scene }> = ({ scene }) => (
  <div className="rounded-xl border border-white/7 bg-white/2 p-4">
    <div className="mb-3 flex items-center gap-2">
      <Badge tone="muted">
        <Lock className="size-3" />
        Read only
      </Badge>
      <span className="text-xs text-mist-400">
        Scene copy and timing are locked for this render.
      </span>
    </div>

    <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
      <div className="flex justify-between gap-3">
        <dt className="text-mist-400">On-screen text</dt>
        <dd className="truncate text-right text-mist-200">
          {scene.textOverlay?.content ?? "—"}
        </dd>
      </div>
      <div className="flex justify-between gap-3">
        <dt className="text-mist-400">Position</dt>
        <dd className="text-mist-200">{scene.textOverlay?.position ?? "—"}</dd>
      </div>
      <div className="flex justify-between gap-3">
        <dt className="text-mist-400">Entry</dt>
        <dd className="text-mist-200">
          {scene.textOverlay?.animation ?? "—"}
        </dd>
      </div>
      <div className="flex justify-between gap-3">
        <dt className="text-mist-400">Actions</dt>
        <dd className="text-mist-200">{scene.actions.length}</dd>
      </div>
    </dl>
  </div>
);
