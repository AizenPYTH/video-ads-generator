import { ArrowRight, Clock, Film } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/Common/Card";
import { Badge } from "@/components/Common/Badge";
import { Button } from "@/components/Common/Button";
import { formatDuration } from "@/utils/formatting";
import type { Storyboard } from "@/types";

export const ConceptCard: React.FC<{
  storyboard: Storyboard;
  index: number;
  selected: boolean;
  onSelect: () => void;
}> = ({ storyboard, index, selected, onSelect }) => (
  <Card
    interactive
    onClick={onSelect}
    role="button"
    tabIndex={0}
    aria-pressed={selected}
    onKeyDown={(event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onSelect();
      }
    }}
    className={
      "flex h-full flex-col " +
      (selected ? "border-brand-400/60 bg-brand-500/8 ring-1 ring-brand-400/30" : "")
    }
  >
    <CardHeader>
      <div className="flex items-center justify-between">
        <Badge tone={selected ? "default" : "muted"}>
          Concept {index + 1}
        </Badge>
        <span className="text-xs text-mist-400">{storyboard.concept}</span>
      </div>
      <CardTitle className="pt-1">{storyboard.title}</CardTitle>
    </CardHeader>

    <CardContent className="flex flex-1 flex-col gap-4">
      <p className="flex-1 text-sm leading-relaxed text-mist-400">
        {storyboard.description}
      </p>

      <ul className="space-y-1.5">
        {storyboard.scenes.slice(0, 4).map((scene) => (
          <li key={scene.id} className="flex items-baseline gap-2 text-xs">
            <span className="w-8 shrink-0 font-mono text-mist-400/70">
              {formatDuration(scene.duration)}
            </span>
            <span className="truncate text-mist-300">
              {scene.textOverlay?.content ?? scene.name}
            </span>
          </li>
        ))}
        {storyboard.scenes.length > 4 ? (
          <li className="pl-10 text-xs text-mist-400/60">
            +{storyboard.scenes.length - 4} more
          </li>
        ) : null}
      </ul>

      <div className="flex items-center gap-4 border-t border-white/6 pt-3 text-xs text-mist-400">
        <span className="flex items-center gap-1.5">
          <Film className="size-3.5" />
          {storyboard.scenes.length} scenes
        </span>
        <span className="flex items-center gap-1.5">
          <Clock className="size-3.5" />
          {formatDuration(storyboard.totalDuration)}
        </span>
      </div>

      <Button
        variant={selected ? "primary" : "secondary"}
        className="w-full"
        onClick={(event) => {
          event.stopPropagation();
          onSelect();
        }}
      >
        {selected ? "Selected" : "Use this concept"}
        <ArrowRight />
      </Button>
    </CardContent>
  </Card>
);
