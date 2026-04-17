import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const astara = await prisma.branch.findFirst({ where: { name: 'Astara' } });
    if (!astara) { console.log('Astara not found'); return; }
    
    console.log('Astara ID:', astara.id);

    // Check products that have stock > 0 in Astara
    const astaraStocks = await prisma.branchstock.findMany({
        where: { branchId: astara.id, stock: { gt: 0 } },
        include: { product: { select: { name: true, stock: true } } }
    });
    console.log(`Astara products with stock > 0: ${astaraStocks.length}`);
    for (const s of astaraStocks) {
        console.log(`  - ${s.product.name}: branchStock=${s.stock}, central=${s.product.stock}`);
    }

    // What does the API query actually produce?
    const allAstaraStocks = await prisma.branchstock.count({ where: { branchId: astara.id } });
    console.log(`Total branchstock records for Astara: ${allAstaraStocks}`);

    // Check the "some" filter that the API uses
    const productsViaApiFilter = await prisma.product.findMany({
        where: {
            deleteType: 'NONE',
            branchStocks: { some: { branchId: astara.id, stock: { gte: 0 } } }
        },
        select: { id: true, name: true, branchStocks: { where: { branchId: astara.id } } }
    });
    console.log(`Products visible via API: ${productsViaApiFilter.length}`);
    for (const p of productsViaApiFilter.slice(0, 5)) {
        console.log(`  - ${p.name}: stock=${p.branchStocks[0]?.stock}`);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
