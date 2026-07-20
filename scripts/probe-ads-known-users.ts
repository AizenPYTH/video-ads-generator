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

async function main() {
  loadEnvLocal();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };

  // Try public.users
  for (const table of ["users", "profiles"]) {
    const res = await fetch(`${url}/rest/v1/${table}?select=id,email&limit=10`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    console.log(table, res.status, (await res.text()).slice(0, 400));
  }

  const userId = "4c16d01f-ac68-4ae0-96e0-378951d77e63"; // farouqdib
  const insertRes = await fetch(`${url}/rest/v1/ads?select=id`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      user_id: userId,
      titre: "Probe farouq",
      title: "Probe farouq",
      notes: "probe",
      statut: "DRAFT",
      status: "draft",
      quantite: 1,
      quantity: 1,
      source: "url_import",
      marketplace_id: "EBAY_FR",
      metadata: {},
    }),
  });
  const text = await insertRes.text();
  console.log("insert_farouq", insertRes.status, text.slice(0, 400));
  try {
    const parsed = JSON.parse(text) as Array<{ id: string }>;
    const id = parsed[0]?.id;
    if (id) {
      await fetch(`${url}/rest/v1/ads?id=eq.${id}`, {
        method: "DELETE",
        headers: { apikey: key, Authorization: `Bearer ${key}` },
      });
      console.log("cleanup_ok", id);
    }
  } catch {
    // ignore
  }

  // Also bizboost
  const userId2 = "966e6c97-e09c-4fb7-b82c-808c635b2516";
  const insertRes2 = await fetch(`${url}/rest/v1/ads?select=id`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      user_id: userId2,
      titre: "Probe bizboost",
      title: "Probe bizboost",
      notes: "probe",
      statut: "DRAFT",
      status: "draft",
      quantite: 1,
      quantity: 1,
      source: "url_import",
      marketplace_id: "EBAY_FR",
      metadata: {},
    }),
  });
  const text2 = await insertRes2.text();
  console.log("insert_bizboost", insertRes2.status, text2.slice(0, 400));
  try {
    const parsed = JSON.parse(text2) as Array<{ id: string }>;
    const id = parsed[0]?.id;
    if (id) {
      await fetch(`${url}/rest/v1/ads?id=eq.${id}`, {
        method: "DELETE",
        headers: { apikey: key, Authorization: `Bearer ${key}` },
      });
      console.log("cleanup_ok2", id);
    }
  } catch {
    // ignore
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
