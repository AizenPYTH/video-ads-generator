const fs = require("fs");

function parse(p) {
  const out = {};
  if (!fs.existsSync(p)) return out;
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return out;
}

const root = parse("C:/Users/pain/Documents/EBAY/.env.local");
const app = parse("C:/Users/pain/Documents/EBAY/snowolf/.env.local");

const map = {
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  SUPABASE_SECRET_KEY: "SUPABASE_SERVICE_ROLE_KEY",
};

const merged = { ...app };
for (const [k, v] of Object.entries(root)) {
  const target = map[k] || k;
  if (!v) continue;
  if (
    (target === "NEXT_PUBLIC_SUPABASE_ANON_KEY" ||
      target === "SUPABASE_SERVICE_ROLE_KEY" ||
      target === "NEXT_PUBLIC_SUPABASE_URL") &&
    merged[target]
  ) {
    continue;
  }
  merged[target] = v;
}

for (const k of [
  "SCRAPINGBEE_API_KEY",
  "OPENAI_API_KEY",
  "SERPAPI_API_KEY",
  "OPENAI_MODEL",
  "GOOGLE_APPLICATION_CREDENTIALS",
  "GOOGLE_CLOUD_CREDENTIALS_JSON",
  "ENCRYPTION_KEY",
]) {
  if (root[k]) merged[k] = root[k];
}

const order = [
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "OPENAI_API_KEY",
  "OPENAI_MODEL",
  "SERPAPI_API_KEY",
  "GOOGLE_APPLICATION_CREDENTIALS",
  "GOOGLE_CLOUD_CREDENTIALS_JSON",
  "SCRAPINGBEE_API_KEY",
  "EBAY_ENVIRONMENT",
  "EBAY_CLIENT_ID",
  "EBAY_CLIENT_SECRET",
  "EBAY_RUNAME",
  "EBAY_MARKETPLACE_ID",
  "EBAY_API_URL",
  "EBAY_AUTH_URL",
  "EBAY_MOCK_MODE",
  "ENCRYPTION_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  "STRIPE_PRICE_STARTER",
  "STRIPE_PRICE_PRO",
  "STRIPE_PRICE_BUSINESS",
  "DEBUG_MODE",
];

const lines = [
  "# Merged for Next.js app in snowolf/",
  "# Place keys HERE (not in parent EBAY/.env.local)",
  "",
];
const seen = new Set();
for (const k of order) {
  lines.push(`${k}=${merged[k] ?? ""}`);
  seen.add(k);
}
for (const k of Object.keys(merged).sort()) {
  if (!seen.has(k)) lines.push(`${k}=${merged[k]}`);
}

const outPath = "C:/Users/pain/Documents/EBAY/snowolf/.env.local";
fs.writeFileSync(outPath, lines.join("\n") + "\n", "utf8");

for (const k of [
  "SCRAPINGBEE_API_KEY",
  "OPENAI_API_KEY",
  "SERPAPI_API_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
]) {
  const v = merged[k] || "";
  console.log(k, v ? `SET(len=${v.length})` : "EMPTY");
}
console.log("lines", lines.length);
