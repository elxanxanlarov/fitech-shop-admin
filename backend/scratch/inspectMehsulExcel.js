import xlsx from "xlsx";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FILE = path.join(__dirname, "..", "..", "Mehsul.xlsx");

const wb = xlsx.readFile(FILE);
console.log("Sheets:", wb.SheetNames);

for (const sn of wb.SheetNames) {
  console.log(`\n===== Sheet: ${sn} =====`);
  const sheet = wb.Sheets[sn];
  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: false });
  console.log("Total rows:", rows.length);

  console.log("\n-- İlk 8 sətir (raw):");
  for (let i = 0; i < Math.min(8, rows.length); i++) {
    console.log(`  [${i}]`, JSON.stringify(rows[i]));
  }

  console.log("\n-- 9-15-ci sətirlər:");
  for (let i = 8; i < Math.min(15, rows.length); i++) {
    console.log(`  [${i}]`, JSON.stringify(rows[i]));
  }

  // Default object oxu (necə import oxuyur)
  console.log("\n-- Default sheet_to_json (object format) — ilk 3 sətir:");
  const objs = xlsx.utils.sheet_to_json(sheet, { defval: null, raw: false });
  console.log("  Keys:", objs[0] ? Object.keys(objs[0]) : "[empty]");
  for (let i = 0; i < Math.min(3, objs.length); i++) {
    console.log(`  obj[${i}]:`, JSON.stringify(objs[i]));
  }
}
