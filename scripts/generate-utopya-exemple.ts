import fs from "node:fs";
import path from "node:path";
import ExcelJS from "exceljs";

async function main() {
  const csvPath = path.resolve("public/templates/exemple-import-utopya.csv");
  const outPath = path.resolve("public/templates/exemple-import-utopya.xlsx");
  const csv = fs.readFileSync(csvPath, "utf8");
  const lines = csv.trim().split(/\r?\n/);
  const headers = lines[0].split(";");

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Utopya");
  ws.addRow(headers);
  for (let i = 1; i < lines.length; i++) {
    ws.addRow(lines[i].split(";"));
  }
  ws.getRow(1).font = { bold: true };
  ws.views = [{ state: "frozen", ySplit: 1 }];
  await wb.xlsx.writeFile(outPath);
  console.log("wrote", outPath, fs.statSync(outPath).size);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
