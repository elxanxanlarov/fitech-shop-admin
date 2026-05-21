/**
 * debugExcel.js
 *
 * Excel faylını detallı parse edib hər sheet-in hər sətrini, hər cell-in
 * RAW (xam saxlanılan) və FORMATTED (göstərilən) dəyərlərini çap edir.
 *
 * İstifadə:
 *   1) Excel faylını `backend/scratch/input.xlsx` adı ilə qoy
 *      (və ya başqa yola argument ilə ötür)
 *   2) İşə sal:
 *        node scratch/debugExcel.js
 *        node scratch/debugExcel.js path/to/file.xlsx
 *        node scratch/debugExcel.js path/to/file.xlsx "QUTU GÜL"  ← yalnız bu məhsula uyğun sətrləri göstər
 */

import xlsx from "xlsx";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const inputPath = process.argv[2] || path.join(__dirname, "input.xlsx");
const filterTerm = process.argv[3] ? process.argv[3].toLowerCase() : null;

if (!fs.existsSync(inputPath)) {
    console.error(`❌ Fayl tapılmadı: ${inputPath}`);
    console.error("İstifadə: node scratch/debugExcel.js [fayl_yolu] [axtarış_termini]");
    process.exit(1);
}

console.log(`📂 Oxunur: ${inputPath}`);
const workbook = xlsx.readFile(inputPath, { cellNF: true, cellStyles: true });

console.log(`📊 Sheet sayı: ${workbook.SheetNames.length}`);
console.log(`📋 Sheet adları: ${workbook.SheetNames.join(", ")}`);
console.log();

for (const sheetName of workbook.SheetNames) {
    console.log("═══════════════════════════════════════════════════════════════");
    console.log(`📄 SHEET: ${sheetName}`);
    console.log("═══════════════════════════════════════════════════════════════");

    const sheet = workbook.Sheets[sheetName];
    if (!sheet["!ref"]) {
        console.log("(boş sheet)\n");
        continue;
    }
    const range = xlsx.utils.decode_range(sheet["!ref"]);
    console.log(`Range: ${sheet["!ref"]}  (${range.e.r + 1} sətir × ${range.e.c + 1} sütun)`);
    console.log();

    let printedRows = 0;
    for (let R = range.s.r; R <= range.e.r; R++) {
        // İlk olaraq bütün cell-ləri rowda yığ
        const cells = [];
        let rowHasContent = false;
        let rowText = "";
        for (let C = range.s.c; C <= range.e.c; C++) {
            const addr = xlsx.utils.encode_cell({ r: R, c: C });
            const cell = sheet[addr];
            if (cell) {
                rowHasContent = true;
                cells.push({
                    addr,
                    col: C,
                    type: cell.t,             // 's' string, 'n' number, 'b' bool, 'd' date, 'e' error
                    raw: cell.v,              // xam saxlanılan dəyər
                    formatted: cell.w,        // formatlı göstərilən mətn
                    numFmt: cell.z || null,   // cell format kodu (məs. "0.000", "#,##0.00")
                });
                rowText += " " + String(cell.v).toLowerCase();
            } else {
                cells.push({ addr, col: C, type: null, raw: null, formatted: null, numFmt: null });
            }
        }
        if (!rowHasContent) continue;

        // Filter
        if (filterTerm && !rowText.includes(filterTerm)) continue;

        console.log(`─── Sətir ${R + 1} ───`);
        for (const c of cells) {
            if (c.raw === null && c.formatted === null) continue;
            const rawStr = c.raw === null ? "—" : `${typeof c.raw === "string" ? `"${c.raw}"` : c.raw} (${typeof c.raw})`;
            const fmtStr = c.formatted === null ? "—" : `"${c.formatted}"`;
            console.log(
                `  ${c.addr.padEnd(4)} [${c.type || "?"}] raw=${rawStr.padEnd(35)} fmt=${fmtStr.padEnd(20)} numFmt=${c.numFmt || "—"}`
            );
        }
        printedRows++;
        if (!filterTerm && printedRows >= 25) {
            console.log(`\n... (yalnız ilk 25 dolğun sətir göstərildi, filtrlə istifadə et: node scratch/debugExcel.js ${path.basename(inputPath)} "axtarış")`);
            break;
        }
    }
    console.log();
}
