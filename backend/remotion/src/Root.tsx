import React from "react";
import { Composition } from "remotion";
import { ASPECT_DIMENSIONS, FPS, compositionId } from "./engine/aspect";
import { placeholderInput } from "./engine/placeholders";
import { TEMPLATES } from "./templates";
import type { TemplateInput } from "./engine/types";

/**
 * One composition per template per aspect it declares. The gallery, the
 * editor and the renderer all address compositions by `compositionId`, so
 * adding a template to the list is the whole registration.
 */
export const RemotionRoot: React.FC = () => (
  <>
    {TEMPLATES.flatMap((template) =>
      template.aspects.map((aspect) => {
        const size = ASPECT_DIMENSIONS[aspect];
        return (
          <Composition
            key={compositionId(template.id, aspect)}
            id={compositionId(template.id, aspect)}
            component={template.component}
            durationInFrames={template.durationInFrames}
            fps={FPS}
            width={size.width}
            height={size.height}
            defaultProps={placeholderInput(template)}
            calculateMetadata={({ props }: { props: TemplateInput }) => ({
              durationInFrames:
                template.slots.duration && props.durationInFrames
                  ? Math.max(FPS, Math.round(props.durationInFrames))
                  : template.durationInFrames,
            })}
          />
        );
      }),
    )}
  </>
);
