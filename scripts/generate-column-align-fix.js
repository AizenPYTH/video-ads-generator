/**
 * Generates a safe migration that ADD COLUMN IF NOT EXISTS for every column
 * defined in CREATE TABLE blocks of the incremental / initial schema.
 * Stops whack-a-mole on pre-existing tables with divergent schemas.
 */
const fs = require("fs");
const path = require("path");

const srcPath = path.join(
  __dirname,
  "..",
  "supabase",
  "migrations",
  "20260720120000_snowolf_incremental_safe.sql",
);
const outPath = path.join(
  __dirname,
  "..",
  "supabase",
  "migrations",
  "20260720150000_fix_align_all_columns.sql",
);

const src = fs.readFileSync(srcPath, "utf8");

const tableRe =
  /CREATE TABLE IF NOT EXISTS public\.(\w+)\s*\(([\s\S]*?)\n\);/g;

/** @type {Record<string, string[]>} */
const colsByTable = {};

function simplifyColumnDef(line) {
  let t = line.trim().replace(/,$/, "");
  if (!t) return null;
  if (
    /^(CONSTRAINT|UNIQUE|PRIMARY|CHECK|FOREIGN|--)/i.test(t) ||
    t.includes("(") && /^(UNIQUE|PRIMARY|CHECK)/i.test(t)
  ) {
    return null;
  }
  // Skip inline UNIQUE/PRIMARY that are table constraints without a column name first
  const colMatch = t.match(/^([a-z_][a-z0-9_]*)\s+(.+)$/i);
  if (!colMatch) return null;
  const col = colMatch[1];
  let rest = colMatch[2];

  // Remove inline REFERENCES ... (FK) — add column without FK first
  rest = rest.replace(/\s+REFERENCES\s+[\s\S]*$/i, "");
  // Remove inline UNIQUE / PRIMARY KEY on column
  rest = rest.replace(/\s+PRIMARY KEY/gi, "");
  rest = rest.replace(/\s+UNIQUE/gi, "");
  // Soften NOT NULL for pre-existing tables with rows
  rest = rest.replace(/\s+NOT NULL/gi, "");
  // Ensure enums with DEFAULT cast stay valid
  rest = rest.trim();
  if (!rest) return null;
  return { col, def: rest };
}

let m;
while ((m = tableRe.exec(src)) !== null) {
  const table = m[1];
  const body = m[2];
  const cols = [];
  for (const raw of body.split("\n")) {
    const parsed = simplifyColumnDef(raw);
    if (!parsed) continue;
    // Skip id if complicated — still add with DEFAULT
    cols.push(parsed);
  }
  colsByTable[table] = cols;
}

let out = "";
out += "-- SNOWOLF - fix: alignement complet des colonnes manquantes\n";
out += "-- Cause: tables pre-existantes avec schema different (sans created_at, user_id, etc.)\n";
out += "-- Sur: aucune suppression. Idempotent.\n";
out += "-- Projet: https://olijbnhinkvnqoudmqbv.supabase.co\n";
out += "-- Executer CE fichier une fois, puis relancer l'incremental si besoin.\n\n";

out += 'CREATE EXTENSION IF NOT EXISTS "pgcrypto";\n\n';

const tables = Object.keys(colsByTable).sort();
for (const table of tables) {
  out += `-- ${table}\n`;
  for (const { col, def } of colsByTable[table]) {
    // id as UUID with default is fine
    out += `ALTER TABLE public.${table} ADD COLUMN IF NOT EXISTS ${col} ${def};\n`;
  }
  out += "\n";
}

// Conditional indexes for created_at / updated_at / user_id / statut common ones
out += "-- Indexes created_at (safe)\n";
for (const table of tables) {
  const hasCreated = colsByTable[table].some((c) => c.col === "created_at");
  if (!hasCreated) continue;
  out += `DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='${table}' AND column_name='created_at') THEN
    CREATE INDEX IF NOT EXISTS idx_${table}_created_at ON public.${table} (created_at);
  END IF;
END $$;\n`;
}

out += `\n-- Verification\n`;
out += `SELECT c.table_name, COUNT(*) FILTER (WHERE c.column_name = 'created_at') AS has_created_at,
       COUNT(*) FILTER (WHERE c.column_name = 'user_id') AS has_user_id,
       COUNT(*) FILTER (WHERE c.column_name = 'statut') AS has_statut
FROM information_schema.columns c
WHERE c.table_schema = 'public'
  AND c.table_name = ANY (ARRAY[${tables.map((t) => `'${t}'`).join(",")}])
GROUP BY c.table_name
ORDER BY c.table_name;\n`;

fs.writeFileSync(outPath, out, "utf8");
console.log("Wrote", outPath);
console.log("Tables:", tables.length);
console.log(
  "subscription_plans cols:",
  (colsByTable.subscription_plans || []).map((c) => c.col).join(", "),
);
