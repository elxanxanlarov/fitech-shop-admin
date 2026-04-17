import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const lastTransfer = await prisma.stocktransfer.findFirst({
        where: { status: 'COMPLETED' },
        orderBy: { updatedAt: 'desc' },
        include: { 
            toBranch: true, 
            items: { 
                include: { product: true } 
            } 
        }
    });

    if (!lastTransfer) {
        console.log('No completed transfers found');
        return;
    }

    console.log('Last Completed Transfer:', JSON.stringify(lastTransfer, null, 2));

    // Check if the items in this transfer have branchStock records in the target branch
    for (const item of lastTransfer.items) {
        const bs = await prisma.branchstock.findFirst({
            where: { branchId: lastTransfer.toBranchId, productId: item.productId }
        });
        console.log(`BranchStock for product ${item.product.name} (ID: ${item.productId}) in branch ${lastTransfer.toBranch.name}:`, JSON.stringify(bs, null, 2));
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
