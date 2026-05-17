import prisma from "../src/lib/prisma.js";

async function main() {
  try {
    const totalCount = await prisma.ismayilliMagazaProduct.count();
    console.log("Total products in DB:", totalCount);

    const deleteTypeCounts = await prisma.ismayilliMagazaProduct.groupBy({
      by: ['deleteType'],
      _count: true
    });
    console.log("Delete type counts:", deleteTypeCounts);

    const first5 = await prisma.ismayilliMagazaProduct.findMany({
      take: 5,
      include: { category: true }
    });
    console.log("First 5 products in DB:", JSON.stringify(first5, null, 2));

  } catch (err) {
    console.error("Error checking products:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
