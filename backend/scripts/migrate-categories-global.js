import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Migrating categories to global...');
  const catResult = await prisma.category.updateMany({
    where: { NOT: { branchId: null } },
    data: { branchId: null }
  });
  console.log(`Updated ${catResult.count} categories.`);

  console.log('Migrating subcategories to global...');
  const subCatResult = await prisma.subcategory.updateMany({
    where: { NOT: { branchId: null } },
    data: { branchId: null }
  });
  console.log(`Updated ${subCatResult.count} subcategories.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
