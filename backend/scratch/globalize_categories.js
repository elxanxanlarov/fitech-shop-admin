import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    // 1. Globalize all categories
    const catUpdate = await prisma.category.updateMany({
        where: { branchId: { not: null } },
        data: { branchId: null }
    });
    console.log(`Globalized ${catUpdate.count} categories.`);

    // 2. Globalize all subcategories
    const subCatUpdate = await prisma.subcategory.updateMany({
        where: { branchId: { not: null } },
        data: { branchId: null }
    });
    console.log(`Globalized ${subCatUpdate.count} subcategories.`);

    // 3. (Optional) Cleanup any duplicates created by name
    // Since we just set branchId to null, we might have multiple categories with same name and branchId: null.
    // But for now, let's just make them visible.
}

main().catch(console.error).finally(() => prisma.$disconnect());
