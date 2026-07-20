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

  const usersRes = await fetch(`${url}/auth/v1/admin/users?page=1&per_page=50`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  const usersJson = (await usersRes.json()) as {
    users?: Array<{ id: string; email?: string }>;
  };
  const users = usersJson.users ?? [];

  const subsRes = await fetch(
    `${url}/rest/v1/subscriptions?select=user_id,plan,status,statut,ads_limit,ads_used_this_period,plan_id`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } },
  );
  const subs = (await subsRes.json()) as Array<{
    user_id: string;
    plan: string;
    status: string;
    statut: string;
    ads_limit: number;
    ads_used_this_period: number;
  }>;
  const byUser = new Map(subs.map((s) => [s.user_id, s]));

  console.log(
    JSON.stringify(
      users.map((u) => ({
        email: u.email,
        hasSub: byUser.has(u.id),
        sub: byUser.get(u.id) ?? null,
      })),
      null,
      2,
    ),
  );

  // Ensure free plan id
  const plansRes = await fetch(
    `${url}/rest/v1/subscription_plans?code=eq.free&select=id&limit=1`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } },
  );
  const plans = (await plansRes.json()) as Array<{ id: string }>;
  const freePlanId = plans[0]?.id;
  console.log("freePlanId", freePlanId);

  // Backfill missing subscriptions
  for (const u of users) {
    if (byUser.has(u.id)) continue;
    const body = {
      user_id: u.id,
      plan: "free",
      status: "active",
      statut: "ACTIVE",
      ads_limit: 50,
      ads_used_this_period: 0,
      plan_id: freePlanId ?? null,
    };
    const res = await fetch(`${url}/rest/v1/subscriptions`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    console.log("backfill", u.email, res.status, (await res.text()).slice(0, 200));
  }

  // Reset quota for existing free subs at limit
  for (const s of subs) {
    if (s.ads_used_this_period >= s.ads_limit) {
      const res = await fetch(
        `${url}/rest/v1/subscriptions?user_id=eq.${s.user_id}`,
        {
          method: "PATCH",
          headers,
          body: JSON.stringify({
            ads_limit: Math.max(s.ads_limit, 50),
            ads_used_this_period: 0,
            status: "active",
            statut: "ACTIVE",
            plan_id: freePlanId ?? null,
          }),
        },
      );
      console.log(
        "reset_quota",
        s.user_id.slice(0, 8),
        res.status,
        (await res.text()).slice(0, 200),
      );
    }
  }

  // Retry insert for first user
  const userId = users[0]?.id;
  if (!userId) return;
  const insertRes = await fetch(`${url}/rest/v1/ads?select=id`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      user_id: userId,
      titre: "Probe after fix",
      title: "Probe after fix",
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
  const insertText = await insertRes.text();
  console.log("insert_retry", insertRes.status, insertText.slice(0, 300));
  try {
    const parsed = JSON.parse(insertText) as Array<{ id: string }>;
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
