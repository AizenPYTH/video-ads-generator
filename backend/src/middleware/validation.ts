import type { Request } from "express";
import type { ZodType } from "zod";

export function parseBody<T>(schema: ZodType<T>, req: Request): T {
  return schema.parse(req.body);
}
