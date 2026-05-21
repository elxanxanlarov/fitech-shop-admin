/**
 * fixExcelIds.js
 *
 * Mövcud İsmayıllı məhsullarının excelId sahəsini Excel faylından oxuyub,
 * DB-də barkod üzrə tapıb, yazır.
 *
 * İstifadə:
 *   node scratch/fixExcelIds.js "../638 eded 3 kateqoriya.xlsx"
 */
import xlsx from "xlsx";
import prisma from "../src/lib/prisma.js";
import path from "path";

const filePath = process.argv[2] || path.resolve("../638 eded 3 kateqoriya.xlsx");
console.log("Oxunur:", filePath);

const wb = xlsx.readFile(filePath, { cellNF: true });
const ws = wb.Sheets["Лист1"];
const range = xlsx.utils.decode_range(ws["!ref"]);

// Bütün sətirləri raw=true ilə oxu (rəqəmlər number kimi gəlir)
const rows = xlsx.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true });

let updated = 0;
let notFound = 0;

// Global sıra sayğacı (Excel-də hər məhsulun mütləq sırası)
let globalSeq = 0;

for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every(c => c === null || c === undefined || c === '')) continue;

    // Barkod sütunu D (index 3)
    const barcodeRaw = row[3];
    if (!barcodeRaw) continue;
    const barcode = String(barcodeRaw).trim();
    if (!barcode || barcode.toLowerCase().includes('ştrixkod') || barcode.toLowerCase().includes('barcode')) continue;

    // Ad sütunu B (index 1)
    const nameRaw = row[1];
    if (!nameRaw || typeof nameRaw !== 'string') continue;
    const name = nameRaw.trim();
    if (!name) continue;

    // № sütunu A (index 0)
    const noRaw = row[0];
    const rowNo = typeof noRaw === 'number' ? noRaw : (noRaw ? parseInt(String(noRaw)) : null);

    // Kateqoriya başlıq sətirini atla (barkod yoxdur)
    if (!barcode || barcode === '') continue;

    globalSeq++;

    // DB-də barkoda görə tap
    const existing = await prisma.ismayilliMagazaProduct.findUnique({ where: { barcode } });
    if (!existing) {
        console.log(`❌ Tapılmadı: ${name} (barcode: ${barcode})`);
        notFound++;
        continue;
    }

    await prisma.ismayilliMagazaProduct.update({
        where: { id: existing.id },
        data: { excelId: rowNo ?? globalSeq }
    });
    updated++;
}

console.log(`\n✅ Tamamlandı: ${updated} yeniləndi, ${notFound} tapılmadı`);
await prisma.$disconnect();
