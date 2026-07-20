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

  console.log(
    JSON.stringify({
      local_ebay_client_id_len: (process.env.EBAY_CLIENT_ID || "").length,
      local_ebay_secret_len: (process.env.EBAY_CLIENT_SECRET || "").length,
      local_mock: process.env.EBAY_MOCK_MODE,
      marketplace: process.env.EBAY_MARKETPLACE_ID,
      env: process.env.EBAY_ENVIRONMENT,
    }),
  );

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

  for (const table of ["product_import_batches", "product_import_rows"]) {
    const def = doc.definitions?.[table];
    console.log(
      JSON.stringify({
        table,
        required: def?.required ?? [],
        props: Object.keys(def?.properties ?? {}),
      }),
    );
  }

  // Probe batch insert with known user
  const userId = "966e6c97-e09c-4fb7-b82c-808c635b2516";
  const payloads = [
    {
      name: "fr_cols",
      body: {
        user_id: userId,
        nom_fichier: "test.csv",
        statut: "PENDING",
        nombre_lignes: 1,
        lignes_traitees: 0,
        lignes_reussies: 0,
        lignes_echouees: 0,
      },
    },
    {
      name: "hybrid",
      body: {
        user_id: userId,
        nom_fichier: "test.csv",
        filename: "test.csv",
        statut: "PENDING",
        status: "UPLOADED",
        nombre_lignes: 1,
        total_rows: 1,
        lignes_traitees: 0,
        processed_rows: 0,
        lignes_reussies: 0,
        success_rows: 0,
        lignes_echouees: 0,
        failed_rows: 0,
      },
    },
  ];

  for (const p of payloads) {
    const res = await fetch(`${url}/rest/v1/product_import_batches?select=id`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(p.body),
    });
    const text = await res.text();
    console.log(JSON.stringify({ name: p.name, status: res.status, body: text.slice(0, 500) }));
    try {
      const parsed = JSON.parse(text) as Array<{ id: string }>;
      const id = parsed[0]?.id;
      if (id) {
        await fetch(`${url}/rest/v1/product_import_rows?batch_id=eq.${id}`, {
          method: "DELETE",
          headers: { apikey: key, Authorization: `Bearer ${key}` },
        });
        await fetch(`${url}/rest/v1/product_import_batches?id=eq.${id}`, {
          method: "DELETE",
          headers: { apikey: key, Authorization: `Bearer ${key}` },
        });
      }
    } catch {
      // ignore
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
