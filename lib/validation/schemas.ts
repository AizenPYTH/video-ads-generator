import { z } from "zod";
import { validateUrl } from "./url";

export const uuidSchema = z.string().uuid();

export const emailSchema = z.string().email().max(320);

export const urlSchema = z
  .string()
  .trim()
  .min(1, "URL is required")
  .refine((value) => {
    try {
      validateUrl(value);
      return true;
    } catch {
      return false;
    }
  }, "Invalid or blocked URL");

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const productIdentificationSchema = z.object({
  imageUrl: z.string().url().optional(),
  imageBase64: z.string().optional(),
  ocrText: z.string().max(50_000).optional(),
  reference: z.string().max(200).optional(),
  hints: z.string().max(2000).optional(),
});

export const urlImportSchema = z.object({
  url: urlSchema,
  workspaceId: uuidSchema,
});

export const listingGenerationSchema = z.object({
  productId: uuidSchema,
  marketplaceId: z.string().min(2).max(20).default("EBAY_FR"),
  language: z.enum(["fr", "en", "de", "es", "it"]).default("fr"),
  tone: z.enum(["professional", "concise", "detailed"]).default("professional"),
});

export const bulkPublishSchema = z.object({
  productIds: z.array(uuidSchema).min(1).max(50),
  workspaceId: uuidSchema,
});

export const csvImportSchema = z.object({
  workspaceId: uuidSchema,
  filename: z.string().min(1).max(255),
  rowCount: z.number().int().min(1),
});

export const ebayOAuthCallbackSchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1),
});

export const stripeCheckoutSchema = z.object({
  plan: z.enum(["STARTER", "PRO", "BUSINESS"]),
  workspaceId: uuidSchema,
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

export type ProductIdentificationInput = z.infer<typeof productIdentificationSchema>;
export type UrlImportInput = z.infer<typeof urlImportSchema>;
export type ListingGenerationInput = z.infer<typeof listingGenerationSchema>;
export type BulkPublishInput = z.infer<typeof bulkPublishSchema>;
export type CsvImportInput = z.infer<typeof csvImportSchema>;
export type StripeCheckoutInput = z.infer<typeof stripeCheckoutSchema>;
