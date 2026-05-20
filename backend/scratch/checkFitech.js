import prisma from "../src/lib/prisma.js";

async function main() {
  try {
    const totalCount = await prisma.product.count();
    console.log("Total Fitech products in DB:", totalCount);

    const first5 = await prisma.product.findMany({
      take: 5,
      select: { id: true, name: true, barcode: true, quantity: true, unitPrice: true }
    });
    console.log("First 5 Fitech products:", first5);
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
