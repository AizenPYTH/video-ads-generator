import fs from "node:fs";

function loadEnvLocal() {
  const text = fs.readFileSync(".env.local", "utf8");
  for (const line of text.split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line
      .slice(idx + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

async function tryInsert(source: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const userId = "966e6c97-e09c-4fb7-b82c-808c635b2516";
  const res = await fetch(`${url}/rest/v1/ads?select=id`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      user_id: userId,
      titre: `Probe ${source}`,
      title: `Probe ${source}`,
      notes: "probe",
      statut: "DRAFT",
      status: "draft",
      quantite: 1,
      quantity: 1,
      source,
      marketplace_id: "EBAY_FR",
      metadata: {},
    }),
  });
  const text = await res.text();
  console.log(JSON.stringify({ source, status: res.status, body: text }));
  try {
    const parsed = JSON.parse(text) as Array<{ id: string }>;
    const id = parsed[0]?.id;
    if (id) {
      await fetch(`${url}/rest/v1/ads?id=eq.${id}`, {
        method: "DELETE",
        headers: { apikey: key, Authorization: `Bearer ${key}` },
      });
    }
  } catch {
    // ignore
  }
}

async function main() {
  loadEnvLocal();
  for (const source of [
    "photo",
    "url",
    "url_import",
    "csv",
    "import",
    "manual",
    "amazon",
  ]) {
    await tryInsert(source);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
