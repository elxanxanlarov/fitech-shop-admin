import prisma from "../lib/prisma.js";

export const getIsmayilliStats = async (req, res) => {
  try {
    // 1. Ümumi məhsul və kateqoriya sayı
    const totalProductsCount = await prisma.ismayilliMagazaProduct.count();
    const totalCategoriesCount = await prisma.ismayilliShopCategory.count();

    // 2. Anbardakı ümumi dəyər (Alış və Satış qiymətinə görə)
    const products = await prisma.ismayilliMagazaProduct.findMany();
    let totalStockQuantity = 0;
    let totalStockPurchaseValue = 0;
    let totalStockSaleValue = 0;

    products.forEach((p) => {
      totalStockQuantity += parseFloat(p.quantity || 0);
      totalStockPurchaseValue += parseFloat(p.totalPurchasePrice || 0);
      totalStockSaleValue += parseFloat(p.totalSalePrice || 0);
    });

    // 3. Ümumi Satış Məbləği, Maya Dəyəri və Gəlir (Profit)
    const sales = await prisma.ismayilliSale.findMany({
      include: {
        items: true
      }
    });

    let totalRevenue = 0;
    let totalCostOfGoodsSold = 0;
    let totalProfit = 0;

    sales.forEach((s) => {
      totalRevenue += parseFloat(s.totalAmount || 0);
      s.items.forEach((item) => {
        totalCostOfGoodsSold += parseFloat(item.quantity) * parseFloat(item.purchasePrice);
      });
    });

    totalProfit = totalRevenue - totalCostOfGoodsSold;

    // 4. Kateqoriya üzrə satışlar və maya dəyərləri
    const categories = await prisma.ismayilliShopCategory.findMany({
      include: {
        products: {
          include: {
            saleItems: true
          }
        }
      }
    });

    const categoryStats = categories.map((cat) => {
      let catRevenue = 0;
      let catCost = 0;
      let catStockValue = 0;

      cat.products.forEach((prod) => {
        catStockValue += parseFloat(prod.totalSalePrice || 0);
        prod.saleItems.forEach((si) => {
          catRevenue += parseFloat(si.totalPrice || 0);
          catCost += parseFloat(si.quantity) * parseFloat(si.purchasePrice);
        });
      });

      return {
        id: cat.id,
        name: cat.name,
        revenue: catRevenue,
        profit: catRevenue - catCost,
        stockValue: catStockValue,
        productCount: cat.products.length
      };
    });

    // 5. Günlük Satış Trendi (Son 30 gün)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentSales = await prisma.ismayilliSale.findMany({
      where: {
        createdAt: {
          gte: thirtyDaysAgo
        }
      },
      orderBy: { createdAt: "asc" }
    });

    const dailyTrendMap = {};
    recentSales.forEach((s) => {
      const dateStr = s.createdAt.toISOString().split("T")[0];
      if (!dailyTrendMap[dateStr]) {
        dailyTrendMap[dateStr] = 0;
      }
      dailyTrendMap[dateStr] += parseFloat(s.totalAmount || 0);
    });

    const dailyTrend = Object.keys(dailyTrendMap).map((date) => ({
      date,
      amount: dailyTrendMap[date]
    }));

    return res.status(200).json({
      success: true,
      data: {
        totalProductsCount,
        totalCategoriesCount,
        totalStockQuantity,
        totalStockPurchaseValue,
        totalStockSaleValue,
        totalRevenue,
        totalCostOfGoodsSold,
        totalProfit,
        categoryStats,
        dailyTrend
      }
    });
  } catch (error) {
    console.error("getIsmayilliStats error", error);
    return res.status(500).json({ success: false, message: "Statistikalar alınarkən xəta baş verdi" });
  }
};
