import prisma from '../lib/prisma.js';
import { Prisma } from '@prisma/client';
import { computeCashboxBalance, buildBranchFilter } from '../services/cashboxService.js';
import { getStoreFilter } from "../utils/storeHelper.js";

/** Satış sorğularında filial: konkret id, 'central' → yalnız mərkəzi (branchId null), boş → süzülmür */
function saleBranchWhere(branchId) {
    if (branchId && branchId !== 'central') {
        return { branchId };
    }
    if (branchId === 'central') {
        return { branchId: null };
    }
    return {};
}

// Ümumi statistika (Dashboard üçün)
export const getOverallStatistics = async (req, res) => {
    try {
        const { startDate, endDate, branchId } = req.query;

        const storeFilter = getStoreFilter(req);

        // ================= DATE FILTER =================
        let dateFilter = {};
        if (startDate && endDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            dateFilter = { createdAt: { gte: start, lte: end } };
        }

        // Branch filter base
        const branchWhere = {};
        if (branchId && branchId !== 'central') {
            branchWhere.branchId = branchId;
        } else if (branchId === 'central') {
            branchWhere.branchId = null;
        }

        // ================= SALES CATEGORIES =================

        // 1. GROSS (Everything - not deleted)
        const grossFilter = { deleteType: 'NONE', ...dateFilter, ...branchWhere, ...storeFilter };
        const grossSalesCount = await prisma.sale.count({ where: grossFilter });
        const grossAggregation = await prisma.sale.aggregate({
            where: grossFilter,
            _sum: { totalAmount: true, profitAmount: true }
        });

        // 2. REFUNDED (Fully refunded sales)
        const refundedFilter = { ...grossFilter, isRefunded: true };
        const refundedSalesCount = await prisma.sale.count({ where: refundedFilter });
        const refundedAggregation = await prisma.sale.aggregate({
            where: refundedFilter,
            _sum: { totalAmount: true, profitAmount: true }
        });

        // 3. NET (Active sales only)
        const netSalesCount = grossSalesCount - refundedSalesCount;
        const netSalesAmount = Number(grossAggregation._sum.totalAmount || 0) - Number(refundedAggregation._sum.totalAmount || 0);
        const netSalesProfit = Number(grossAggregation._sum.profitAmount || 0) - Number(refundedAggregation._sum.profitAmount || 0);

        // ================= RETURNS & PARTIALS =================

        // 4. TOTAL RETURNS (All salereturn records)
        const returnsFilter = {
            ...dateFilter,
            sale: {
                deleteType: 'NONE',
                ...branchWhere,
                ...storeFilter,
            }
        };
        const totalReturnsCount = await prisma.salereturn.count({ where: returnsFilter });
        const returnsAggregation = await prisma.salereturn.aggregate({
            where: returnsFilter,
            _sum: { returnedAmount: true }
        });

        // 5. PARTIAL RETURNS LOSS (Loss from returns belonging to NON-refunded sales)
        const partialReturnLossAgg = await prisma.salereturnitem.aggregate({
            where: {
                return: {
                    ...dateFilter,
                    sale: {
                        deleteType: 'NONE',
                        isRefunded: false,
                        ...branchWhere,
                        ...storeFilter,
                    }
                }
            },
            _sum: { loss: true, totalPrice: true }
        });

        const partialReturnLoss = Number(partialReturnLossAgg._sum.loss || 0);
        const partialReturnAmount = Number(partialReturnLossAgg._sum.totalPrice || 0);

        // 6. FINAL PROFIT (Net Profit - Partial Return Loss)
        const finalProfit = netSalesProfit - partialReturnLoss;

        // ================= PRODUCTS =================
        let totalProducts, activeProducts, deletedProducts, stockAggregation;

        const currentBranchFilter = (branchId && branchId !== 'central') ? { branchId } : (branchId === 'central' ? { branchId: null } : {});

        if (branchId && branchId !== 'central') {
            // All products that are not soft-deleted globally AND not soft-deleted in this branch
            const branchVisibleFilter = {
                deleteType: 'NONE',
                branchDeletedProducts: {
                    none: {
                        branchId: branchId
                    }
                }
            };

            totalProducts = await prisma.product.count({
                where: { ...branchVisibleFilter, ...storeFilter }
            });
            activeProducts = await prisma.product.count({
                where: { ...branchVisibleFilter, isActive: true, ...storeFilter }
            });
            stockAggregation = await prisma.branchstock.aggregate({
                where: {
                    branchId: branchId,
                    product: { isActive: true, deleteType: 'NONE', ...storeFilter }
                },
                _sum: { stock: true }
            });
            // Global deleted products count
            deletedProducts = await prisma.product.count({ where: { deleteType: { not: 'NONE' }, ...storeFilter } });
        } else {
            totalProducts = await prisma.product.count({ where: { deleteType: 'NONE', ...storeFilter } });
            activeProducts = await prisma.product.count({ where: { isActive: true, deleteType: 'NONE', ...storeFilter } });
            stockAggregation = await prisma.product.aggregate({ where: { isActive: true, deleteType: 'NONE', ...storeFilter }, _sum: { stock: true } });
            deletedProducts = await prisma.product.count({ where: { deleteType: { not: 'NONE' }, ...storeFilter } });
        }

        const softDeletedProducts = await prisma.product.count({ where: { deleteType: 'SOFT', ...storeFilter } });
        const hardDeletedProducts = await prisma.product.count({ where: { deleteType: 'HARD', ...storeFilter } });
        const archivedProducts = await prisma.product.count({ where: { deleteType: 'ARCHIVED', ...storeFilter } });

        // ================= STAFF =================
        const totalStaff = await prisma.staff.count({ where: currentBranchFilter });
        const activeStaff = await prisma.staff.count({ where: { isActive: true, ...currentBranchFilter } });

        // ================= EXPENSES & HANDOVER =================
        let expenseDateFilter = {};
        if (startDate && endDate) {
            const start = new Date(startDate); start.setHours(0, 0, 0, 0);
            const end = new Date(endDate); end.setHours(23, 59, 59, 999);
            expenseDateFilter = { date: { gte: start, lte: end } };
        }
        const expensesAggregation = await prisma.expense.aggregate({
            where: { deleteType: 'NONE', ...expenseDateFilter, ...currentBranchFilter, ...storeFilter },
            _sum: { amount: true }
        });

        const cashHandoverAggregation = await prisma.cashhandover.aggregate({
            where: { deleteType: 'NONE', ...expenseDateFilter, ...currentBranchFilter, ...storeFilter },
            _sum: { amount: true },
            _count: true
        });

        // ================= CREDITS =================
        const creditSalesFilter = { isCredit: true, isRefunded: false, deleteType: 'NONE', ...dateFilter, ...currentBranchFilter, ...storeFilter };
        const totalCreditSales = await prisma.sale.count({ where: creditSalesFilter });
        const creditSalesAggregation = await prisma.sale.aggregate({
            where: creditSalesFilter,
            _sum: { creditTotalAmount: true, creditRemainingAmount: true }
        });
        const activeCredits = await prisma.sale.count({ where: { isCredit: true, isRefunded: false, isCreditPaid: false, deleteType: 'NONE', ...storeFilter } });
        const totalCreditPaid = Number(creditSalesAggregation._sum.creditTotalAmount || 0) - Number(creditSalesAggregation._sum.creditRemainingAmount || 0);

        // ================= TODAY STATS =================
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

        const todayGrossFilter = { deleteType: 'NONE', createdAt: { gte: today, lt: tomorrow }, ...currentBranchFilter, ...storeFilter };
        const todayGrossCount = await prisma.sale.count({ where: todayGrossFilter });
        const todayGrossAgg = await prisma.sale.aggregate({ where: todayGrossFilter, _sum: { totalAmount: true, profitAmount: true } });

        const todayRefundedFilter = { ...todayGrossFilter, isRefunded: true };
        const todayRefundedCount = await prisma.sale.count({ where: todayRefundedFilter });
        const todayRefundedAgg = await prisma.sale.aggregate({ where: todayRefundedFilter, _sum: { totalAmount: true, profitAmount: true } });

        const todayNetCount = todayGrossCount - todayRefundedCount;
        const todayNetAmount = Number(todayGrossAgg._sum.totalAmount || 0) - Number(todayRefundedAgg._sum.totalAmount || 0);
        const todayNetProfit = Number(todayGrossAgg._sum.profitAmount || 0) - Number(todayRefundedAgg._sum.profitAmount || 0);

        // Today partial loss
        const todayPartialLossAgg = await prisma.salereturnitem.aggregate({
            where: {
                return: {
                    createdAt: { gte: today, lt: tomorrow },
                    sale: { deleteType: 'NONE', isRefunded: false, ...currentBranchFilter, ...storeFilter }
                }
            },
            _sum: { loss: true }
        });
        const todayFinalProfit = todayNetProfit - Number(todayPartialLossAgg._sum.loss || 0);
        
        // Today Expenses
        const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
        const todayExpensesAgg = await prisma.expense.aggregate({
            where: { deleteType: 'NONE', date: { gte: todayStart, lte: todayEnd }, ...currentBranchFilter, ...storeFilter },
            _sum: { amount: true }
        });

        // Today Handovers
        const todayHandoverAgg = await prisma.cashhandover.aggregate({
            where: { deleteType: 'NONE', date: { gte: todayStart, lte: todayEnd }, ...currentBranchFilter, ...storeFilter },
            _sum: { amount: true },
            _count: true
        });

        // ================= KASSA (CASHBOX) - ALL TIME =================
        const kassaBranchFilter = { ...buildBranchFilter(branchId), ...storeFilter };
        const cashboxResult = await computeCashboxBalance(kassaBranchFilter);
        const cashboxBalance = cashboxResult.balance;

        // ================= RESPONSE =================
        res.json({
            success: true,
            data: {
                sales: {
                    gross: {
                        count: grossSalesCount,
                        amount: Number(grossAggregation._sum.totalAmount || 0),
                        profit: Number(grossAggregation._sum.profitAmount || 0)
                    },
                    refunded: {
                        count: refundedSalesCount,
                        amount: Number(refundedAggregation._sum.totalAmount || 0),
                        profit: Number(refundedAggregation._sum.profitAmount || 0)
                    },
                    net: {
                        count: netSalesCount,
                        amount: netSalesAmount,
                        profit: netSalesProfit
                    },
                    partialReturns: {
                        amount: partialReturnAmount,
                        loss: partialReturnLoss
                    },
                    totalProfit: finalProfit, // Final net profit
                    today: {
                        count: todayNetCount,
                        amount: todayNetAmount,
                        profit: todayFinalProfit,
                        grossCount: todayGrossCount
                    }
                },
                returns: {
                    total: totalReturnsCount,
                    returnedAmount: Number(returnsAggregation._sum.returnedAmount || 0)
                },
                products: {
                    total: totalProducts,
                    active: activeProducts,
                    totalStock: stockAggregation._sum.stock || 0,
                    deleted: { total: deletedProducts, soft: softDeletedProducts, hard: hardDeletedProducts, archived: archivedProducts }
                },
                staff: { total: totalStaff, active: activeStaff },
                expenses: { 
                    totalAmount: Number(expensesAggregation._sum.amount || 0),
                    today: { amount: Number(todayExpensesAgg._sum.amount || 0) }
                },
                cashHandover: { 
                    total: cashHandoverAggregation._count || 0, 
                    totalAmount: Number(cashHandoverAggregation._sum.amount || 0),
                    today: { 
                        count: todayHandoverAgg._count || 0,
                        amount: Number(todayHandoverAgg._sum.amount || 0)
                    }
                },
                credits: {
                    total: totalCreditSales,
                    totalAmount: creditSalesAggregation._sum.creditTotalAmount || 0,
                    paidAmount: totalCreditPaid,
                    remainingAmount: creditSalesAggregation._sum.creditRemainingAmount || 0,
                    active: activeCredits
                },
                cashbox: {
                    balance: cashboxBalance
                }
            }
        });

    } catch (error) {
        console.error('Error fetching overall statistics:', error);
        res.status(500).json({ success: false, message: 'Statistika məlumatları alınarkən xəta baş verdi', error: error.message });
    }
};


// Tarix aralığına görə statistika
export const getStatisticsByDateRange = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'Başlanğıc və bitmə tarixi tələb olunur'
            });
        }

        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        // Satışlar (yalnız silinməyən satışlar)
        const sales = await prisma.sale.findMany({
            where: {
                isRefunded: false,
                deleteType: 'NONE',
                createdAt: {
                    gte: start,
                    lte: end
                }
            },
            include: {
                items: {
                    include: {
                        product: true
                    }
                }
            }
        });

        const salesAggregation = await prisma.sale.aggregate({
            where: {
                isRefunded: false,
                deleteType: 'NONE',
                createdAt: {
                    gte: start,
                    lte: end
                }
            },
            _sum: {
                totalAmount: true,
                profitAmount: true
            },
            _count: true
        });

        // Qaytarmalar (yalnız silinməmiş satışlara aid)
        const returns = await prisma.salereturn.findMany({
            where: {
                createdAt: {
                    gte: start,
                    lte: end
                },
                sale: {
                    deleteType: 'NONE'
                }
            },
            include: {
                items: {
                    include: {
                        product: true
                    }
                }
            }
        });

        const returnsAggregation = await prisma.salereturn.aggregate({
            where: {
                createdAt: {
                    gte: start,
                    lte: end
                },
                sale: {
                    deleteType: 'NONE'
                }
            },
            _sum: {
                totalAmount: true,
                returnedAmount: true
            },
            _count: true
        });

        res.json({
            success: true,
            data: {
                period: {
                    startDate: start,
                    endDate: end
                },
                sales: {
                    count: salesAggregation._count,
                    totalAmount: salesAggregation._sum.totalAmount || 0,
                    totalProfit: salesAggregation._sum.profitAmount || 0,
                    details: sales
                },
                returns: {
                    count: returnsAggregation._count,
                    totalAmount: returnsAggregation._sum.totalAmount || 0,
                    returnedAmount: returnsAggregation._sum.returnedAmount || 0,
                    details: returns
                }
            }
        });
    } catch (error) {
        console.error('Error fetching statistics by date range:', error);
        res.status(500).json({
            success: false,
            message: 'Tarix aralığına görə statistika alınarkən xəta baş verdi',
            error: error.message
        });
    }
};

// Günlük statistika (son N gün)
export const getDailyStatistics = async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 7;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        startDate.setHours(0, 0, 0, 0);

        const endDate = new Date();
        endDate.setHours(23, 59, 59, 999);

        const dailyStats = [];

        for (let i = 0; i < days; i++) {
            const currentDate = new Date(startDate);
            currentDate.setDate(currentDate.getDate() + i);
            const nextDate = new Date(currentDate);
            nextDate.setDate(nextDate.getDate() + 1);

            const salesAggregation = await prisma.sale.aggregate({
                where: {
                    isRefunded: false,
                    deleteType: 'NONE',
                    createdAt: {
                        gte: currentDate,
                        lt: nextDate
                    }
                },
                _sum: {
                    totalAmount: true,
                    profitAmount: true
                },
                _count: true
            });

            const returnsAggregation = await prisma.salereturn.aggregate({
                where: {
                    createdAt: {
                        gte: currentDate,
                        lt: nextDate
                    },
                    sale: {
                        deleteType: 'NONE'
                    }
                },
                _sum: {
                    totalAmount: true,
                    returnedAmount: true
                },
                _count: true
            });

            dailyStats.push({
                date: currentDate.toISOString().split('T')[0],
                sales: {
                    count: salesAggregation._count,
                    amount: salesAggregation._sum.totalAmount || 0,
                    profit: salesAggregation._sum.profitAmount || 0
                },
                returns: {
                    count: returnsAggregation._count,
                    amount: returnsAggregation._sum.totalAmount || 0,
                    returnedAmount: returnsAggregation._sum.returnedAmount || 0
                }
            });
        }

        res.json({
            success: true,
            data: dailyStats
        });
    } catch (error) {
        console.error('Error fetching daily statistics:', error);
        res.status(500).json({
            success: false,
            message: 'Günlük statistika alınarkən xəta baş verdi',
            error: error.message
        });
    }
};

// Ən çox satılan məhsullar
export const getTopSellingProducts = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const branchId = req.query.branchId;
        const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
        const endDate = req.query.endDate ? new Date(req.query.endDate) : null;

        let whereClause = {
            sale: {
                isRefunded: false,
                deleteType: 'NONE',
                ...saleBranchWhere(branchId)
            },
            product: {
                deleteType: 'NONE'
            }
        };

        if (startDate && endDate) {
            startDate.setHours(0, 0, 0, 0);
            endDate.setHours(23, 59, 59, 999);
            whereClause.sale.createdAt = {
                gte: startDate,
                lte: endDate
            };
        }

        const topProducts = await prisma.saleitem.groupBy({
            by: ['productId'],
            where: whereClause,
            _sum: {
                quantity: true,
                totalPrice: true,
                profit: true
            },
            orderBy: {
                _sum: {
                    quantity: 'desc'
                }
            },
            take: limit
        });

        const productIds = topProducts.map(item => item.productId);
        const products = await prisma.product.findMany({
            where: {
                id: {
                    in: productIds
                },
                deleteType: 'NONE'
            }
        });

        const result = topProducts.map(item => {
            const product = products.find(p => p.id === item.productId);
            return {
                product: product || null,
                totalQuantity: item._sum.quantity || 0,
                totalRevenue: item._sum.totalPrice || 0,
                totalProfit: item._sum.profit || 0
            };
        });

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Error fetching top selling products:', error);
        res.status(500).json({
            success: false,
            message: 'Ən çox satılan məhsullar alınarkən xəta baş verdi',
            error: error.message
        });
    }
};

// Ödəniş növünə görə statistika
export const getStatisticsByPaymentType = async (req, res) => {
    try {
        const branchId = req.query.branchId;
        const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
        const endDate = req.query.endDate ? new Date(req.query.endDate) : null;

        let whereClause = {
            isRefunded: false,
            deleteType: 'NONE',
            ...saleBranchWhere(branchId)
        };

        if (startDate && endDate) {
            startDate.setHours(0, 0, 0, 0);
            endDate.setHours(23, 59, 59, 999);
            whereClause.createdAt = {
                gte: startDate,
                lte: endDate
            };
        }

        const cashSales = await prisma.sale.aggregate({
            where: {
                ...whereClause,
                paymentType: 'cash'
            },
            _sum: {
                totalAmount: true,
                profitAmount: true
            },
            _count: true
        });

        const cardSales = await prisma.sale.aggregate({
            where: {
                ...whereClause,
                paymentType: 'card'
            },
            _sum: {
                totalAmount: true,
                profitAmount: true
            },
            _count: true
        });

        const otherSales = await prisma.sale.aggregate({
            where: {
                ...whereClause,
                OR: [
                    { paymentType: null },
                    { paymentType: { notIn: ['cash', 'card'] } }
                ]
            },
            _sum: {
                totalAmount: true,
                profitAmount: true
            },
            _count: true
        });

        res.json({
            success: true,
            data: {
                cash: {
                    count: cashSales._count,
                    amount: cashSales._sum.totalAmount || 0,
                    profit: cashSales._sum.profitAmount || 0
                },
                card: {
                    count: cardSales._count,
                    amount: cardSales._sum.totalAmount || 0,
                    profit: cardSales._sum.profitAmount || 0
                },
                other: {
                    count: otherSales._count,
                    amount: otherSales._sum.totalAmount || 0,
                    profit: otherSales._sum.profitAmount || 0
                }
            }
        });
    } catch (error) {
        console.error('Error fetching statistics by payment type:', error);
        res.status(500).json({
            success: false,
            message: 'Ödəniş növünə görə statistika alınarkən xəta baş verdi',
            error: error.message
        });
    }
};

// Müştəri statistikası
export const getCustomerStatistics = async (req, res) => {
    try {
        const branchId = req.query.branchId;
        const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
        const endDate = req.query.endDate ? new Date(req.query.endDate) : null;

        let whereClause = {
            isRefunded: false,
            deleteType: 'NONE',
            ...saleBranchWhere(branchId)
        };

        if (startDate && endDate) {
            startDate.setHours(0, 0, 0, 0);
            endDate.setHours(23, 59, 59, 999);
            whereClause.createdAt = {
                gte: startDate,
                lte: endDate
            };
        }

        // Ümumi müştəri sayı (unikal müştərilər)
        const uniqueCustomers = await prisma.sale.groupBy({
            by: ['customerPhone'],
            where: {
                ...whereClause,
                customerPhone: {
                    not: null
                }
            }
        });

        // Müştəri sifarişləri
        const customerOrders = await prisma.sale.findMany({
            where: {
                ...whereClause,
                customerPhone: {
                    not: null
                }
            },
            select: {
                customerName: true,
                customerSurname: true,
                customerPhone: true,
                totalAmount: true,
                profitAmount: true,
                createdAt: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        // Müştəriyə görə qruplaşdırma
        const customerMap = new Map();
        customerOrders.forEach(order => {
            const phone = order.customerPhone;
            if (!customerMap.has(phone)) {
                customerMap.set(phone, {
                    customerName: order.customerName,
                    customerSurname: order.customerSurname,
                    customerPhone: phone,
                    orderCount: 0,
                    totalSpent: 0,
                    totalProfit: 0,
                    lastOrderDate: null
                });
            }
            const customer = customerMap.get(phone);
            customer.orderCount++;
            customer.totalSpent += parseFloat(order.totalAmount);
            customer.totalProfit += parseFloat(order.profitAmount || 0);
            if (!customer.lastOrderDate || new Date(order.createdAt) > new Date(customer.lastOrderDate)) {
                customer.lastOrderDate = order.createdAt;
            }
        });

        const customerStats = Array.from(customerMap.values())
            .sort((a, b) => b.totalSpent - a.totalSpent);

        res.json({
            success: true,
            data: {
                uniqueCustomers: uniqueCustomers.length,
                totalOrders: customerOrders.length,
                customers: customerStats
            }
        });
    } catch (error) {
        console.error('Error fetching customer statistics:', error);
        res.status(500).json({
            success: false,
            message: 'Müştəri statistikası alınarkən xəta baş verdi',
            error: error.message
        });
    }
};

/**
 * getSalesLedger — Superadmin \u00fc\u00e7\u00fcn sat\u0131\u015f d\u0259ft\u0259ri
 * H\u0259r sat\u0131\u015f\u0131n qiym\u0259tini siyah\u0131 \u015f\u0259klind\u0259 qaytar\u0131r: 20 + 40 + 15 = 75
 * H\u0259m\u00e7inin kassadan kassa balans\u0131n\u0131, x\u0259rcl\u0259ri, t\u0259slimatlar\u0131 g\u00f6st\u0259rir.
 */
export const getSalesLedger = async (req, res) => {
    try {
        const { startDate, endDate, branchId } = req.query;

        const storeFilter = getStoreFilter(req);

        // Date filter
        let dateFilter = {};
        if (startDate && endDate) {
            const start = new Date(startDate); start.setHours(0, 0, 0, 0);
            const end = new Date(endDate);     end.setHours(23, 59, 59, 999);
            dateFilter = { createdAt: { gte: start, lte: end } };
        }

        const branchFilter = buildBranchFilter(branchId);

        // Satışlar (Bütün satışlar, silinməmiş)
        const sales = await prisma.sale.findMany({
            where: { deleteType: 'NONE', ...branchFilter, ...dateFilter, ...storeFilter },
            select: {
                id: true,
                totalAmount: true,
                paidAmount: true,
                profitAmount: true,
                paymentType: true,
                isCredit: true,
                isRefunded: true,
                refundedAt: true,
                createdAt: true,
                customerName: true,
                customerSurname: true,
                branch: { select: { name: true } },
                items: {
                    select: {
                        quantity: true,
                        pricePerItem: true,
                        totalPrice: true,
                        product: { select: { name: true } },
                    }
                },
            },
            orderBy: { createdAt: 'desc' }, // Ən sonuncular yuxarıda
        });

        // Expense/handover date filter
        let expenseDateFilter = {};
        if (startDate && endDate) {
            const s = new Date(startDate); s.setHours(0,0,0,0);
            const e = new Date(endDate);   e.setHours(23,59,59,999);
            expenseDateFilter = { date: { gte: s, lte: e } };
        }

        const [expensesAgg, handoversAgg, cashbox] = await Promise.all([
            prisma.expense.aggregate({
                where: { deleteType: 'NONE', ...branchFilter, ...expenseDateFilter, ...storeFilter },
                _sum: { amount: true },
            }),
            prisma.cashhandover.aggregate({
                where: { deleteType: 'NONE', ...branchFilter, ...expenseDateFilter, ...storeFilter },
                _sum: { amount: true },
                _count: true,
            }),
            computeCashboxBalance({ ...branchFilter, ...storeFilter }),
        ]);

        const totalSalesAmount = sales.reduce((s, x) => s + Number(x.totalAmount), 0);
        const totalProfit      = sales.reduce((s, x) => s + Number(x.profitAmount || 0), 0);
        const totalExpenses    = Number(expensesAgg._sum.amount  || 0);
        const totalHandovers   = Number(handoversAgg._sum.amount || 0);
        const handoverCount    = handoversAgg._count || 0;

        return res.json({
            success: true,
            data: {
                sales: sales.map(s => ({
                    id:          s.id,
                    totalAmount: Number(s.totalAmount),
                    paidAmount:  Number(s.paidAmount),
                    profitAmount: Number(s.profitAmount || 0),
                    paymentType: s.paymentType,
                    isCredit:    s.isCredit,
                    createdAt:   s.createdAt,
                    customerName: s.customerName,
                    customerSurname: s.customerSurname,
                    branchName:  s.branch?.name ?? null,
                    items: s.items.map(i => ({
                        productName:  i.product?.name ?? '-',
                        quantity:     i.quantity,
                        pricePerItem: Number(i.pricePerItem),
                        totalPrice:   Number(i.totalPrice),
                    })),
                })),
                summary: {
                    totalSales:     sales.length,
                    totalAmount:    Math.round(totalSalesAmount * 100) / 100,
                    totalProfit:    Math.round(totalProfit * 100) / 100,
                    totalExpenses:  Math.round(totalExpenses * 100) / 100,
                    totalHandovers: Math.round(totalHandovers * 100) / 100,
                    handoverCount,
                    cashboxBalance: cashbox.balance,
                    cashIn:        cashbox.cashIn,
                    cashOut:       cashbox.cashOut,
                    cashSales:     cashbox.cashSales,
                    creditPayments: cashbox.creditPayments,
                },
            }
        });
    } catch (error) {
        console.error('getSalesLedger error:', error);
        return res.status(500).json({ success: false, message: 'Sat\u0131\u015f d\u0259ft\u0259ri al\u0131nark\u0259n x\u0259ta ba\u015f verdi', error: error.message });
    }
};
