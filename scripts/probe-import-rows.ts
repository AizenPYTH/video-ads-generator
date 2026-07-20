import fs from "node:fs";

function loadEnvLocal() {
  const text = fs.readFileSync(".env.local", "utf8");
  for (const line of text.split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

async function main() {
  loadEnvLocal();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const userId = "966e6c97-e09c-4fb7-b82c-808c635b2516";
  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };

  const batchBody = {
    user_id: userId,
    filename: "exemple.csv",
    nom_fichier: "exemple.csv",
    file_type: "csv",
    status: "UPLOADED",
    statut: "PENDING",
    total_rows: 1,
    nombre_lignes: 1,
    completed_rows: 0,
    failed_rows: 0,
    needs_review_rows: 0,
    lignes_traitees: 0,
    lignes_reussies: 0,
    lignes_echouees: 0,
  };

  const batchRes = await fetch(`${url}/rest/v1/product_import_batches?select=id`, {
    method: "POST",
    headers,
    body: JSON.stringify(batchBody),
  });
  const batchText = await batchRes.text();
  console.log("batch", batchRes.status, batchText.slice(0, 300));
  const batchId = (JSON.parse(batchText) as Array<{ id: string }>)[0]?.id;
  if (!batchId) return;

  const rowBodies = [
    {
      name: "fr",
      body: {
        user_id: userId,
        batch_id: batchId,
        numero_ligne: 1,
        statut: "PENDING",
        donnees_brutes: { titre: "Test" },
      },
    },
    {
      name: "hybrid",
      body: {
        user_id: userId,
        batch_id: batchId,
        row_number: 1,
        numero_ligne: 1,
        status: "PENDING",
        statut: "PENDING",
        source_data: { Title: "Test" },
        normalized_data: { titre: "Test" },
        donnees_brutes: { titre: "Test" },
        warnings: [],
        idempotency_key: `${batchId}:1`,
      },
    },
  ];

  for (const r of rowBodies) {
    const res = await fetch(`${url}/rest/v1/product_import_rows?select=id`, {
      method: "POST",
      headers,
      body: JSON.stringify(r.body),
    });
    console.log(r.name, res.status, (await res.text()).slice(0, 400));
  }

  await fetch(`${url}/rest/v1/product_import_rows?batch_id=eq.${batchId}`, {
    method: "DELETE",
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  await fetch(`${url}/rest/v1/product_import_batches?id=eq.${batchId}`, {
    method: "DELETE",
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
