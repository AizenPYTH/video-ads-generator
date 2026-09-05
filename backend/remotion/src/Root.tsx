import React from "react";
import { Composition } from "remotion";
import { VideoComposition } from "./VideoComposition";
import { defaultProps } from "./defaultProps";
import { ASPECT_DIMENSIONS, FPS } from "../../src/utils/constants";
import type { AspectRatio, VideoCompositionProps } from "../../src/types";

export const COMPOSITION_IDS: Record<AspectRatio, string> = {
  "9:16": "VideoAd-9x16",
  "16:9": "VideoAd-16x9",
  "1:1": "VideoAd-1x1",
};

/** Duration always comes from the storyboard, never from a hardcoded default. */
const calculateMetadata = ({ props }: { props: VideoCompositionProps }) => ({
  durationInFrames: Math.max(
    FPS,
    Math.round(
      props.storyboard.scenes.reduce((sum, scene) => sum + scene.duration, 0) *
        FPS,
    ),
  ),
});

export const RemotionRoot: React.FC = () => (
  <>
    {(Object.keys(COMPOSITION_IDS) as AspectRatio[]).map((ratio) => {
      const size = ASPECT_DIMENSIONS[ratio];
      return (
        <Composition
          key={ratio}
          id={COMPOSITION_IDS[ratio]}
          component={VideoComposition}
          durationInFrames={Math.round(defaultProps.storyboard.totalDuration * FPS)}
          fps={FPS}
          width={size.width}
          height={size.height}
          defaultProps={defaultProps}
          calculateMetadata={calculateMetadata}
        />
      );
    })}
  </>
);
