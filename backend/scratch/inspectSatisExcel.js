import xlsx from "xlsx";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FILE = path.join(__dirname, "..", "..", "Satis.xlsx");

const wb = xlsx.readFile(FILE);
const sheet = wb.Sheets[wb.SheetNames[0]];
const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: false });

console.log("Total rows:", rows.length);
console.log("\n-- İlk 5:");
for (let i = 0; i < Math.min(5, rows.length); i++) {
  console.log(`  [${i}]`, JSON.stringify(rows[i]));
}

console.log("\n-- Boş/qismən sətirləri və miqdarı mənfi olanları tap:");
let foundEmpty = 0, foundNeg = 0;
for (let i = 0; i < rows.length; i++) {
  const r = rows[i];
  if (!r) continue;
  const A = r[0], B = r[1], C = r[2];
  if (B && (C === null || C === undefined || C === '' || String(C).trim() === '')) {
    if (foundEmpty < 10) console.log(`  [${i}] EMPTY-C:`, JSON.stringify(r));
    foundEmpty++;
  }
  const cNum = parseFloat(String(C ?? '').replace(',', '.'));
  if (Number.isFinite(cNum) && cNum < 0) {
    if (foundNeg < 10) console.log(`  [${i}] NEG-C:`, JSON.stringify(r));
    foundNeg++;
  }
}
console.log(`\nTotal EMPTY rows: ${foundEmpty}`);
console.log(`Total NEG rows: ${foundNeg}`);
