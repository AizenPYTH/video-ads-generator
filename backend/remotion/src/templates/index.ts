import type { TemplateDefinition } from "../engine/types";
import { template as macbookOpen } from "./macbook-open";
import { template as iphoneRise } from "./iphone-rise";
import { template as monitorPushin } from "./monitor-pushin";

/**
 * The library. Adding a template is adding it here - Root, the gallery and
 * the API all read this list.
 */
export const TEMPLATES: TemplateDefinition[] = [macbookOpen, iphoneRise, monitorPushin];
