import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const productCount = await prisma.product.count();
    const branchStockCount = await prisma.branchstock.count();
    const products = await prisma.product.findMany({
        take: 10,
        select: { id: true, name: true, stock: true }
    });
    const branchStocks = await prisma.branchstock.findMany({
        take: 10,
        include: { branch: true }
    });

    console.log('Total Products:', productCount);
    console.log('Total BranchStocks:', branchStockCount);
    console.log('Sample Products:', JSON.stringify(products, null, 2));
    console.log('Sample BranchStocks:', JSON.stringify(branchStocks, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
