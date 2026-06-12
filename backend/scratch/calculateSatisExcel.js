/**
 * Satis.xlsx faylının cəm satış dəyərini bir neçə üsulla hesablayır.
 * Məqsəd: 1C-dəki (30 564.20) və sistemdəki (28 939.80) fərqi anlamaq.
 */
import xlsx from "xlsx";
import path from "path";
import { fileURLToPath } from "url";
import { PrismaClient } from "@prisma/client";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FILE = path.join(__dirname, "..", "..", "Satis.xlsx");
const prisma = new PrismaClient();

const cleanNumber = (val) => {
  if (val === null || val === undefined || val === "") return 0;
  if (typeof val === "number" && Number.isFinite(val)) return val;
  let s = String(val).trim().replace(/[^\d.,\-]/g, "");
  if (!s) return 0;
  const hasComma = s.includes(",");
  const hasDot = s.includes(".");
  if (hasComma && hasDot) {
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) s = s.replace(/\./g, "").replace(",", ".");
    else s = s.replace(/,/g, "");
  } else if (hasComma) s = s.replace(",", ".");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
};

async function main() {
  const wb = xlsx.readFile(FILE);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: false });

  console.log(`Total rows: ${rows.length}\n`);

  // Sütun bașlıqlarını yoxla — header sətri varmı?
  console.log("İlk 3 sətir (header detection üçün):");
  for (let i = 0; i < 3; i++) console.log(`  [${i}]`, rows[i]);
  console.log();

  // İlk sətr header-dir mi? Heuristik: B sütununda rəqəmsal barkod yoxdursa header
  const firstB = rows[0]?.[1] ? String(rows[0][1]).trim() : "";
  const startIdx = /^\d{6,}$/.test(firstB) ? 0 : 1;
  console.log(`Header detection: startIdx = ${startIdx} (firstB="${firstB}")\n`);

  // ========== ÜSUL 1: Excel sütunlarını birbaşa cəmlə ==========
  // Format: A=ad, B=barkod, C=miqdar, D-H = qiymət sütunları
  const colSums = [0, 0, 0, 0, 0, 0, 0, 0];
  let nonEmptyCount = 0, emptyCCount = 0, negCCount = 0;

  for (let i = startIdx; i < rows.length; i++) {
    const r = rows[i];
    if (!r) continue;
    if (!r[0] && !r[1]) continue;

    const rawC = r[2];
    const cNum = cleanNumber(rawC);
    if (rawC === null || rawC === undefined || String(rawC).trim() === '') emptyCCount++;
    else if (cNum < 0) negCCount++;
    else if (cNum > 0) nonEmptyCount++;

    for (let j = 2; j < Math.min(8, r.length); j++) {
      colSums[j] += cleanNumber(r[j]);
    }
  }

  console.log("=== ÜSUL 1: Excel sütun cəmləri ===");
  console.log(`Boş C (qaytarma kimi): ${emptyCCount}`);
  console.log(`Mənfi C: ${negCCount}`);
  console.log(`Adi satış sətirləri: ${nonEmptyCount}`);
  console.log(`Cəm Miqdar (C): ${colSums[2].toFixed(2)}`);
  console.log(`Cəm D sütunu  : ${colSums[3].toFixed(2)}`);
  console.log(`Cəm E sütunu  : ${colSums[4].toFixed(2)}`);
  console.log(`Cəm F sütunu  : ${colSums[5].toFixed(2)}`);
  console.log(`Cəm G sütunu  : ${colSums[6].toFixed(2)}`);
  console.log(`Cəm H sütunu  : ${colSums[7].toFixed(2)}`);
  console.log();

  // ========== ÜSUL 2: DB vahid qiymətlərlə hesabla ==========
  console.log("=== ÜSUL 2: DB vahid satış qiymətlərinə görə ===");

  const allBarcodes = new Set();
  for (let i = startIdx; i < rows.length; i++) {
    const r = rows[i];
    if (!r || !r[1]) continue;
    const bc = String(r[1]).trim();
    if (/^\d{6,}$/.test(bc)) allBarcodes.add(bc);
  }
  console.log(`Unikal barkod: ${allBarcodes.size}`);

  // DB-dən bütün məhsulları çək
  const products = await prisma.ismayilliMagazaProduct.findMany({
    where: { barcode: { in: Array.from(allBarcodes) } },
    select: { id: true, name: true, barcode: true, unitPriceSale: true, unitPricePurchase: true, quantity: true },
  });
  const byBarcode = new Map(products.map(p => [p.barcode, p]));
  console.log(`DB-də tapılan məhsul: ${byBarcode.size}/${allBarcodes.size}`);

  let dbTotalSale = 0, dbTotalQty = 0, foundCount = 0, notFoundCount = 0;
  let dbReturnSale = 0, dbReturnQty = 0;
  const notFoundList = [];

  for (let i = startIdx; i < rows.length; i++) {
    const r = rows[i];
    if (!r) continue;
    const excelName = r[0] ? String(r[0]).trim() : "";
    const barcode = r[1] ? String(r[1]).trim() : "";
    if (!barcode) continue;

    const rawC = r[2];
    const isCEmpty = rawC === null || rawC === undefined || String(rawC).trim() === '';
    const qtyRaw = cleanNumber(rawC);
    const isReturn = isCEmpty || qtyRaw <= 0;
    const qty = isReturn ? (isCEmpty ? 1 : Math.abs(qtyRaw)) : qtyRaw;

    const p = byBarcode.get(barcode);
    if (!p) {
      notFoundCount++;
      notFoundList.push({ row: i + 1, excelName, barcode });
      continue;
    }
    foundCount++;
    const total = qty * parseFloat(p.unitPriceSale);
    if (isReturn) {
      dbReturnSale += total;
      dbReturnQty += qty;
    } else {
      dbTotalSale += total;
      dbTotalQty += qty;
    }
  }

  console.log(`Tapılan: ${foundCount}, Tapılmadı: ${notFoundCount}`);
  console.log(`\n  SATIŞ (DB vahid satış qiyməti ilə):`);
  console.log(`    Toplam ədəd : ${dbTotalQty}`);
  console.log(`    Toplam məbləğ: ${dbTotalSale.toFixed(2)} AZN`);
  console.log(`\n  QAYTARMA (boş/mənfi sətirlər, DB qiyməti ilə):`);
  console.log(`    Toplam ədəd : ${dbReturnQty}`);
  console.log(`    Toplam məbləğ: ${dbReturnSale.toFixed(2)} AZN`);
  console.log(`\n  Net (satış - qaytarma): ${(dbTotalSale - dbReturnSale).toFixed(2)} AZN`);

  if (notFoundList.length > 0) {
    console.log(`\n  ⚠️ Tapılmayan barkodlar (${notFoundList.length}):`);
    notFoundList.slice(0, 10).forEach(n => console.log(`    Row ${n.row}: ${n.barcode} (${n.excelName})`));
    if (notFoundList.length > 10) console.log(`    ... və ${notFoundList.length - 10} daha`);
  }

  // ========== ÜSUL 3: Excel-dəki E sütunundan (yəqin "Cəmi məbləğ") ==========
  // E sütunu Satis.xlsx-də çoxlu hallarda Cəm məbləğdir
  console.log("\n=== ÜSUL 3: Excel E sütunu (Cəmi məbləğ) ilə ===");
  let excelTotalSale = 0, excelReturnSale = 0;
  for (let i = startIdx; i < rows.length; i++) {
    const r = rows[i];
    if (!r) continue;
    const rawC = r[2];
    const isCEmpty = rawC === null || rawC === undefined || String(rawC).trim() === '';
    const qtyRaw = cleanNumber(rawC);
    const isReturn = isCEmpty || qtyRaw <= 0;
    const eVal = cleanNumber(r[4]);
    if (isReturn) excelReturnSale += eVal;
    else excelTotalSale += eVal;
  }
  console.log(`  Excel E satış cəmi: ${excelTotalSale.toFixed(2)}`);
  console.log(`  Excel E qaytarma cəmi: ${excelReturnSale.toFixed(2)}`);
  console.log(`  Net: ${(excelTotalSale - excelReturnSale).toFixed(2)}`);

  console.log("\n=== Hədəf rəqəmlər ===");
  console.log("  Sistem cari: 28 939.80 AZN");
  console.log("  1C-dəki    : 30 564.20 AZN");
  console.log("  Fərq       : 1 624.40 AZN");

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
