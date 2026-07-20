import fs from "node:fs";
import path from "node:path";
import ExcelJS from "exceljs";
import { parseCsv } from "../features/imports/csv-parser";
import { parseXlsx } from "../features/imports/xlsx-parser";
import { normalizeImportRows } from "../features/imports/normalizer";
import { validateImportRows } from "../features/imports/validator";

async function main() {
  const dir = path.resolve("public/templates");
  const files = [
    "modele-import-ebay.csv",
    "modele-import-ebay.xlsx",
    "exemple-import-ebay.csv",
    "exemple-import-ebay.xlsx",
    "modele-ebay-france-20-produits.xlsx",
  ];

  for (const f of files) {
    const p = path.join(dir, f);
    if (!fs.existsSync(p)) throw new Error(`missing ${f}`);
    console.log("OK file", f, fs.statSync(p).size);
  }

  const csvEx = fs.readFileSync(path.join(dir, "exemple-import-ebay.csv"));
  const csvParsed = parseCsv(csvEx);
  const csvNorm = normalizeImportRows(csvParsed.rows);
  const csvVal = validateImportRows(csvNorm);
  console.log(
    "CSV examples rows",
    csvParsed.rows.length,
    "valid",
    csvVal.validRowIndexes.length,
    "errors",
    csvVal.errors.length,
  );
  console.log("accents sample", csvNorm[0].titre);
  console.log("sku", csvNorm[0].sku, "mpn", csvNorm[0].mpn);
  console.log("item_specifics", csvNorm[0].item_specifics);
  console.log(
    "photo empty",
    csvNorm.every((r) => !r.photo_url),
  );
  console.log(
    "category id empty",
    csvNorm.every((r) => !r.ebay_category_id),
  );
  console.log("postal", csvNorm[0].postal_code);

  // Invalid mixed file: one bad row
  const mixed =
    "Title;Start price\nProduit OK;10.00\n;0\nProduit OK2;20.00\n";
  const mixedParsed = parseCsv(mixed);
  const mixedNorm = normalizeImportRows(mixedParsed.rows);
  const mixedVal = validateImportRows(mixedNorm);
  console.log(
    "partial valid indexes",
    mixedVal.validRowIndexes,
    "error rows",
    [...new Set(mixedVal.errors.map((e) => e.row))],
  );

  const xbuf = fs.readFileSync(path.join(dir, "exemple-import-ebay.xlsx"));
  const ab = xbuf.buffer.slice(
    xbuf.byteOffset,
    xbuf.byteOffset + xbuf.byteLength,
  );
  const xParsed = parseXlsx(ab);
  console.log("XLSX examples rows", xParsed.rows.length, "errors", xParsed.errors);

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path.join(dir, "exemple-import-ebay.xlsx"));
  console.log(
    "sheets",
    wb.worksheets.map((s) => s.name),
  );
  const annonces = wb.getWorksheet("Annonces");
  if (!annonces) throw new Error("Annonces sheet missing");
  console.log("views", JSON.stringify(annonces.views));
  console.log("autoFilter", JSON.stringify(annonces.autoFilter));
  console.log("rowCount", annonces.rowCount);
  const skuCell = annonces.getRow(2).getCell(2);
  console.log("SKU fmt", skuCell.numFmt, "value", skuCell.value);

  // blank filled import path
  const blankCsv = fs.readFileSync(path.join(dir, "modele-import-ebay.csv"), "utf8");
  const filled =
    blankCsv.replace(
      /Add;;;;;;1;;;;3000;Occasion;;FixedPrice;GTC;Paris;FR;75001;Standard;30 jours;eBay Payments;;;;;;;;;;;;;;1;Unité;/,
      'Add;TEST-FILL;;Cartes mères;Carte mère test accents éàù;;0123456789012;99.00;1;;3000;Occasion;Desc;FixedPrice;GTC;Paris;FR;01000;Standard;30 jours;eBay Payments;Apple;Apple;820-01779-A;A2141;Logic Board;Logic Board;Apple;MacBook;A2141;;;;Logic Board;1;Unité;Brand=Apple|MPN=820-01779-A',
    );
  // Fallback if replace failed: build row manually
  let filledParsed = parseCsv(filled);
  if (filledParsed.rows.length === 0 || !filledParsed.rows[0].titre) {
    const header = blankCsv.split(/\r?\n/)[0];
    const row =
      "Add;TEST-FILL;;Cartes mères;Carte mère test accents éàù;;0123456789012;99.00;1;;3000;Occasion;Desc;FixedPrice;GTC;Paris;FR;01000;Standard;30 jours;eBay Payments;Apple;Apple;820-01779-A;A2141;Logic Board;Logic Board;Apple;MacBook;A2141;;;;Logic Board;1;Unité;Brand=Apple|MPN=820-01779-A";
    filledParsed = parseCsv(`${header}\n${row}\n`);
  }
  const filledNorm = normalizeImportRows(filledParsed.rows);
  console.log(
    "filled import",
    filledNorm[0]?.titre,
    filledNorm[0]?.ean,
    filledNorm[0]?.postal_code,
    filledNorm[0]?.item_specifics,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
