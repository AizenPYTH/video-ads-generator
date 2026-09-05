import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/Common/Button";
import { Card, CardContent } from "@/components/Common/Card";
import { Badge } from "@/components/Common/Badge";
import { Timeline } from "@/components/Storyboard/Timeline";
import { ScenePreview } from "@/components/Storyboard/ScenePreview";
import { SceneEditor } from "@/components/Storyboard/SceneEditor";
import { useProjectStore, useSelectedStoryboard } from "@/store/useProjectStore";
import { formatDuration } from "@/utils/formatting";

export default function StoryboardPage() {
  const navigate = useNavigate();
  const storyboard = useSelectedStoryboard();
  const analysis = useProjectStore((state) => state.analysis);
  const [activeSceneId, setActiveSceneId] = useState<number | null>(null);

  useEffect(() => {
    if (!storyboard) navigate("/analysis", { replace: true });
  }, [storyboard, navigate]);

  if (!storyboard || !analysis) return null;

  const activeScene =
    storyboard.scenes.find((scene) => scene.id === activeSceneId) ??
    storyboard.scenes[0];

  return (
    <div className="mx-auto max-w-5xl px-5 py-12">
      <Button variant="ghost" size="sm" onClick={() => navigate("/analysis")}>
        <ArrowLeft />
        Back to concepts
      </Button>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Badge tone="muted">{storyboard.concept}</Badge>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">
            {storyboard.title}
          </h1>
          <p className="mt-2 max-w-2xl text-mist-400">
            {storyboard.description}
          </p>
        </div>
        <div className="text-right text-sm text-mist-400">
          <p className="font-mono text-lg text-white">
            {formatDuration(storyboard.totalDuration)}
          </p>
          <p>{storyboard.scenes.length} scenes</p>
        </div>
      </div>

      <Card className="mt-8">
        <CardContent className="space-y-6 pt-6">
          <Timeline
            storyboard={storyboard}
            activeSceneId={activeScene?.id ?? null}
            onSelect={setActiveSceneId}
          />

          {activeScene ? (
            <>
              <div className="border-t border-white/6 pt-6">
                <ScenePreview scene={activeScene} assets={analysis.assets} />
              </div>
              <SceneEditor scene={activeScene} />
            </>
          ) : null}
        </CardContent>
      </Card>

      <div className="mt-8 flex justify-end">
        <Button size="lg" onClick={() => navigate("/generate")}>
          Choose look and render
          <ArrowRight />
        </Button>
      </div>
    </div>
  );
}
