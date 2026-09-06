import { TEMPLATES } from "../templates";
import { compositionId } from "./aspect";
import type { AspectRatio, TemplateDefinition } from "./types";

export { TEMPLATES };

export function getTemplate(id: string): TemplateDefinition | null {
  return TEMPLATES.find((template) => template.id === id) ?? null;
}

/** Everything a client needs to list and validate against, minus the component. */
export type TemplateSummary = Omit<TemplateDefinition, "component">;

export function summarize(template: TemplateDefinition): TemplateSummary {
  const { component: _component, ...summary } = template;
  return summary;
}

export function listTemplates(): TemplateSummary[] {
  return TEMPLATES.map(summarize);
}

/** Reverse of `compositionId`. */
export function parseCompositionId(
  id: string,
): { template: TemplateDefinition; aspect: AspectRatio } | null {
  for (const template of TEMPLATES) {
    for (const aspect of template.aspects) {
      if (compositionId(template.id, aspect) === id) return { template, aspect };
    }
  }
  return null;
}
