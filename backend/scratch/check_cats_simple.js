import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const categories = await prisma.category.findMany({
        where: { id: { in: ['a708e4f9-f149-4a24-851b-9311588f8e02', '49d5dea9-fe96-48c2-b2e4-8909415572d0'] } }
    });
    console.log('Categories:', JSON.stringify(categories, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
