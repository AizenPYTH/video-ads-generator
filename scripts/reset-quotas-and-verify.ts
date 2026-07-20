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

  const plansRes = await fetch(
    `${url}/rest/v1/subscription_plans?code=eq.free&select=id&limit=1`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } },
  );
  const plans = (await plansRes.json()) as Array<{ id: string }>;
  const freePlanId = plans[0]?.id;

  const patch = await fetch(`${url}/rest/v1/subscriptions?plan=eq.free`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({
      ads_limit: 50,
      ads_used_this_period: 0,
      status: "active",
      statut: "ACTIVE",
      plan_id: freePlanId ?? null,
    }),
  });
  console.log("reset_all_free", patch.status, (await patch.text()).slice(0, 300));

  const userId = "966e6c97-e09c-4fb7-b82c-808c635b2516";
  const insertRes = await fetch(`${url}/rest/v1/ads?select=id`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      user_id: userId,
      titre: "Probe url ok",
      title: "Probe url ok",
      notes: "probe",
      statut: "DRAFT",
      status: "draft",
      quantite: 1,
      quantity: 1,
      source: "url",
      marketplace_id: "EBAY_FR",
      metadata: {},
    }),
  });
  const text = await insertRes.text();
  console.log("final_insert", insertRes.status, text.slice(0, 300));
  try {
    const parsed = JSON.parse(text) as Array<{ id: string }>;
    const id = parsed[0]?.id;
    if (id) {
      await fetch(`${url}/rest/v1/ads?id=eq.${id}`, {
        method: "DELETE",
        headers: { apikey: key, Authorization: `Bearer ${key}` },
      });
      console.log("cleanup_ok");
    }
  } catch {
    // ignore
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
