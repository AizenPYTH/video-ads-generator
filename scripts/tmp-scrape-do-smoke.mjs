import { readFileSync } from "fs";
import { pathToFileURL } from "url";

for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (!m || process.env[m[1]]) continue;
  process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
}

const mod = await import(pathToFileURL("./services/scraping/scrapingbee.ts").href);
const r = await mod.fetchWithScrapingBee({
  url: "https://httpbin.co/anything",
  renderJs: false,
  timeoutMs: 30000,
});
console.log(
  JSON.stringify({
    status: r.statusCode,
    htmlLen: r.html.length,
    ok: r.html.includes("httpbin") || r.html.includes("origin"),
  })
);
