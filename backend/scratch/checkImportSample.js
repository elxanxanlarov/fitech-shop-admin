/**
 * Excel import-dan sonra konkret məhsulları yoxlamaq üçün debug script.
 * Bir neçə nümunə məhsulu (Excel-də şəkildə görünən) DB-də tapıb dəyərlərini çap edir.
 */

import prisma from "../src/lib/prisma.js";

const SAMPLES = [
    { barcode: "2000005000003", expected: { name: "KƏTAN SADƏ 01", qty: 50, p: 14, s: 18.2 } },
    { barcode: "2000006000002", expected: { name: "KƏTAN LORA",    qty: 35, p: 15, s: 19.5 } },
    { barcode: "2000010000005", expected: { name: "TIGER AYAQQABI", qty: 29, p: 25, s: 32.9 } },
    { barcode: "2000012000003", expected: { name: "TIGER AYAQQABI 3", qty: 108, p: 24, s: 31 } },
    { barcode: "2000585000004", expected: { name: "QUTU GÜL", qty: 50, p: 14, s: 18.2, note: "XIRDAVAT — frontend-də 5 ədəd görünür" } },
    { barcode: "2000584000005", expected: { name: "QUTU SANDIQ 6", qty: null, p: null, s: null, note: "XIRDAVAT" } },
];

async function main() {
    console.log("─────────────────────────────────────────────────────────────");
    console.log("Excel import doğruluq yoxlaması");
    console.log("─────────────────────────────────────────────────────────────");

    const total = await prisma.ismayilliMagazaProduct.count();
    console.log(`Cəmi məhsul: ${total}\n`);

    for (const sample of SAMPLES) {
        const p = await prisma.ismayilliMagazaProduct.findUnique({
            where: { barcode: sample.barcode },
            include: { category: true },
        });

        console.log(`\n── ${sample.expected.name} (${sample.barcode}) ──`);
        if (!p) {
            console.log("  ❌ Tapılmadı");
            continue;
        }
        const row = {
            name: p.name,
            category: p.category?.name,
            quantity: p.quantity,
            unitPricePurchase: p.unitPricePurchase,
            unitPriceSale: p.unitPriceSale,
            totalPurchasePrice: p.totalPurchasePrice,
            totalSalePrice: p.totalSalePrice,
        };
        console.log(`  Excel-də gözlənilən: qty=${sample.expected.qty}, alış=${sample.expected.p}, satış=${sample.expected.s}`);
        console.log(`  DB-də olan:`);
        console.table([row]);

        // Avtomatik fərq yoxlaması
        if (sample.expected.qty != null) {
            const qtyOk = Math.abs(row.quantity - sample.expected.qty) < 0.01;
            const pOk = Math.abs(row.unitPricePurchase - sample.expected.p) < 0.01;
            const sOk = Math.abs(row.unitPriceSale - sample.expected.s) < 0.01;
            const totalPOk = Math.abs(row.totalPurchasePrice - sample.expected.qty * sample.expected.p) < 0.5;
            const totalSOk = Math.abs(row.totalSalePrice - sample.expected.qty * sample.expected.s) < 0.5;
            console.log(
                `  Yoxlama: qty=${qtyOk ? "✓" : "✗"}  alış=${pOk ? "✓" : "✗"}  satış=${sOk ? "✓" : "✗"}  tAlış=${totalPOk ? "✓" : "✗"}  tSatış=${totalSOk ? "✓" : "✗"}`
            );
        }
        if (sample.expected.note) {
            console.log(`  Qeyd: ${sample.expected.note}`);
        }
    }

    console.log("\n─────────────────────────────────────────────────────────────");
}

main()
    .catch((e) => {
        console.error("Xəta:", e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
