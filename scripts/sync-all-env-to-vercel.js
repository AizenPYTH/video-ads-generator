const { execSync } = require("child_process");
const fs = require("fs");

function parseEnv(file) {
  const out = {};
  if (!fs.existsSync(file)) return out;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#") || !line.includes("=")) continue;
    const i = line.indexOf("=");
    const k = line.slice(0, i).trim();
    let v = line.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    out[k] = v;
  }
  return out;
}

const SKIP = new Set([
  "GOOGLE_APPLICATION_CREDENTIALS",
  "VERCEL_OIDC_TOKEN",
  "DEBUG_MODE",
]);

const REQUIRED = [
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "OPENAI_API_KEY",
  "OPENAI_MODEL",
  "SERPAPI_API_KEY",
  "GOOGLE_CLOUD_CREDENTIALS_JSON",
  "ZENROWS_API_KEY",
  "ZENROWS_PREMIUM",
  "SCRAPE_DO_TOKEN",
  "SCRAPE_DO_SUPER",
  "SCRAPINGBEE_API_KEY",
  "SCRAPINGBEE_PREMIUM",
  "EBAY_ENVIRONMENT",
  "EBAY_CLIENT_ID",
  "EBAY_CLIENT_SECRET",
  "EBAY_RUNAME",
  "EBAY_MARKETPLACE_ID",
  "EBAY_API_URL",
  "EBAY_AUTH_URL",
  "EBAY_MOCK_MODE",
  "ENCRYPTION_KEY",
];

const local = parseEnv(".env.local");
const PROD_APP_URL = "https://snowolf-lime.vercel.app";

function setEnv(key, value, target) {
  try { execSync(`npx vercel env rm ${key} ${target} -y`, { stdio: "pipe", timeout: 60000 }); } catch {}
  execSync(`npx vercel env add ${key} ${target}`, {
    input: value + "\n",
    stdio: ["pipe", "pipe", "pipe"],
    timeout: 90000,
  });
}

const targets = ["production"]; // prod first (user's live site); preview/dev later if needed

for (const key of REQUIRED) {
  if (SKIP.has(key)) continue;
  let value = (local[key] || "").trim();
  if (!value) {
    console.log("SKIP empty", key);
    continue;
  }
  if (key === "NEXT_PUBLIC_APP_URL" && /localhost/i.test(value)) value = PROD_APP_URL;
  for (const target of targets) {
    setEnv(key, value, target);
  }
  console.log("synced", key);
}

// Also mirror publishable aliases if present under other names
if (local.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
  setEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", local.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.trim(), "production");
  console.log("synced NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
}
if (local.SUPABASE_SECRET_KEY) {
  setEnv("SUPABASE_SECRET_KEY", local.SUPABASE_SECRET_KEY.trim(), "production");
  console.log("synced SUPABASE_SECRET_KEY");
}

console.log("ok");
