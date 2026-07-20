import { AppError } from "@/lib/errors/app-error";
import { getCachedResult, setCachedResult } from "./cache";

export type SearchMode = "FAST" | "DEEP";

export interface SerpSearchResult {
  title: string;
  link: string;
  snippet: string;
  source: string;
}

export interface SerpSearchResponse {
  reference: string;
  mode: SearchMode;
  results: SerpSearchResult[];
  queriesUsed: string[];
}

const FAST_MAX_QUERIES = 2;
const DEEP_MAX_QUERIES = 6;

function getApiKey(): string {
  const key = process.env.SERPAPI_API_KEY;
  if (!key) {
    throw AppError.internal("SERPAPI_API_KEY is not configured");
  }
  return key;
}

function buildQueries(reference: string, mode: SearchMode): string[] {
  const queries = [
    `"${reference}" datasheet`,
    `"${reference}" specifications`,
    `${reference} replacement part`,
    `${reference} ebay`,
    `${reference} compatible`,
    `${reference} OEM`,
  ];

  const max = mode === "FAST" ? FAST_MAX_QUERIES : DEEP_MAX_QUERIES;
  return queries.slice(0, max);
}

function deduplicateResults(results: SerpSearchResult[]): SerpSearchResult[] {
  const seen = new Set<string>();
  const deduped: SerpSearchResult[] = [];

  for (const result of results) {
    const key = result.link.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(result);
  }

  return deduped;
}

async function runSerpQuery(query: string): Promise<SerpSearchResult[]> {
  if (process.env.SERPAPI_MOCK_MODE === "true") {
    return [
      {
        title: `Mock result for ${query}`,
        link: `https://example.com/search?q=${encodeURIComponent(query)}`,
        snippet: "Mock SerpAPI result for development",
        source: "example.com",
      },
    ];
  }

  const apiKey = getApiKey();
  const url = new URL("https://serpapi.com/search.json");
  url.searchParams.set("engine", "google");
  url.searchParams.set("q", query);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("num", "5");

  const response = await fetch(url.toString(), {
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw AppError.internal(`SerpAPI request failed: ${response.status}`);
  }

  const data = (await response.json()) as {
    organic_results?: Array<{
      title?: string;
      link?: string;
      snippet?: string;
      displayed_link?: string;
    }>;
  };

  return (data.organic_results ?? []).map((item) => ({
    title: item.title ?? "",
    link: item.link ?? "",
    snippet: item.snippet ?? "",
    source: item.displayed_link ?? new URL(item.link ?? "https://unknown").hostname,
  }));
}

export async function searchReference(
  reference: string,
  mode: SearchMode = "FAST",
): Promise<SerpSearchResponse> {
  const cacheKey = `${reference}:${mode}`;
  const cached = await getCachedResult<SerpSearchResponse>(cacheKey);

  if (cached) {
    return cached;
  }

  const queries = buildQueries(reference, mode);
  const allResults: SerpSearchResult[] = [];

  for (const query of queries) {
    const results = await runSerpQuery(query);
    allResults.push(...results);
  }

  const response: SerpSearchResponse = {
    reference,
    mode,
    results: deduplicateResults(allResults),
    queriesUsed: queries,
  };

  await setCachedResult(cacheKey, response);
  return response;
}
