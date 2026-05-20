import prisma from "../src/lib/prisma.js";

async function main() {
  try {
    const barcodes = ['2000005000003', '2000006000002', '2000007000001'];
    for (const barcode of barcodes) {
      const prod = await prisma.ismayilliMagazaProduct.findUnique({
        where: { barcode },
        include: { category: true }
      });
      console.log(`Barcode ${barcode}:`, prod);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
