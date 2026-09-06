import { useMemo } from "react";
import { Player, Thumbnail } from "@remotion/player";
import { ASPECT_DIMENSIONS, FPS } from "@/video/engine/aspect";
import type { AspectRatio, TemplateDefinition, TemplateInput } from "@/types";

/**
 * The template, playing in the browser with whatever is in it right now.
 * Same component the server renders, so this is the output, not a
 * stand-in for it.
 */
export const LivePreview: React.FC<{
  template: TemplateDefinition;
  input: TemplateInput;
  aspect: AspectRatio;
  /** Play automatically and loop - the editor. */
  autoPlay?: boolean;
  controls?: boolean;
  className?: string;
}> = ({ template, input, aspect, autoPlay = true, controls = true, className }) => {
  const size = ASPECT_DIMENSIONS[aspect];
  const duration = input.durationInFrames ?? template.durationInFrames;
  // The Player re-mounts the tree when inputProps identity changes; memo by content.
  const props = useMemo(() => input, [input]);

  return (
    <div
      className={className}
      style={{ aspectRatio: `${size.width} / ${size.height}`, width: "100%" }}
    >
      <Player
        component={template.component}
        inputProps={props}
        durationInFrames={duration}
        fps={FPS}
        compositionWidth={size.width}
        compositionHeight={size.height}
        style={{ width: "100%", height: "100%", borderRadius: 18, overflow: "hidden" }}
        autoPlay={autoPlay}
        loop
        controls={controls}
        clickToPlay={!controls}
        initiallyMuted
        showVolumeControls={false}
        allowFullscreen
        spaceKeyToPlayOrPause={controls}
      />
    </div>
  );
};

/** One frame, for cards that are not being looked at. */
export const PreviewFrame: React.FC<{
  template: TemplateDefinition;
  input: TemplateInput;
  aspect: AspectRatio;
  frame?: number;
  className?: string;
}> = ({ template, input, aspect, frame, className }) => {
  const size = ASPECT_DIMENSIONS[aspect];
  const duration = input.durationInFrames ?? template.durationInFrames;
  return (
    <div className={className} style={{ aspectRatio: `${size.width} / ${size.height}`, width: "100%" }}>
      <Thumbnail
        component={template.component}
        inputProps={input}
        compositionWidth={size.width}
        compositionHeight={size.height}
        durationInFrames={duration}
        fps={FPS}
        frameToDisplay={frame ?? Math.round(duration * 0.38)}
        style={{ width: "100%", height: "100%", borderRadius: 18, overflow: "hidden" }}
      />
    </div>
  );
};
