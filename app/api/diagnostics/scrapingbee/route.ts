import { NextResponse } from "next/server";
import { getScrapingBeeDiagnostics } from "@/services/scraping/scrapingbee";

/**
 * Diagnostic ZenRows (ex-ScrapingBee / scrape.do).
 * Répond uniquement { configured, provider } — jamais la clé.
 */
export async function GET() {
  return NextResponse.json(getScrapingBeeDiagnostics());
}
