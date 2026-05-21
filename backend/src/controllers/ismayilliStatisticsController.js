import prisma from "../lib/prisma.js";

/**
 * GET /ismayilli/statistics/activities
 * Date-filtered, paginated son əməliyyatlar (satışlar + qaytarmalar).
 */
export const getRecentActivities = async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      type,    // 'SALE' | 'RETURN' | undefined (hamısı)
      page = 1,
      limit = 20,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const skip = (pageNum - 1) * limitNum;

    const dateFilter = {};
    if (startDate) dateFilter.gte = new Date(startDate + 'T00:00:00.000Z');
    if (endDate)   dateFilter.lte = new Date(endDate   + 'T23:59:59.999Z');

    const salesWhere = Object.keys(dateFilter).length ? { createdAt: dateFilter } : {};
    const returnsWhere = Object.keys(dateFilter).length ? { createdAt: dateFilter } : {};

    const includeSales   = !type || type === 'SALE';
    const includeReturns = !type || type === 'RETURN';

    const [sales, returns] = await Promise.all([
      includeSales ? prisma.ismayilliSale.findMany({
        where: salesWhere,
        orderBy: { createdAt: 'desc' },
        include: {
          items: {
            take: 3,
            include: { product: { select: { name: true } } },
          },
          returns: { select: { returnedAmount: true } },
        },
      }) : [],
      includeReturns ? prisma.ismayilliSaleReturn.findMany({
        where: returnsWhere,
        orderBy: { createdAt: 'desc' },
        include: {
          sale: { select: { checkNumber: true, totalAmount: true } },
          items: {
            take: 3,
            include: { product: { select: { name: true } } },
          },
        },
      }) : [],
    ]);

    const activities = [
      ...sales.map((s) => {
        const returnedTotal = s.returns?.reduce((sum, r) => sum + parseFloat(r.returnedAmount || 0), 0) || 0;
        return {
          type: 'SALE',
          id: s.id,
          checkNumber: s.checkNumber,
          amount: parseFloat(s.totalAmount || 0),
          paidAmount: parseFloat(s.paidAmount || 0),
          returnedAmount: returnedTotal,
          itemsCount: s.items?.length || 0,
          items: s.items?.map(i => i.product?.name).filter(Boolean) || [],
          createdAt: s.createdAt,
          isRefunded: s.isRefunded,
        };
      }),
      ...returns.map((r) => ({
        type: 'RETURN',
        id: r.id,
        checkNumber: r.sale?.checkNumber ?? null,
        amount: parseFloat(r.returnedAmount || 0),
        originalAmount: parseFloat(r.sale?.totalAmount || 0),
        itemsCount: r.items?.length || 0,
        items: r.items?.map(i => i.product?.name).filter(Boolean) || [],
        createdAt: r.createdAt,
        reason: r.reason || null,
      })),
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const total = activities.length;
    const paginated = activities.slice(skip, skip + limitNum);

    return res.status(200).json({
      success: true,
      data: paginated,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
      summary: {
        totalSales: sales.length,
        totalReturns: returns.length,
        salesAmount: sales.reduce((s, x) => s + parseFloat(x.totalAmount || 0), 0),
        returnsAmount: returns.reduce((s, x) => s + parseFloat(x.returnedAmount || 0), 0),
      },
    });
  } catch (error) {
    console.error('getRecentActivities error', error);
    return res.status(500).json({ success: false, message: 'Son əməliyyatlar alınarkən xəta baş verdi' });
  }
};

export const getIsmayilliStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Date filter for sale-based queries (UTC+4 timezone offset compensated)
    const saleDateFilter = {};
    if (startDate) saleDateFilter.gte = new Date(startDate + 'T00:00:00+04:00');
    if (endDate)   saleDateFilter.lte = new Date(endDate   + 'T23:59:59+04:00');
    const hasSaleDateFilter = Object.keys(saleDateFilter).length > 0;
    const saleWhere = hasSaleDateFilter ? { createdAt: saleDateFilter } : {};

    // Yalnız aktiv (silinməmiş) məhsullara baxırıq.
    const activeProductFilter = { deleteType: "NONE" };

    // 1. Ümumi məhsul və kateqoriya sayı (yalnız aktiv məhsullar — tarix filtrindən asılı deyil)
    const totalProductsCount = await prisma.ismayilliMagazaProduct.count({
      where: activeProductFilter,
    });
    const totalCategoriesCount = await prisma.ismayilliShopCategory.count();

    // 2. Anbardakı ümumi dəyər (Alış və Satış qiymətinə görə) — aktiv stoklar (cari, tarixsiz)
    const products = await prisma.ismayilliMagazaProduct.findMany({
      where: activeProductFilter,
    });
    let totalStockQuantity = 0;
    let totalStockPurchaseValue = 0;
    let totalStockSaleValue = 0;
    let inStockProductsCount = 0;

    products.forEach((p) => {
      const qty = parseFloat(p.quantity || 0);
      totalStockQuantity += qty;
      totalStockPurchaseValue += parseFloat(p.totalPurchasePrice || 0);
      totalStockSaleValue += parseFloat(p.totalSalePrice || 0);
      if (qty > 0) inStockProductsCount += 1;
    });

    // 3. Ümumi Satış Məbləği, Maya Dəyəri və Gəlir (Profit) — tarix filtri tətbiq olunur
    const sales = await prisma.ismayilliSale.findMany({
      where: saleWhere,
      include: { items: true }
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

    // 4. Kateqoriya üzrə satışlar — tarix filtri tətbiq olunur
    const categories = await prisma.ismayilliShopCategory.findMany({
      include: {
        products: {
          where: activeProductFilter,
          include: {
            saleItems: {
              where: hasSaleDateFilter ? {
                sale: { createdAt: saleDateFilter }
              } : undefined,
            }
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

    // 5. Günlük Satış Trendi — tarix filtri varsa onu, yoxdursa son 30 günü göstər
    const trendWhere = hasSaleDateFilter ? { createdAt: saleDateFilter } : (() => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return { createdAt: { gte: thirtyDaysAgo } };
    })();

    const recentSales = await prisma.ismayilliSale.findMany({
      where: trendWhere,
      orderBy: { createdAt: "asc" }
    });

    const dailyTrendMap = {};
    recentSales.forEach((s) => {
      // Local date (UTC+4)
      const d = new Date(new Date(s.createdAt).getTime() + 4 * 60 * 60 * 1000);
      const dateStr = d.toISOString().split("T")[0];
      if (!dailyTrendMap[dateStr]) dailyTrendMap[dateStr] = 0;
      dailyTrendMap[dateStr] += parseFloat(s.totalAmount || 0);
    });

    const dailyTrend = Object.keys(dailyTrendMap).map((date) => ({
      date,
      amount: dailyTrendMap[date]
    }));

    // 6. Son Əməliyyatlar — tarix filtri tətbiq olunur
    const [latestSales, latestReturns] = await Promise.all([
      prisma.ismayilliSale.findMany({
        where: saleWhere,
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          items: {
            include: { product: { select: { name: true } } },
          },
        },
      }),
      prisma.ismayilliSaleReturn.findMany({
        where: hasSaleDateFilter ? { createdAt: saleDateFilter } : {},
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          sale: { select: { checkNumber: true } },
          items: {
            include: { product: { select: { name: true } } },
          },
        },
      }),
    ]);

    const recentActivities = [
      ...latestSales.map((s) => ({
        type: "SALE",
        id: s.id,
        checkNumber: s.checkNumber,
        amount: parseFloat(s.totalAmount || 0),
        itemsCount: s.items?.length || 0,
        firstItemName: s.items?.[0]?.product?.name || null,
        createdAt: s.createdAt,
        isRefunded: s.isRefunded,
      })),
      ...latestReturns.map((r) => ({
        type: "RETURN",
        id: r.id,
        checkNumber: r.sale?.checkNumber || null,
        amount: parseFloat(r.returnedAmount || 0),
        itemsCount: r.items?.length || 0,
        firstItemName: r.items?.[0]?.product?.name || null,
        createdAt: r.createdAt,
      })),
    ]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 15);

    return res.status(200).json({
      success: true,
      data: {
        totalProductsCount,         // cəmi aktiv məhsul (çeşid) sayı
        inStockProductsCount,       // quantity > 0 olan aktiv məhsul (çeşid) sayı
        totalCategoriesCount,
        totalStockQuantity,         // cəm miqdar (kg/ədəd/litr qarışıq)
        totalStockPurchaseValue,
        totalStockSaleValue,
        totalRevenue,
        totalCostOfGoodsSold,
        totalProfit,
        categoryStats,
        dailyTrend,
        recentActivities,
      }
    });
  } catch (error) {
    console.error("getIsmayilliStats error", error);
    return res.status(500).json({ success: false, message: "Statistikalar alınarkən xəta baş verdi" });
  }
};
