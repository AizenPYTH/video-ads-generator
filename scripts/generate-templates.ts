/**
 * Génère les 4 modèles d'import eBay France (Smart Seller).
 * Category ID volontairement vide dans les exemples → détection Taxonomy.
 */
import fs from "node:fs";
import path from "node:path";
import ExcelJS from "exceljs";
import {
  EBAY_FR_COLUMNS,
  COLUMN_INSTRUCTIONS,
  DROPDOWN_ACTIONS,
  DROPDOWN_FORMATS,
  DROPDOWN_DURATIONS,
  DROPDOWN_COUNTRIES,
  DROPDOWN_CONDITIONS,
  type EbayFrColumn,
} from "../features/imports/columns";

type TemplateRow = Record<EbayFrColumn, string>;

function baseRow(overrides: Partial<TemplateRow>): TemplateRow {
  const row = Object.fromEntries(
    EBAY_FR_COLUMNS.map((col) => [col, ""]),
  ) as TemplateRow;

  return {
    ...row,
    Action: "Add",
    Format: "FixedPrice",
    Duration: "GTC",
    Location: "Paris",
    Country: "FR",
    "Postal code": "75001",
    "Shipping profile name": "Standard",
    "Return profile name": "30 jours",
    "Payment profile name": "eBay Payments",
    Quantity: "1",
    "Unit quantity": "1",
    "Unit type": "Unité",
    "Condition ID": "3000",
    "Condition description": "Occasion",
    // Category ID vide : détection auto eBay
    "Category ID": "",
    ...overrides,
  };
}

export const EXAMPLE_PRODUCTS: TemplateRow[] = [
  baseRow({
    "Custom label (SKU)": "TEST-001",
    "Category Name": "Cartes mères pour ordinateurs portables",
    Title: "Carte mère MacBook Pro 16 A2141 820-01779-A",
    "Start price": "189.99",
    Brand: "Apple",
    Manufacturer: "Apple",
    MPN: "820-01779-A",
    Model: "A2141",
    "Product type": "Logic Board",
    "Sold item name": "Logic Board",
    "Compatible brand": "Apple",
    "Compatible device": "MacBook Pro 16",
    "Compatible model number": "A2141",
    Color: "Green",
    Material: "PCB",
    Type: "Logic Board",
    "Item specifics":
      "Brand=Apple|MPN=820-01779-A|Model=A2141|Type=Logic Board|Color=Green",
    Description: "Carte mère d'origine testée, référence 820-01779-A.",
  }),
  baseRow({
    "Custom label (SKU)": "TEST-002",
    "Category Name": "Écrans LCD pour portables",
    Title: "Écran LCD MacBook Air 13 A2337 Remplacement",
    "Start price": "129.50",
    Brand: "Apple",
    MPN: "661-17578",
    Model: "A2337",
    "Product type": "Screen Replacement",
    "Sold item name": "Screen Replacement",
    "Compatible brand": "Apple",
    "Compatible device": "MacBook Air 13",
    "Compatible model number": "A2337",
    Color: "Noir",
    Type: "LCD Panel",
    "Item specifics":
      "Brand=Apple|Model=A2337|Type=Screen Replacement|Color=Black",
    Description: "Dalle LCD de remplacement pour MacBook Air M1.",
  }),
  baseRow({
    "Custom label (SKU)": "TEST-003",
    "Category Name": "Batteries pour portables",
    Title: "Batterie MacBook Pro 15 A1707 020-00977",
    "Start price": "59.00",
    Brand: "Apple",
    MPN: "020-00977",
    Model: "A1707",
    "Product type": "Battery",
    "Sold item name": "Battery",
    "Compatible brand": "Apple",
    "Compatible device": "MacBook Pro 15",
    "Compatible model number": "A1707",
    Material: "Lithium-ion",
    Type: "Battery",
    "Item specifics": "Brand=Apple|MPN=020-00977|Model=A1707|Type=Battery",
    Description: "Batterie compatible MacBook Pro 15 pouces Touch Bar.",
  }),
  baseRow({
    "Custom label (SKU)": "TEST-004",
    "Category Name": "Connecteurs de charge",
    Title: "Connecteur port charge USB-C MacBook Pro A1990",
    "Start price": "24.90",
    Brand: "Apple",
    MPN: "820-00850-A",
    Model: "A1990",
    "Product type": "Charging Port",
    "Sold item name": "Charging Port",
    "Compatible brand": "Apple",
    "Compatible device": "MacBook Pro 13",
    "Compatible model number": "A1990",
    Type: "USB-C Port",
    "Item specifics":
      "Brand=Apple|MPN=820-00850-A|Type=Charging Port|Model=A1990",
    Description: "Connecteur de charge USB-C avec nappe incluse.",
  }),
  baseRow({
    "Custom label (SKU)": "TEST-005",
    "Category Name": "Nappes flex",
    Title: "Nappe flex trackpad MacBook Pro 13 A1708",
    "Start price": "14.50",
    Brand: "Apple",
    MPN: "821-01021-A",
    Model: "A1708",
    "Product type": "Flex Cable",
    "Sold item name": "Flex Cable",
    "Compatible brand": "Apple",
    "Compatible device": "MacBook Pro 13",
    "Compatible model number": "A1708",
    Type: "Flex Cable",
    "Item specifics": "Brand=Apple|MPN=821-01021-A|Type=Flex Cable",
    Description: "Nappe flex pour trackpad MacBook Pro 13 2016-2017.",
  }),
  baseRow({
    "Custom label (SKU)": "TEST-006",
    "Category Name": "Caméras portables",
    Title: "Caméra FaceTime MacBook Air A2179",
    "Start price": "19.99",
    Brand: "Apple",
    MPN: "821-02106",
    Model: "A2179",
    "Product type": "Camera",
    "Sold item name": "Camera Module",
    "Compatible brand": "Apple",
    "Compatible device": "MacBook Air 13",
    "Compatible model number": "A2179",
    Type: "Webcam",
    "Item specifics": "Brand=Apple|Model=A2179|Type=Camera",
    Description: "Module caméra FaceTime HD d'origine.",
  }),
  baseRow({
    "Custom label (SKU)": "TEST-007",
    "Category Name": "Haut-parleurs portables",
    Title: "Haut-parleurs MacBook Pro 16 A2141 paire",
    "Start price": "34.00",
    Brand: "Apple",
    MPN: "923-04201",
    Model: "A2141",
    "Product type": "Speaker",
    "Sold item name": "Speaker Set",
    "Compatible brand": "Apple",
    "Compatible device": "MacBook Pro 16",
    "Compatible model number": "A2141",
    Type: "Speaker",
    "Item specifics": "Brand=Apple|Model=A2141|Type=Speaker",
    Description: "Paire de haut-parleurs gauche et droite.",
  }),
  baseRow({
    "Custom label (SKU)": "TEST-008",
    "Category Name": "Claviers portables",
    Title: "Clavier AZERTY MacBook Pro 14 A2442",
    "Start price": "89.00",
    Brand: "Apple",
    MPN: "661-25830",
    Model: "A2442",
    "Product type": "Keyboard",
    "Sold item name": "Keyboard",
    "Compatible brand": "Apple",
    "Compatible device": "MacBook Pro 14",
    "Compatible model number": "A2442",
    Color: "Noir",
    Type: "Keyboard",
    "Item specifics": "Brand=Apple|Model=A2442|Type=Keyboard|Color=Black",
    Description: "Clavier rétroéclairé AZERTY avec Touch ID.",
  }),
  baseRow({
    "Custom label (SKU)": "TEST-009",
    "Category Name": "Trackpads",
    Title: "Trackpad Force Touch MacBook Pro 13 A2289",
    "Start price": "45.00",
    Brand: "Apple",
    MPN: "661-15729",
    Model: "A2289",
    "Product type": "Trackpad",
    "Sold item name": "Trackpad",
    "Compatible brand": "Apple",
    "Compatible device": "MacBook Pro 13",
    "Compatible model number": "A2289",
    Color: "Gris sidéral",
    Type: "Trackpad",
    "Item specifics": "Brand=Apple|Model=A2289|Type=Trackpad",
    Description: "Trackpad Force Touch gris sidéral.",
  }),
  baseRow({
    "Custom label (SKU)": "TEST-010",
    "Category Name": "Ventilateurs portables",
    Title: "Ventilateur gauche MacBook Pro 15 A1707",
    "Start price": "22.50",
    Brand: "Apple",
    MPN: "923-01314",
    Model: "A1707",
    "Product type": "Fan",
    "Sold item name": "Cooling Fan",
    "Compatible brand": "Apple",
    "Compatible device": "MacBook Pro 15",
    "Compatible model number": "A1707",
    Type: "Fan",
    "Item specifics": "Brand=Apple|Model=A1707|Type=Fan",
    Description: "Ventilateur de refroidissement côté gauche.",
  }),
  baseRow({
    "Custom label (SKU)": "TEST-011",
    "Category Name": "Chargeurs portables",
    Title: "Chargeur USB-C 61W MacBook compatible",
    "Start price": "39.90",
    Brand: "Apple",
    MPN: "MNF72",
    Model: "MNF72LL/A",
    "Product type": "Charger",
    "Sold item name": "Power Adapter",
    Type: "Charger",
    "Item specifics": "Brand=Apple|MPN=MNF72|Type=Charger|Wattage=61W",
    Description: "Adaptateur secteur USB-C 61W pour MacBook.",
  }),
  baseRow({
    "Custom label (SKU)": "TEST-012",
    "Category Name": "SSD / stockages",
    Title: "SSD NVMe 512Go MacBook Pro A1989",
    "Start price": "79.00",
    Brand: "Apple",
    MPN: "655-01036",
    Model: "A1989",
    "Product type": "SSD",
    "Sold item name": "Solid State Drive",
    "Compatible brand": "Apple",
    "Compatible device": "MacBook Pro 13",
    "Compatible model number": "A1989",
    Type: "SSD",
    "Item specifics": "Brand=Apple|Model=A1989|Type=SSD|Capacity=512GB",
    Description: "SSD NVMe 512 Go pour MacBook Pro.",
  }),
  baseRow({
    "Custom label (SKU)": "TEST-013",
    "Category Name": "Cartes Wi-Fi",
    Title: "Carte WiFi Bluetooth MacBook Air A1466",
    "Start price": "18.00",
    Brand: "Apple",
    MPN: "607-8969",
    Model: "A1466",
    "Product type": "WiFi Card",
    "Sold item name": "WiFi Card",
    "Compatible brand": "Apple",
    "Compatible device": "MacBook Air 13",
    "Compatible model number": "A1466",
    Type: "WiFi Card",
    "Item specifics": "Brand=Apple|Model=A1466|Type=WiFi Card",
    Description: "Carte WiFi/Bluetooth Broadcom d'origine.",
  }),
  baseRow({
    "Custom label (SKU)": "TEST-014",
    "Category Name": "Coques / boîtiers",
    Title: "Boîtier inférieur MacBook Pro 13 A2251",
    "Start price": "49.00",
    Brand: "Apple",
    MPN: "661-17529",
    Model: "A2251",
    "Product type": "Case",
    "Sold item name": "Bottom Case",
    "Compatible brand": "Apple",
    "Compatible device": "MacBook Pro 13",
    "Compatible model number": "A2251",
    Color: "Gris sidéral",
    Material: "Aluminium",
    Type: "Case",
    "Item specifics": "Brand=Apple|Model=A2251|Type=Case|Color=Space Gray",
    Description: "Coque inférieure aluminium gris sidéral.",
  }),
  baseRow({
    "Custom label (SKU)": "TEST-015",
    "Category Name": "Dissipateurs thermiques",
    Title: "Dissipateur thermique MacBook Pro 16 A2141",
    "Start price": "27.00",
    Brand: "Apple",
    MPN: "923-04200",
    Model: "A2141",
    "Product type": "Heatsink",
    "Sold item name": "Heatsink",
    "Compatible brand": "Apple",
    "Compatible device": "MacBook Pro 16",
    "Compatible model number": "A2141",
    Material: "Cuivre",
    Type: "Heatsink",
    "Item specifics": "Brand=Apple|Model=A2141|Type=Heatsink|Material=Copper",
    Description: "Dissipateur thermique CPU/GPU.",
  }),
  baseRow({
    "Custom label (SKU)": "TEST-016",
    "Category Name": "Cartes mères pour ordinateurs portables",
    Title: "Carte mère MacBook Pro 13 A2159 820-01646-A",
    "Start price": "149.00",
    Brand: "Apple",
    Manufacturer: "Apple",
    MPN: "01646-A",
    Model: "A2159",
    "Product type": "Logic Board",
    "Sold item name": "Logic Board",
    "Compatible brand": "Apple",
    "Compatible device": "MacBook Pro 13",
    "Compatible model number": "A2159",
    Color: "Vert",
    Type: "Logic Board",
    "Item specifics":
      "Brand=Apple|MPN=01646-A|Model=A2159|Type=Logic Board|Color=Green",
    Description: "Carte mère référence 820-01646-A / 01646-A.",
  }),
  baseRow({
    "Custom label (SKU)": "TEST-017",
    "Category Name": "Écrans LCD pour portables",
    Title: "Écran complet MacBook Pro 14 A2442",
    "Start price": "299.00",
    Brand: "Apple",
    MPN: "661-25828",
    Model: "A2442",
    "Product type": "Screen Replacement",
    "Sold item name": "Screen Replacement",
    "Compatible brand": "Apple",
    "Compatible device": "MacBook Pro 14",
    "Compatible model number": "A2442",
    Type: "Display Assembly",
    "Item specifics": "Brand=Apple|Model=A2442|Type=Screen Replacement",
    Description: "Module écran complet Liquid Retina XDR.",
  }),
  baseRow({
    "Custom label (SKU)": "TEST-018",
    "Category Name": "Batteries pour portables",
    Title: "Batterie MacBook Air M2 A2681",
    "Start price": "69.00",
    Brand: "Apple",
    MPN: "A2681-BAT",
    Model: "A2681",
    "Product type": "Battery",
    "Sold item name": "Battery",
    "Compatible brand": "Apple",
    "Compatible device": "MacBook Air 15",
    "Compatible model number": "A2681",
    Type: "Battery",
    "Item specifics": "Brand=Apple|Model=A2681|Type=Battery",
    Description: "Batterie pour MacBook Air 15 M2.",
  }),
  baseRow({
    "Custom label (SKU)": "TEST-019",
    "Category Name": "Nappes flex",
    Title: "Nappe écran MAINFPC_V3.1 MacBook Pro 15",
    "Start price": "32.00",
    Brand: "Apple",
    MPN: "MAINFPC_V3.1",
    Model: "A1990",
    "Product type": "Flex Cable",
    "Sold item name": "Display Flex Cable",
    "Compatible brand": "Apple",
    "Compatible device": "MacBook Pro 15",
    "Compatible model number": "A1990",
    Type: "Flex Cable",
    "Item specifics": "Brand=Apple|MPN=MAINFPC_V3.1|Type=Flex Cable",
    Description: "Nappe vidéo référence MAINFPC_V3.1.",
  }),
  baseRow({
    "Custom label (SKU)": "TEST-020",
    "Category Name": "Connecteurs audio",
    Title: "Connecteur audio jack MacBook Pro M6100",
    "Start price": "16.50",
    Brand: "Apple",
    MPN: "M6100",
    Model: "A1502",
    "Product type": "Connector",
    "Sold item name": "Audio Jack",
    "Compatible brand": "Apple",
    "Compatible device": "MacBook Pro 13",
    "Compatible model number": "A1502",
    Type: "Audio Connector",
    "Item specifics": "Brand=Apple|MPN=M6100|Type=Connector",
    Description: "Connecteur jack audio 3.5mm avec nappe.",
  }),
];

function rowsToCsv(rows: TemplateRow[]): string {
  const header = EBAY_FR_COLUMNS.join(";");
  const body = rows
    .map((row) =>
      EBAY_FR_COLUMNS.map((col) => {
        const value = row[col] ?? "";
        const escaped = value.replace(/"/g, '""');
        return /[;"\n]/.test(value) ? `"${escaped}"` : escaped;
      }).join(";"),
    )
    .join("\n");

  return `\uFEFF${header}\n${body}\n`;
}

async function writeXlsx(filePath: string, rows: TemplateRow[]): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Smart Seller";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Annonces", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  sheet.columns = EBAY_FR_COLUMNS.map((col) => ({
    header: col,
    key: col,
    width: Math.min(28, Math.max(12, col.length + 4)),
  }));

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.alignment = { vertical: "middle", wrapText: true };
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: EBAY_FR_COLUMNS.length },
  };

  const textCols = new Set([
    "Custom label (SKU)",
    "P:EAN",
    "MPN",
    "Postal code",
    "Category ID",
    "Condition ID",
  ]);

  for (const data of rows) {
    const values = EBAY_FR_COLUMNS.map((col) => data[col] ?? "");
    const row = sheet.addRow(values);
    EBAY_FR_COLUMNS.forEach((col, idx) => {
      if (textCols.has(col)) {
        const cell = row.getCell(idx + 1);
        cell.numFmt = "@";
        cell.value = String(data[col] ?? "");
      }
    });
  }

  // Listes déroulantes (feuille valeurs)
  const valuesSheet = workbook.addWorksheet("Valeurs autorisées");
  valuesSheet.getColumn(1).values = ["Action", ...DROPDOWN_ACTIONS];
  valuesSheet.getColumn(2).values = ["Format", ...DROPDOWN_FORMATS];
  valuesSheet.getColumn(3).values = ["Duration", ...DROPDOWN_DURATIONS];
  valuesSheet.getColumn(4).values = ["Country", ...DROPDOWN_COUNTRIES];
  valuesSheet.getColumn(5).values = [
    "Condition ID",
    ...DROPDOWN_CONDITIONS.map((c) => c.id),
  ];
  valuesSheet.getColumn(6).values = [
    "Condition label",
    ...DROPDOWN_CONDITIONS.map((c) => c.label),
  ];

  const colIndex = (name: EbayFrColumn) => EBAY_FR_COLUMNS.indexOf(name) + 1;
  const lastDataRow = Math.max(rows.length + 1, 200);

  const addList = (colName: EbayFrColumn, formula: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (sheet as any).dataValidations.add(
      `${colLetter(colIndex(colName))}2:${colLetter(colIndex(colName))}${lastDataRow}`,
      {
        type: "list",
        allowBlank: true,
        formulae: [formula],
        showErrorMessage: true,
        errorTitle: "Valeur non autorisée",
        error: "Choisissez une valeur de la liste.",
      },
    );
  };

  addList("Action", "'Valeurs autorisées'!$A$2:$A$5");
  addList("Format", "'Valeurs autorisées'!$B$2:$B$3");
  addList("Duration", "'Valeurs autorisées'!$C$2:$C$6");
  addList("Country", "'Valeurs autorisées'!$D$2:$D$8");
  addList("Condition ID", "'Valeurs autorisées'!$E$2:$E$6");

  const instructions = workbook.addWorksheet("Instructions");
  instructions.columns = [
    { header: "Colonne", key: "column", width: 28 },
    { header: "Description", key: "text", width: 90 },
  ];
  instructions.getRow(1).font = { bold: true };
  for (const item of COLUMN_INSTRUCTIONS) {
    instructions.addRow(item);
  }
  instructions.addRow({
    column: "Rappel",
    text: "Category ID est facultatif. Smart Seller détecte la catégorie via l'API eBay Taxonomy (EBAY_FR). Une ligne = une annonce. Aucune publication automatique.",
  });

  await workbook.xlsx.writeFile(filePath);
}

function colLetter(index: number): string {
  let n = index;
  let s = "";
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

async function main(): Promise<void> {
  const templatesDir = path.resolve(process.cwd(), "public", "templates");
  fs.mkdirSync(templatesDir, { recursive: true });

  const emptyTemplate = baseRow({});

  fs.writeFileSync(
    path.join(templatesDir, "modele-import-ebay.csv"),
    rowsToCsv([emptyTemplate]),
    "utf8",
  );
  await writeXlsx(path.join(templatesDir, "modele-import-ebay.xlsx"), [
    emptyTemplate,
  ]);

  fs.writeFileSync(
    path.join(templatesDir, "exemple-import-ebay.csv"),
    rowsToCsv(EXAMPLE_PRODUCTS),
    "utf8",
  );
  await writeXlsx(
    path.join(templatesDir, "exemple-import-ebay.xlsx"),
    EXAMPLE_PRODUCTS,
  );

  // Alias demandé dans le brief
  fs.copyFileSync(
    path.join(templatesDir, "exemple-import-ebay.xlsx"),
    path.join(templatesDir, "modele-ebay-france-20-produits.xlsx"),
  );

  console.log(`Generated template files in ${templatesDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
