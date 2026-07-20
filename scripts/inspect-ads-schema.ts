import fs from "node:fs";

const path =
  "C:/Users/pain/.cursor/projects/c-Users-pain-Documents-EBAY/agent-tools/e367b1d2-e247-4f18-bd07-04c787b5d2a6.txt";
const t = fs.readFileSync(path, "utf8");

// Find JSON blob that starts with {"swagger"
const start = t.indexOf('{"swagger":"2.0"');
const end = t.indexOf("\n", start);
const jsonText = t.slice(start, end > start ? end : undefined);
let doc;
try {
  doc = JSON.parse(jsonText);
} catch (e) {
  // file may wrap lines; take largest swagger object
  const m = t.match(/\{"swagger":"2\.0"[\s\S]*\}\s*$/m);
  if (!m) throw e;
  doc = JSON.parse(m[0]);
}

const ads = doc.definitions?.ads;
console.log(JSON.stringify({
  required: ads?.required,
  props: Object.keys(ads?.properties ?? {}),
  source: ads?.properties?.source,
  statut: ads?.properties?.statut,
  title: ads?.properties?.title,
  titre: ads?.properties?.titre,
  metadata: ads?.properties?.metadata,
  notes: ads?.properties?.notes,
}, null, 2));
