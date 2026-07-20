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

  const openapiRes = await fetch(`${url}/rest/v1/`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: "application/openapi+json",
    },
  });
  const doc = (await openapiRes.json()) as {
    definitions?: {
      ads?: {
        required?: string[];
        properties?: Record<string, unknown>;
      };
    };
  };

  const ads = doc.definitions?.ads;
  console.log(
    JSON.stringify(
      {
        required: ads?.required ?? [],
        props: Object.keys(ads?.properties ?? {}),
      },
      null,
      2,
    ),
  );

  // Get one real user id
  const usersRes = await fetch(`${url}/auth/v1/admin/users?page=1&per_page=1`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
  });
  const usersJson = (await usersRes.json()) as {
    users?: Array<{ id: string; email?: string }>;
  };
  const userId = usersJson.users?.[0]?.id;
  console.log("probe_user", userId ? "found" : "missing");

  if (!userId) return;

  const payloads = [
    {
      name: "fr_only",
      body: {
        user_id: userId,
        titre: "Probe FR",
        notes: "probe",
        statut: "DRAFT",
        quantite: 1,
        metadata: {},
      },
    },
    {
      name: "hybrid",
      body: {
        user_id: userId,
        titre: "Probe hybrid",
        title: "Probe hybrid",
        notes: "probe",
        statut: "DRAFT",
        status: "draft",
        quantite: 1,
        quantity: 1,
        source: "url_import",
        marketplace_id: "EBAY_FR",
        metadata: {},
      },
    },
    {
      name: "minimal_legacy",
      body: {
        user_id: userId,
        title: "Probe legacy",
        source: "url_import",
        marketplace_id: "EBAY_FR",
      },
    },
  ];

  for (const payload of payloads) {
    const res = await fetch(`${url}/rest/v1/ads?select=id`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(payload.body),
    });
    const text = await res.text();
    console.log(
      JSON.stringify({
        name: payload.name,
        status: res.status,
        body: text.slice(0, 400),
      }),
    );

    // cleanup if created
    try {
      const parsed = JSON.parse(text) as Array<{ id: string }> | { id: string };
      const id = Array.isArray(parsed) ? parsed[0]?.id : parsed.id;
      if (id) {
        await fetch(`${url}/rest/v1/ads?id=eq.${id}`, {
          method: "DELETE",
          headers: {
            apikey: key,
            Authorization: `Bearer ${key}`,
          },
        });
      }
    } catch {
      // ignore
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
