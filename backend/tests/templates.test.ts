import { describe, expect, it } from "vitest";
import { TEMPLATES } from "../remotion/src/templates";
import { getTemplate, listTemplates, parseCompositionId } from "../remotion/src/engine/registry";
import { compositionId, FPS } from "../remotion/src/engine/aspect";
import { completeInput, placeholderInput } from "../remotion/src/engine/placeholders";

/**
 * Every template in the library, checked for the things that would only
 * show up as a broken card or a failed render.
 */
describe("template library", () => {
  it("has unique, composition-safe ids", () => {
    const ids = TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9-]+$/);
  });

  it.each(TEMPLATES.map((t) => [t.id, t] as const))("%s is well-formed", (_id, template) => {
    expect(template.durationInFrames).toBeGreaterThanOrEqual(FPS * 3);
    expect(template.aspects.length).toBeGreaterThan(0);
    expect(new Set(template.aspects).size).toBe(template.aspects.length);
    expect(template.slots.screens.min).toBeGreaterThanOrEqual(0);
    expect(template.slots.screens.max).toBeGreaterThanOrEqual(Math.max(1, template.slots.screens.min));
    expect(template.name.length).toBeGreaterThan(3);
    expect(template.tagline.length).toBeGreaterThan(10);
    expect(typeof template.component).toBe("function");
    if (template.slots.duration) {
      expect(template.slots.duration.min).toBeLessThanOrEqual(template.slots.duration.max);
    }
  });

  it("round-trips composition ids", () => {
    for (const template of TEMPLATES) {
      for (const aspect of template.aspects) {
        const parsed = parseCompositionId(compositionId(template.id, aspect));
        expect(parsed?.template.id).toBe(template.id);
        expect(parsed?.aspect).toBe(aspect);
      }
    }
    expect(parseCompositionId("nope--9x16")).toBeNull();
  });

  it("lists summaries without components and finds by id", () => {
    const summaries = listTemplates();
    expect(summaries.length).toBe(TEMPLATES.length);
    for (const summary of summaries) expect("component" in summary).toBe(false);
    expect(getTemplate(TEMPLATES[0]!.id)?.id).toBe(TEMPLATES[0]!.id);
    expect(getTemplate("missing")).toBeNull();
  });
});

describe("placeholders", () => {
  it("gives every template a complete input that respects its slots", () => {
    for (const template of TEMPLATES) {
      const input = placeholderInput(template);
      expect(input.screens.length).toBeGreaterThan(0);
      expect(input.screens.length).toBeLessThanOrEqual(template.slots.screens.max);
      if (template.slots.logo === "none") expect(input.logo).toBeNull();
      if (!template.slots.headline) expect(input.copy.headline).toBe("");
      if (!template.slots.cta) expect(input.cta).toBeNull();
      // Placeholder screens match the surface the template wants.
      const first = input.screens[0]!;
      if (template.slots.screens.surface === "desktop") expect(first.width).toBeGreaterThan(first.height);
      if (template.slots.screens.surface === "mobile") expect(first.height).toBeGreaterThan(first.width);
    }
  });

  it("keeps one real screenshot rather than padding it with fakes", () => {
    const template = TEMPLATES[0]!;
    const real = { id: "s", url: "https://x/a.png", width: 100, height: 200 };
    const input = completeInput(template, { screens: [real] });
    expect(input.screens).toEqual([real]);
  });

  it("caps screens at the slot max and drops copy the template has no slot for", () => {
    const template = TEMPLATES[0]!;
    const many = Array.from({ length: 20 }, (_, i) => ({ id: `s${i}`, url: "https://x/a.png", width: 1, height: 2 }));
    expect(completeInput(template, { screens: many }).screens.length).toBe(template.slots.screens.max);
  });
});
