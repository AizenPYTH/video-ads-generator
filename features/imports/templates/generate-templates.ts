import * as fs from "fs";
import * as path from "path";
import * as XLSX from "xlsx";

const TEMPLATE_HEADERS = [
  "titre",
  "description",
  "prix_achat",
  "prix_vente",
  "quantite",
  "sku",
  "ebay_category_id",
  "ebay_condition_id",
  "notes",
  "item_specifics",
];

const SAMPLE_ROW = [
  "Carte mère MacBook Pro 13\" 2018",
  "Carte mère d'origine testée et fonctionnelle.",
  "45.00",
  "89.90",
  "1",
  "MBP-820-01779-A",
  "175673",
  "3000",
  "Testé OK",
  "Brand=Apple|MPN=820-01779-A|Compatible Model=MacBook Pro 13\" 2018",
];

export function generateCsvTemplate(): string {
  const header = TEMPLATE_HEADERS.join(",");
  const sample = SAMPLE_ROW.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",");
  return `${header}\n${sample}\n`;
}

export function generateXlsxTemplate(): Buffer {
  const workbook = XLSX.utils.book_new();
  const data = [TEMPLATE_HEADERS, SAMPLE_ROW];
  const sheet = XLSX.utils.aoa_to_sheet(data);

  sheet["!cols"] = TEMPLATE_HEADERS.map(() => ({ wch: 25 }));
  XLSX.utils.book_append_sheet(workbook, sheet, "Annonces");

  return Buffer.from(
    XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }),
  );
}

export function writeTemplates(outputDir: string): void {
  const dir = path.resolve(outputDir);
  fs.mkdirSync(dir, { recursive: true });

  fs.writeFileSync(path.join(dir, "snowolf-import-template.csv"), generateCsvTemplate(), "utf-8");
  fs.writeFileSync(path.join(dir, "snowolf-import-template.xlsx"), generateXlsxTemplate());

  console.log(`Templates générés dans ${dir}`);
}

if (require.main === module) {
  const outputDir = process.argv[2] ?? "./templates";
  writeTemplates(outputDir);
}
