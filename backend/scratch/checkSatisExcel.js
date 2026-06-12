import xlsx from "xlsx";
import path from "path";
import { fileURLToPath } from "url";
import prisma from "../src/lib/prisma.js";

/**
 * Satis.xlsx-i oxuyur, hər row üçün:
 *   - Column B (index 1): Strixkod (barcode)
 *   - Column C (index 2): Miqdar (ədəd)
 * sonra İsmayıllı məhsul cədvəlində barcode-a görə axtarış aparır.
 *
 * Terminal-da:
 *   ✓ Barcode: 2000090000001 | Ədəd: 1 | Məhsul: 30 ML QARIŞIQ
 *   ✗ Barcode: 9999999999999 | Ədəd: 2 | Tapılmadı
 *
 * İşə salınma:
 *   cd backend
 *   node scratch/checkSatisExcel.js
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// backend/scratch/ → ../../  = project root
const EXCEL_PATH = path.resolve(__dirname, "../../Satis.xlsx");

// Number parsing — Avropa formatları (50,000 yaxud 1.170,00) dəstəkləyir
const cleanNumber = (val) => {
    if (val === null || val === undefined || val === "") return 0;
    if (typeof val === "number" && Number.isFinite(val)) return val;
    let s = String(val).trim();
    if (!s) return 0;
    s = s.replace(/[^\d.,\-]/g, "");
    const hasComma = s.includes(",");
    const hasDot = s.includes(".");
    if (hasComma && hasDot) {
        if (s.lastIndexOf(",") > s.lastIndexOf(".")) s = s.replace(/\./g, "").replace(",", ".");
        else s = s.replace(/,/g, "");
    } else if (hasComma) {
        s = s.replace(",", ".");
    }
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : 0;
};

async function main() {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("  Satis.xlsx — Barkod Uyğunluğu Yoxlanması");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    console.log("Fayl:", EXCEL_PATH, "\n");

    const wb = xlsx.readFile(EXCEL_PATH);
    const sheetName = wb.SheetNames[0];
    const sheet = wb.Sheets[sheetName];

    // raw: false → "1,170.00" / "1.170,00" kimi formatlar string olaraq gəlsin
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: false });

    console.log(`Cəmi sətir (header daxil): ${rows.length}\n`);

    let found = 0;
    let missing = 0;
    let skipped = 0;
    const missingList = [];
    const foundList = [];

    // 1-ci sətr header olduğu fərziyyəsi ilə 1-dən başlayaq
    // Lakin əgər birinci sətirdə barcode (B) rəqəmlə başlayırsa, header yoxdur deməkdir → 0-dan
    const firstBarcode = rows[0] && rows[0][1] ? String(rows[0][1]).trim() : "";
    const startIdx = /^\d{6,}$/.test(firstBarcode) ? 0 : 1;

    for (let i = startIdx; i < rows.length; i++) {
        const row = rows[i];
        if (!row) { skipped++; continue; }

        const nameRaw = row[0];
        const barcodeRaw = row[1];
        const qtyRaw = row[2];

        const barcode = barcodeRaw ? String(barcodeRaw).trim() : "";
        const qty = cleanNumber(qtyRaw);

        if (!barcode || !/^\d{6,}$/.test(barcode)) {
            skipped++;
            continue;
        }

        const product = await prisma.ismayilliMagazaProduct.findUnique({
            where: { barcode },
            select: { id: true, name: true, barcode: true, quantity: true, unitPriceSale: true, deleteType: true },
        });

        if (product) {
            found++;
            foundList.push({ barcode, qty, name: product.name, stock: product.quantity, salePrice: product.unitPriceSale, deleted: product.deleteType !== "NONE" });
            console.log(`  ✓ Barcode: ${barcode} | Ədəd: ${qty} | Məhsul: ${product.name}${product.deleteType !== "NONE" ? "  [SİLİNMİŞ]" : ""}`);
        } else {
            missing++;
            const fallbackName = nameRaw ? String(nameRaw).trim() : "—";
            missingList.push({ barcode, qty, excelName: fallbackName });
            console.log(`  ✗ Barcode: ${barcode} | Ədəd: ${qty} | Excel-də ad: "${fallbackName}" | TAPILMADI`);
        }
    }

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`  ✓ Tapıldı:     ${found}`);
    console.log(`  ✗ Tapılmadı:   ${missing}`);
    console.log(`  ─ Skip:        ${skipped}`);
    console.log(`  Σ Cəmi sətir:  ${rows.length - startIdx}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    if (missing > 0) {
        console.log("Tapılmayan barkodlar (ilk 20):");
        missingList.slice(0, 20).forEach((m, i) => {
            console.log(`  ${i + 1}. ${m.barcode}  (×${m.qty})  — "${m.excelName}"`);
        });
        if (missingList.length > 20) console.log(`  ... və daha ${missingList.length - 20}`);
        console.log("");
    }

    if (found > 0) {
        // Cəmi ədəd və cəmi məbləğ hesabla
        const totalQty = foundList.reduce((s, x) => s + (parseFloat(x.qty) || 0), 0);
        const totalAmount = foundList.reduce((s, x) => s + (parseFloat(x.qty) || 0) * (parseFloat(x.salePrice) || 0), 0);
        console.log("─ Tapılan məhsulların yekunu:");
        console.log(`  Ümumi ədəd:   ${totalQty}`);
        console.log(`  Ümumi məbləğ: ${totalAmount.toFixed(2)} AZN  (satış qiymətinə görə)\n`);
    }
}

main()
    .catch((e) => {
        console.error("Skript xəta ilə bitdi:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
