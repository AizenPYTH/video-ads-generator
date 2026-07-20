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

async function sql(query: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  // Use PostgREST isn't enough — use pg via supabase SQL API if available.
  // Fallback: management not available; use rpc if exists.
  const res = await fetch(`${url}/rest/v1/rpc/exec_sql`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });
  return { status: res.status, body: await res.text() };
}

async function main() {
  loadEnvLocal();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  // List subscription_plans
  const plans = await fetch(
    `${url}/rest/v1/subscription_plans?select=*&limit=20`,
    {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    },
  );
  console.log("plans", plans.status, (await plans.text()).slice(0, 800));

  const subs = await fetch(
    `${url}/rest/v1/subscriptions?select=*&limit=20`,
    {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    },
  );
  console.log("subs", subs.status, (await subs.text()).slice(0, 800));

  // OpenAPI for subscriptions required
  const openapiRes = await fetch(`${url}/rest/v1/`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: "application/openapi+json",
    },
  });
  const doc = (await openapiRes.json()) as {
    definitions?: Record<
      string,
      { required?: string[]; properties?: Record<string, unknown> }
    >;
  };
  console.log(
    JSON.stringify(
      {
        subscriptions_required: doc.definitions?.subscriptions?.required,
        subscriptions_props: Object.keys(
          doc.definitions?.subscriptions?.properties ?? {},
        ),
        plans_required: doc.definitions?.subscription_plans?.required,
        plans_props: Object.keys(
          doc.definitions?.subscription_plans?.properties ?? {},
        ),
      },
      null,
      2,
    ),
  );

  void sql;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
