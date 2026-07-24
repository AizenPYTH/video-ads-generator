const fs = require("fs");
const t = fs.readFileSync(".env.vercel.check", "utf8");
const keys = [
  "OPENAI_API_KEY",
  "OPENAI_MODEL",
  "SERPAPI_API_KEY",
  "ZENROWS_API_KEY",
  "ZENROWS_PREMIUM",
  "SCRAPE_DO_TOKEN",
  "SCRAPE_DO_SUPER",
  "SCRAPINGBEE_API_KEY",
  "GOOGLE_CLOUD_CREDENTIALS_JSON",
  "ENCRYPTION_KEY",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "EBAY_ENVIRONMENT",
  "EBAY_CLIENT_ID",
  "EBAY_CLIENT_SECRET",
  "EBAY_RUNAME",
];
for (const k of keys) {
  const m = t.match(new RegExp("^" + k + "=(.*)$", "m"));
  let v = m ? m[1].trim() : "";
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1);
  }
  console.log(k + ":" + (v ? "OK(" + v.length + ")" : "MISSING"));
}
