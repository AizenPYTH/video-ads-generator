const fs = require("fs");
const { execSync } = require("child_process");

function parseEnv(text) {
  const out = {};
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i < 0) continue;
    out[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return out;
}

function readEnvFile(p) {
  if (!fs.existsSync(p)) return {};
  let text = fs.readFileSync(p, "utf8");
  // Fix accidental literal \n sequences from bad writes
  if (text.split(/\r?\n/).length < 3 && text.includes("\\n")) {
    text = text.split("\\n").join("\n");
  }
  return parseEnv(text);
}

const root = readEnvFile("C:/Users/pain/Documents/EBAY/.env.local");
const app = readEnvFile("C:/Users/pain/Documents/EBAY/snowolf/.env.local");

const keysJson = execSync(
  "npx supabase projects api-keys --project-ref olijbnhinkvnqoudmqbv -o json",
  { encoding: "utf8", cwd: "C:/Users/pain/Documents/EBAY/snowolf" },
);
const keys = JSON.parse(keysJson.replace(/^npm warn.*$/gm, "").trim());
const anon = keys.find((k) => k.id === "anon" || k.name === "anon");
const service = keys.find((k) => k.id === "service_role" || k.name === "service_role");

const merged = {
  NEXT_PUBLIC_APP_URL: root.NEXT_PUBLIC_APP_URL || app.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  NEXT_PUBLIC_SUPABASE_URL: "https://olijbnhinkvnqoudmqbv.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: anon.api_key,
  SUPABASE_SERVICE_ROLE_KEY: service.api_key,
  OPENAI_API_KEY: root.OPENAI_API_KEY || app.OPENAI_API_KEY || "",
  OPENAI_MODEL: root.OPENAI_MODEL || app.OPENAI_MODEL || "gpt-4o",
  SERPAPI_API_KEY: root.SERPAPI_API_KEY || app.SERPAPI_API_KEY || "",
  GOOGLE_APPLICATION_CREDENTIALS:
    root.GOOGLE_APPLICATION_CREDENTIALS || app.GOOGLE_APPLICATION_CREDENTIALS || "",
  GOOGLE_CLOUD_CREDENTIALS_JSON:
    root.GOOGLE_CLOUD_CREDENTIALS_JSON || app.GOOGLE_CLOUD_CREDENTIALS_JSON || "",
  SCRAPINGBEE_API_KEY: root.SCRAPINGBEE_API_KEY || app.SCRAPINGBEE_API_KEY || "",
  EBAY_ENVIRONMENT: root.EBAY_ENVIRONMENT || app.EBAY_ENVIRONMENT || "sandbox",
  EBAY_CLIENT_ID: root.EBAY_CLIENT_ID || app.EBAY_CLIENT_ID || "",
  EBAY_CLIENT_SECRET: root.EBAY_CLIENT_SECRET || app.EBAY_CLIENT_SECRET || "",
  EBAY_RUNAME: root.EBAY_RUNAME || app.EBAY_RUNAME || "",
  EBAY_MARKETPLACE_ID: root.EBAY_MARKETPLACE_ID || app.EBAY_MARKETPLACE_ID || "EBAY_FR",
  EBAY_API_URL: root.EBAY_API_URL || app.EBAY_API_URL || "https://api.sandbox.ebay.com",
  EBAY_AUTH_URL: root.EBAY_AUTH_URL || app.EBAY_AUTH_URL || "https://auth.sandbox.ebay.com",
  EBAY_MOCK_MODE: root.EBAY_MOCK_MODE || app.EBAY_MOCK_MODE || "true",
  ENCRYPTION_KEY: root.ENCRYPTION_KEY || app.ENCRYPTION_KEY || "dev-local-encryption-key-change-me-32b",
  STRIPE_SECRET_KEY: root.STRIPE_SECRET_KEY || app.STRIPE_SECRET_KEY || "",
  STRIPE_WEBHOOK_SECRET: root.STRIPE_WEBHOOK_SECRET || app.STRIPE_WEBHOOK_SECRET || "",
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:
    root.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || app.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "",
  STRIPE_PRICE_STARTER: root.STRIPE_PRICE_STARTER || app.STRIPE_PRICE_STARTER || "",
  STRIPE_PRICE_PRO: root.STRIPE_PRICE_PRO || app.STRIPE_PRICE_PRO || "",
  STRIPE_PRICE_BUSINESS: root.STRIPE_PRICE_BUSINESS || app.STRIPE_PRICE_BUSINESS || "",
  DEBUG_MODE: "true",
};

const lines = [
  "# snowolf/.env.local — fichier lu par Next.js",
  "# Ne pas mettre les cles seulement dans EBAY/.env.local (parent)",
  "",
];
for (const [k, v] of Object.entries(merged)) {
  lines.push(`${k}=${v}`);
}

const out = "C:/Users/pain/Documents/EBAY/snowolf/.env.local";
fs.writeFileSync(out, lines.join("\n") + "\n", "utf8");

const verify = readEnvFile(out);
console.log("line_count", fs.readFileSync(out, "utf8").split(/\r?\n/).length);
console.log("SCRAPINGBEE", verify.SCRAPINGBEE_API_KEY ? `SET ${verify.SCRAPINGBEE_API_KEY.length}` : "EMPTY");
console.log("OPENAI", verify.OPENAI_API_KEY ? `SET ${verify.OPENAI_API_KEY.length}` : "EMPTY");
console.log("SERPAPI", verify.SERPAPI_API_KEY ? `SET ${verify.SERPAPI_API_KEY.length}` : "EMPTY");
console.log("ANON", verify.NEXT_PUBLIC_SUPABASE_ANON_KEY ? `SET ${verify.NEXT_PUBLIC_SUPABASE_ANON_KEY.length}` : "EMPTY");
console.log("SERVICE", verify.SUPABASE_SERVICE_ROLE_KEY ? `SET ${verify.SUPABASE_SERVICE_ROLE_KEY.length}` : "EMPTY");
