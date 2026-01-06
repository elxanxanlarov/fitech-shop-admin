import prisma from "../lib/prisma.js";
import { createActivityLog } from "./activityLogController.js";

// Köməkçi: tarix üçün günün başlanğıcı və sonu
const getDayRange = (dateStr) => {
  const d = new Date(dateStr);
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  const end = new Date(d);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

// Daxili helper: verilən tarix üçün gündəlik yekunu hesabla və DB-də create/update et
export const generateDailySummaryForDate = async ({ date, note, staffId = null }) => {
  const { start, end } = getDayRange(date);

  // Həmin günə aid bütün satışları gətir
  const sales = await prisma.sale.findMany({
    where: {
      createdAt: {
        gte: start,
        lte: end,
      },
      deleteType: "NONE",
      isRefunded: false,
    },
    include: {
      items: true,
    },
  });

  const hasSales = sales && sales.length > 0;

  let totalSalesCount = 0;
  let totalProducts = 0;
  let totalQuantity = 0;
  let totalPurchase = 0;
  let totalProfit = 0;
  let totalRevenue = 0;

  if (hasSales) {
    totalSalesCount = sales.length;

    // Products və miqdarlar
    const productIdsSet = new Set();

    for (const sale of sales) {
      for (const item of sale.items) {
        productIdsSet.add(item.productId);
        totalQuantity += item.quantity;
        // alış dəyəri
        const purchase = Number(item.purchasePrice) * item.quantity;
        totalPurchase += purchase;
        // mənfəət
        if (item.profit != null) {
          totalProfit += Number(item.profit);
        }
      }
      if (sale.profitAmount != null && (!sale.items || sale.items.every((it) => it.profit == null))) {
        totalProfit += Number(sale.profitAmount);
      }
    }

    totalProducts = productIdsSet.size;
    totalRevenue = sales.reduce(
      (sum, s) => sum + Number(s.totalAmount || 0),
      0
    );
  }

  // Əgər həmin gün üçün summary artıq varsa, onu update edək
  const existing = await prisma.dailySummary.findFirst({
    where: {
      date: {
        gte: start,
        lte: end,
      },
      deleteType: "NONE",
    },
  });

  let summary;
  if (existing) {
    summary = await prisma.dailySummary.update({
      where: { id: existing.id },
      data: {
        date: start,
        totalSalesCount,
        totalProducts,
        totalQuantity,
        totalRevenue: totalRevenue.toFixed(2),
        totalPurchase: totalPurchase.toFixed(2),
        totalProfit: totalProfit.toFixed(2),
        note: note?.trim() || existing.note,
        staffId,
      },
    });
  } else {
    summary = await prisma.dailySummary.create({
      data: {
        date: start,
        totalSalesCount,
        totalProducts,
        totalQuantity,
        totalRevenue: totalRevenue.toFixed(2),
        totalPurchase: totalPurchase.toFixed(2),
        totalProfit: totalProfit.toFixed(2),
        note: note?.trim() || null,
        staffId,
      },
    });
  }

  // Activity log
  try {
    await createActivityLog({
      staffId,
      entityType: "DailySummary",
      entityId: summary.id,
      action: existing ? "UPDATE" : "CREATE",
      description: `Günlük yekun ${existing ? "yeniləndi" : "yaradıldı"}: ${start
        .toISOString()
        .split("T")[0]}`,
      changes: {
        date: summary.date.toISOString(),
        totalSalesCount: summary.totalSalesCount,
        totalProducts: summary.totalProducts,
        totalQuantity: summary.totalQuantity,
        totalRevenue: summary.totalRevenue.toString(),
        totalPurchase: summary.totalPurchase.toString(),
        totalProfit: summary.totalProfit.toString(),
      },
    });
  } catch (logErr) {
    console.error("DailySummary activity log error:", logErr);
  }

  return { summary, existing, hasSales };
};

// Günlük yekun yarat (və ya yenilə) - istifadəçi tərəfindən çağırılan API
export const createDailySummary = async (req, res) => {
  try {
    const { date, note } = req.body;
    const staffId = req.staffId || null;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: "Tarix tələb olunur",
      });
    }

    const { summary, existing, hasSales } = await generateDailySummaryForDate({
      date,
      note,
      staffId,
    });

    // İstifadəçi üçün: əgər satış yoxdursa, xəbərdarlıq mesajı verək, amma artıq sıfırlarla da yaradılıb
    return res.status(existing ? 200 : 201).json({
      success: true,
      message: existing
        ? "Günlük yekun yeniləndi"
        : hasSales
        ? "Günlük yekun yaradıldı"
        : "Satış tapılmadı, amma sıfır dəyərlərlə günlük yekun yaradıldı",
      data: summary,
    });
  } catch (error) {
    console.error("createDailySummary error", error);
    return res.status(500).json({
      success: false,
      message: "Günlük yekun yaradılarkən xəta baş verdi",
    });
  }
};

// Günlük yekunları siyahı şəklində gətir (statistika üçün)
export const getDailySummaries = async (req, res) => {
  try {
    const { startDate, endDate, page = 1, limit = 20 } = req.query;

    const where = {
      deleteType: "NONE",
    };

    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        const { start } = getDayRange(startDate);
        where.date.gte = start;
      }
      if (endDate) {
        const { end } = getDayRange(endDate);
        where.date.lte = end;
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [summaries, total] = await Promise.all([
      prisma.dailySummary.findMany({
        where,
        include: {
          staff: {
            select: {
              id: true,
              name: true,
              surName: true,
            },
          },
        },
        orderBy: {
          date: "desc",
        },
        skip,
        take: parseInt(limit),
      }),
      prisma.dailySummary.count({ where }),
    ]);

    // Ümumi toplu statistika
    const aggregate = await prisma.dailySummary.aggregate({
      _sum: {
        totalSalesCount: true,
        totalProducts: true,
        totalQuantity: true,
        totalRevenue: true,
        totalPurchase: true,
        totalProfit: true,
      },
      where,
    });

    return res.status(200).json({
      success: true,
      data: summaries,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
      totals: {
        totalSalesCount: aggregate._sum.totalSalesCount || 0,
        totalProducts: aggregate._sum.totalProducts || 0,
        totalQuantity: aggregate._sum.totalQuantity || 0,
        totalRevenue: aggregate._sum.totalRevenue || 0,
        totalPurchase: aggregate._sum.totalPurchase || 0,
        totalProfit: aggregate._sum.totalProfit || 0,
      },
    });
  } catch (error) {
    console.error("getDailySummaries error", error);
    return res.status(500).json({
      success: false,
      message: "Günlük yekunlar alınarkən xəta baş verdi",
    });
  }
};

// ID-yə görə günlük yekun detalları
export const getDailySummaryById = async (req, res) => {
  try {
    const { id } = req.params;

    const summary = await prisma.dailySummary.findUnique({
      where: { id },
      include: {
        staff: {
          select: {
            id: true,
            name: true,
            surName: true,
          },
        },
      },
    });

    if (!summary || summary.deleteType !== "NONE") {
      return res.status(404).json({
        success: false,
        message: "Günlük yekun tapılmadı",
      });
    }

    // Eyni gündəki satışlardan məhsul-level detallar
    const { start, end } = getDayRange(summary.date.toISOString().split('T')[0]);

    const sales = await prisma.sale.findMany({
      where: {
        createdAt: {
          gte: start,
          lte: end,
        },
        deleteType: "NONE",
        isRefunded: false,
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                unitType: true,
                piecesPerBox: true,
              },
            },
          },
        },
      },
    });

    const productMap = new Map();

    for (const sale of sales) {
      for (const item of sale.items) {
        const key = item.productId;
        const current = productMap.get(key) || {
          productId: key,
          product: item.product,
          quantity: 0,
          revenue: 0,
          profit: 0,
        };
        current.quantity += item.quantity;
        current.revenue += Number(item.totalPrice || 0);
        current.profit += Number(item.profit || 0);
        productMap.set(key, current);
      }
    }

    const productDetails = Array.from(productMap.values());

    return res.status(200).json({
      success: true,
      data: summary,
      productDetails,
    });
  } catch (error) {
    console.error("getDailySummaryById error", error);
    return res.status(500).json({
      success: false,
      message: "Günlük yekun tapılarkən xəta baş verdi",
    });
  }
};


