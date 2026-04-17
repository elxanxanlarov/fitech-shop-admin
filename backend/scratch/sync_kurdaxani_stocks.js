import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const kurdaxani = await prisma.branch.findFirst({ where: { name: 'Kürdəxanı' } });
    if (!kurdaxani) {
        console.log('Kurdaxani branch not found');
        return;
    }

    const branchId = kurdaxani.id;
    
    // Find branchstock records for Kurdaxani that have 0 stock but the product has stock
    const stocksToFix = await prisma.branchstock.findMany({
        where: {
            branchId,
            stock: 0,
            fullBoxes: 0,
            openedBoxQuantity: 0,
            product: {
                OR: [
                    { stock: { gt: 0 } },
                    { fullBoxes: { gt: 0 } },
                    { openedBoxQuantity: { gt: 0 } }
                ]
            }
        },
        include: { product: true }
    });

    console.log(`Found ${stocksToFix.length} records to fix in Kürdəxanı`);

    for (const record of stocksToFix) {
        await prisma.branchstock.update({
            where: { id: record.id },
            data: {
                stock: record.product.stock,
                fullBoxes: record.product.fullBoxes,
                openedBoxQuantity: record.product.openedBoxQuantity
            }
        });
    }

    console.log('Stock sync completed successfully');
}

main().catch(console.error).finally(() => prisma.$disconnect());
