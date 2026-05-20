import prisma from "../src/lib/prisma.js";

async function main() {
  try {
    const products = await prisma.ismayilliMagazaProduct.findMany({
      include: { category: true }
    });

    console.log("Total active products:", products.length);

    const anomalousQty = products.filter(p => p.quantity > 5000);
    console.log("Products with Qty > 5000:", anomalousQty.length);
    if (anomalousQty.length > 0) {
      console.log("Sample Qty > 5000:", anomalousQty.slice(0, 5).map(p => ({ name: p.name, quantity: p.quantity })));
    }

    const anomalousPrice = products.filter(p => p.unitPricePurchase > 1000 || p.unitPriceSale > 1000);
    console.log("Products with unit price > 1000:", anomalousPrice.length);
    if (anomalousPrice.length > 0) {
      console.log("Sample Price > 1000:", anomalousPrice.slice(0, 5).map(p => ({ name: p.name, purchase: p.unitPricePurchase, sale: p.unitPriceSale })));
    }

    const totalCalculatedPurchase = products.reduce((acc, p) => acc + (p.quantity * p.unitPricePurchase), 0);
    const totalDBCalculatedPurchase = products.reduce((acc, p) => acc + p.totalPurchasePrice, 0);
    console.log("Total Calculated Purchase:", totalCalculatedPurchase);
    console.log("Total DB Calculated Purchase:", totalDBCalculatedPurchase);

    // Let's find specific KƏTAN products
    const ketan = products.filter(p => p.name.includes("KƏTAN") || p.name.includes("KETAN"));
    console.log("KƏTAN products count:", ketan.length);
    console.log("KƏTAN samples:", ketan.slice(0, 5).map(p => ({ name: p.name, qty: p.quantity, purchase: p.unitPricePurchase, sale: p.unitPriceSale })));

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
