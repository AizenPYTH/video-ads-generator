import fs from "node:fs";
import { fetchWithScrapingBee, getScrapingBeeDiagnostics } from "../services/scraping/scrapingbee";

function loadEnvLocal() {
  const text = fs.readFileSync(".env.local", "utf8");
  for (const line of text.split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
    if (!(key in process.env) || !process.env[key]) {
      process.env[key] = value;
    }
  }
}

async function main() {
  loadEnvLocal();
  console.log("diagnostic", JSON.stringify(getScrapingBeeDiagnostics()));

  const url =
    process.argv[2] ||
    "https://www.amazon.fr/dp/B0D1XD1ZV3";

  const result = await fetchWithScrapingBee({
    url,
    renderJs: true,
    countryCode: "fr",
  });

  const hasTitle = /<title[^>]*>/i.test(result.html);
  const snippet = result.html.replace(/\s+/g, " ").slice(0, 120);
  console.log(
    JSON.stringify({
      statusCode: result.statusCode,
      htmlLength: result.html.length,
      hasTitle,
      ok: result.statusCode === 200 && result.html.length > 500,
      snippet,
    }),
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
