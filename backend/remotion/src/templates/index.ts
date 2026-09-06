import type { TemplateDefinition } from "../engine/types";
import { template as iphoneHero } from "./iphone-hero";
import { template as macbookHero } from "./macbook-hero";
import { template as macbookOpen } from "./macbook-open";
import { template as macbookOrbit } from "./macbook-orbit";
import { template as macbookFullframe } from "./macbook-fullframe";
import { template as iphoneRise } from "./iphone-rise";
import { template as iphonePerspective } from "./iphone-perspective";
import { template as iphoneRapid } from "./iphone-rapid";
import { template as duo } from "./duo";
import { template as monitorPushin } from "./monitor-pushin";
import { template as phoneFloat } from "./phone-float";
import { template as logoReveal } from "./logo-reveal";

/**
 * The library. Adding a template is adding it here - Root, the gallery and
 * the API all read this list. Order is gallery order.
 */
export const TEMPLATES: TemplateDefinition[] = [
  iphoneHero,
  macbookHero,
  macbookOpen,
  iphoneRise,
  macbookOrbit,
  phoneFloat,
  monitorPushin,
  iphonePerspective,
  macbookFullframe,
  iphoneRapid,
  duo,
  logoReveal,
];
