/**
 * wipeIsmayilliData.js
 *
 * İsmayıllı mağaza ilə əlaqəli BÜTÜN məlumatları (məhsullar, satışlar,
 * qaytarmalar, stok hərəkətləri) silən tək-istifadəlik script.
 *
 * İstifadə:
 *   node backend/scratch/wipeIsmayilliData.js
 *
 * Qeyd:
 *  - Kateqoriyalar (ismayilliShopCategory) silinmir. Lazımdırsa,
 *    --with-categories flag-i ilə işə sal.
 *  - Bu əməliyyatı geri qaytarmaq mümkün deyil. Əvvəl DB-ni yedəklə!
 */

import prisma from "../src/lib/prisma.js";

const withCategories = process.argv.includes("--with-categories");

async function main() {
    console.log("──────────────────────────────────────────────");
    console.log("İsmayıllı məlumatları silinir...");
    console.log("──────────────────────────────────────────────");

    const before = {
        products: await prisma.ismayilliMagazaProduct.count(),
        movements: await prisma.ismayilliStockMovement.count(),
        sales: await prisma.ismayilliSale.count(),
        saleItems: await prisma.ismayilliSaleItem.count(),
        returns: await prisma.ismayilliSaleReturn.count(),
        returnItems: await prisma.ismayilliSaleReturnItem.count(),
        categories: await prisma.ismayilliShopCategory.count(),
    };

    console.log("Əvvəlki vəziyyət:");
    console.table(before);

    // Sıralı silmə: əvvəl asılı table-ları sil, sonra valideynlər
    // (Cascade olmasına baxmayaraq, açıq sıra daha təhlükəsizdir.)
    console.log("\n→ ismayilliSaleReturnItem silinir...");
    const r1 = await prisma.ismayilliSaleReturnItem.deleteMany();
    console.log(`  silindi: ${r1.count}`);

    console.log("→ ismayilliSaleReturn silinir...");
    const r2 = await prisma.ismayilliSaleReturn.deleteMany();
    console.log(`  silindi: ${r2.count}`);

    console.log("→ ismayilliSaleItem silinir...");
    const r3 = await prisma.ismayilliSaleItem.deleteMany();
    console.log(`  silindi: ${r3.count}`);

    console.log("→ ismayilliSale silinir...");
    const r4 = await prisma.ismayilliSale.deleteMany();
    console.log(`  silindi: ${r4.count}`);

    console.log("→ ismayilliStockMovement silinir...");
    const r5 = await prisma.ismayilliStockMovement.deleteMany();
    console.log(`  silindi: ${r5.count}`);

    console.log("→ ismayilliMagazaProduct silinir...");
    const r6 = await prisma.ismayilliMagazaProduct.deleteMany();
    console.log(`  silindi: ${r6.count}`);

    if (withCategories) {
        console.log("→ ismayilliShopCategory silinir...");
        const r7 = await prisma.ismayilliShopCategory.deleteMany();
        console.log(`  silindi: ${r7.count}`);
    } else {
        console.log("→ Kateqoriyalar saxlanılır (--with-categories flag-i istifadə olunmadı)");
    }

    const after = {
        products: await prisma.ismayilliMagazaProduct.count(),
        movements: await prisma.ismayilliStockMovement.count(),
        sales: await prisma.ismayilliSale.count(),
        saleItems: await prisma.ismayilliSaleItem.count(),
        returns: await prisma.ismayilliSaleReturn.count(),
        returnItems: await prisma.ismayilliSaleReturnItem.count(),
        categories: await prisma.ismayilliShopCategory.count(),
    };

    console.log("\nSonrakı vəziyyət:");
    console.table(after);

    console.log("\n✅ Tamamlandı. İndi Excel-i yenidən import edə bilərsən.");
}

main()
    .catch((e) => {
        console.error("❌ Xəta:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
