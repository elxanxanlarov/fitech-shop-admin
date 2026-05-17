import prisma from "../src/lib/prisma.js";

async function main() {
  try {
    const result = await prisma.ismayilliMagazaProduct.updateMany({
      where: { deleteType: 'SOFT' },
      data: { deleteType: 'NONE' }
    });
    console.log(`Successfully restored ${result.count} products from 'SOFT' to 'NONE' deleteType!`);
  } catch (err) {
    console.error("Error restoring products:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
