import { NextResponse } from "next/server";
import { getScrapingBeeDiagnostics } from "@/services/scraping/scrapingbee";

/**
 * Diagnostic temporaire ScrapingBee.
 * Répond uniquement { configured: true|false } — jamais la clé.
 */
export async function GET() {
  return NextResponse.json(getScrapingBeeDiagnostics());
}
