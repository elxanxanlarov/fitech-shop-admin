import prisma from '../lib/prisma.js';
import { Prisma } from '@prisma/client';

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

        // ================= DATE FILTER =================
        let dateFilter = {};
        if (startDate && endDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            dateFilter = { createdAt: { gte: start, lte: end } };
        }

        // Yalnız silinməyən və tam qaytarılmayan satışları nəzərə al
        const salesFilter = { deleteType: 'NONE', isRefunded: false, ...dateFilter };

        // Branch filter
        if (branchId && branchId !== 'central') {
            salesFilter.branchId = branchId;
        } else if (branchId === 'central') {
            salesFilter.branchId = null;
        }

        // ================= TOTAL SALES =================
        const totalSales = await prisma.sale.count({ where: salesFilter });

        const salesAggregation = await prisma.sale.aggregate({
            where: salesFilter,
            _sum: { totalAmount: true, profitAmount: true }
        });

        // ================= TOTAL RETURNS =================
        // Yalnız silinməmiş satışlara aid qaytarmaları göstər
        const returnsFilter = {
            ...dateFilter,
            sale: {
                deleteType: 'NONE',
                branchId: branchId === 'central' ? null : (branchId || undefined)
            }
        };

        const totalReturns = await prisma.salereturn.count({ where: returnsFilter });

        const returnsAggregation = await prisma.salereturn.aggregate({
            where: returnsFilter,
            _sum: { returnedAmount: true }
        });

        // Qaytarma zamanı itirilən qazancı hesabla (SaleReturnItem-dəki loss-ların cəmi)
        // Yalnız silinməmiş satışlara aid qaytarmaları nəzərə al
        const returnItemsLoss = await prisma.salereturnitem.aggregate({
            where: {
                return: {
                    ...dateFilter,
                    sale: {
                        deleteType: 'NONE'
                    }
                }
            },
            _sum: {
                loss: true
            }
        });

        // ================= NET SALES =================
        const netSalesAmount = (salesAggregation._sum.totalAmount || 0) - (returnsAggregation._sum.returnedAmount || 0);
        // Qazancdan qaytarma zamanı itirilən qazancı çıx (loss), qaytarma məbləğini deyil
        const totalProfit = salesAggregation._sum.profitAmount || new Prisma.Decimal(0);
        const totalLoss = returnItemsLoss._sum.loss || new Prisma.Decimal(0);
        const netProfit = parseFloat(totalProfit.sub(totalLoss).toString());

        // ================= PRODUCTS =================
        let totalProducts, activeProducts, deletedProducts, stockAggregation;

        if (branchId && branchId !== 'central') {
            totalProducts = await prisma.branchstock.count({
                where: {
                    branchId: branchId,
                    product: { deleteType: 'NONE' }
                }
            });
            activeProducts = await prisma.branchstock.count({
                where: {
                    branchId: branchId,
                    product: { isActive: true, deleteType: 'NONE' }
                }
            });
            stockAggregation = await prisma.branchstock.aggregate({
                where: {
                    branchId: branchId,
                    product: { isActive: true, deleteType: 'NONE' }
                },
                _sum: { stock: true }
            });
            // Deleted products are usually global or central warehouse concern
            deletedProducts = await prisma.product.count({ where: { deleteType: { not: 'NONE' } } });
        } else {
            totalProducts = await prisma.product.count({ where: { deleteType: 'NONE' } });
            activeProducts = await prisma.product.count({ where: { isActive: true, deleteType: 'NONE' } });
            stockAggregation = await prisma.product.aggregate({ where: { isActive: true, deleteType: 'NONE' }, _sum: { stock: true } });
            deletedProducts = await prisma.product.count({ where: { deleteType: { not: 'NONE' } } });
        }

        const softDeletedProducts = await prisma.product.count({ where: { deleteType: 'SOFT' } });
        const hardDeletedProducts = await prisma.product.count({ where: { deleteType: 'HARD' } });
        const archivedProducts = await prisma.product.count({ where: { deleteType: 'ARCHIVED' } });

        const currentBranchFilter = (branchId && branchId !== 'central') ? { branchId } : (branchId === 'central' ? { branchId: null } : {});

        // ================= STAFF =================
        const totalStaff = await prisma.staff.count({ where: currentBranchFilter });
        const activeStaff = await prisma.staff.count({ where: { isActive: true, ...currentBranchFilter } });

        // ================= EXPENSES =================
        let expenseDateFilter = {};
        if (startDate && endDate) {
            const start = new Date(startDate); start.setHours(0, 0, 0, 0);
            const end = new Date(endDate); end.setHours(23, 59, 59, 999);
            expenseDateFilter = { date: { gte: start, lte: end } };
        }
        const expensesAggregation = await prisma.expense.aggregate({
            where: { deleteType: 'NONE', ...expenseDateFilter, ...currentBranchFilter },
            _sum: { amount: true }
        });

        // ================= CASH HANDOVER =================
        let cashHandoverDateFilter = {};
        if (startDate && endDate) {
            const start = new Date(startDate); start.setHours(0, 0, 0, 0);
            const end = new Date(endDate); end.setHours(23, 59, 59, 999);
            cashHandoverDateFilter = { date: { gte: start, lte: end } };
        }
        const cashHandoverAggregation = await prisma.cashhandover.aggregate({
            where: { deleteType: 'NONE', ...cashHandoverDateFilter, ...currentBranchFilter },
            _sum: { amount: true },
            _count: true
        });

        // ================= CREDITS =================
        const creditSalesFilter = { isCredit: true, isRefunded: false, deleteType: 'NONE', ...dateFilter, ...currentBranchFilter };
        const totalCreditSales = await prisma.sale.count({ where: creditSalesFilter });
        const creditSalesAggregation = await prisma.sale.aggregate({
            where: creditSalesFilter,
            _sum: { creditTotalAmount: true, creditRemainingAmount: true }
        });
        const activeCredits = await prisma.sale.count({ where: { isCredit: true, isRefunded: false, isCreditPaid: false, deleteType: 'NONE' } });
        const totalCreditPaid = (creditSalesAggregation._sum.creditTotalAmount || 0) - (creditSalesAggregation._sum.creditRemainingAmount || 0);

        // ================= TODAY STATS =================
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

        let todaySales = 0;
        let todaySalesAggregation = { _sum: { totalAmount: 0, profitAmount: 0 } };
        let todayReturnsAggregation = { _sum: { returnedAmount: 0 } };
        let todayExpensesAggregation = { _sum: { amount: 0 } };
        let todayCashHandoverAggregation = { _sum: { amount: 0 }, _count: 0 };
        let todayCreditSales = 0;
        let todayCreditSalesAggregation = { _sum: { creditTotalAmount: 0, creditRemainingAmount: 0 } };

        if (!startDate || !endDate) {
            const todaySalesFilter = {
                deleteType: 'NONE', isRefunded: false,
                createdAt: { gte: today, lt: tomorrow },
                ...currentBranchFilter
            };
            todaySales = await prisma.sale.count({ where: todaySalesFilter });
            todaySalesAggregation = await prisma.sale.aggregate({ where: todaySalesFilter, _sum: { totalAmount: true, profitAmount: true } });

            // Bu günkü qaytarmalar - yalnız silinməmiş satışlara aid
            todayReturnsAggregation = await prisma.salereturn.aggregate({
                where: {
                    createdAt: { gte: today, lt: tomorrow },
                    sale: {
                        deleteType: 'NONE',
                        ...currentBranchFilter
                    }
                },
                _sum: { returnedAmount: true }
            });

            todayExpensesAggregation = await prisma.expense.aggregate({
                where: { deleteType: 'NONE', date: { gte: today, lt: tomorrow }, ...currentBranchFilter },
                _sum: { amount: true }
            });
            todayCashHandoverAggregation = await prisma.cashhandover.aggregate({
                where: { deleteType: 'NONE', date: { gte: today, lt: tomorrow }, ...currentBranchFilter },
                _sum: { amount: true }, _count: true
            });
            const todayCreditFilter = {
                isCredit: true, isRefunded: false, deleteType: 'NONE',
                createdAt: { gte: today, lt: tomorrow },
                ...currentBranchFilter
            };
            todayCreditSales = await prisma.sale.count({ where: todayCreditFilter });
            todayCreditSalesAggregation = await prisma.sale.aggregate({ where: todayCreditFilter, _sum: { creditTotalAmount: true, creditRemainingAmount: true } });
        }

        // Bu günkü qaytarma loss-larını hesabla (yalnız silinməmiş satışlara aid)
        let todayLoss = new Prisma.Decimal(0);
        if (!startDate || !endDate) {
            const todayReturnItemsLoss = await prisma.salereturnitem.aggregate({
                where: {
                    return: {
                        createdAt: { gte: today, lt: tomorrow },
                        sale: {
                            deleteType: 'NONE',
                            ...currentBranchFilter
                        }
                    }
                },
                _sum: { loss: true }
            });
            todayLoss = todayReturnItemsLoss._sum.loss || new Prisma.Decimal(0);
        }

        // ================= NET TODAY =================
        const todayNetAmount = (todaySalesAggregation._sum.totalAmount || 0) - (todayReturnsAggregation._sum.returnedAmount || 0);
        // Bu günkü qazancdan qaytarma loss-larını çıx
        const todayTotalProfit = new Prisma.Decimal(todaySalesAggregation._sum.profitAmount || 0);
        const todayNetProfit = parseFloat(todayTotalProfit.sub(todayLoss).toString());

        // ================= NET REVENUE (after cash handover) =================
        const totalCashHandover = cashHandoverAggregation._sum.amount || 0;
        const todayCashHandover = todayCashHandoverAggregation._sum.amount || 0;

        // Xalis gəlir (Cash Handover çıxıldıqdan sonra)
        const netRevenueAfterHandover = netSalesAmount - totalCashHandover;
        const todayNetRevenueAfterHandover = todayNetAmount - todayCashHandover;

        // ================= KASSA (CASHBOX) - ALL TIME =================
        // Kassa həmişə mövcud vəziyyəti göstərməlidir (tarix filtri olmadan)
        const kassaBranchFilter = {};
        if (branchId && branchId !== 'central') {
            kassaBranchFilter.branchId = branchId;
        } else if (branchId === 'central') {
            kassaBranchFilter.branchId = null;
        }

        // 1. Nakit satışlar (Bütün zamanlar)
        const totalCashSalesAllTime = await prisma.sale.aggregate({
            where: { ...kassaBranchFilter, deleteType: 'NONE', paymentType: 'cash', isRefunded: false },
            _sum: { totalAmount: true }
        });

        // 2. Kredit ödənişləri (Nakit olanlar - Bütün zamanlar)
        const totalCashCreditPaymentsAllTime = await prisma.creditpayment.aggregate({
            where: {
                ...kassaBranchFilter,
                paymentType: 'cash',
                sale: { deleteType: 'NONE' }
            },
            _sum: { amount: true }
        });

        // 3. Qaytarmalar (Nakit olan satışlara aid qaytarmalar - Bütün zamanlar)
        const totalCashReturnsAllTime = await prisma.salereturn.aggregate({
            where: {
                ...kassaBranchFilter,
                sale: {
                    paymentType: 'cash',
                    deleteType: 'NONE'
                }
            },
            _sum: { returnedAmount: true }
        });

        // 4. Bütün xərclər (Bütün zamanlar)
        const totalExpensesAllTime = await prisma.expense.aggregate({
            where: { ...kassaBranchFilter, deleteType: 'NONE' },
            _sum: { amount: true }
        });

        // 5. Bütün təslimatlar (Bütün zamanlar)
        const totalHandoversAllTime = await prisma.cashhandover.aggregate({
            where: { ...kassaBranchFilter, deleteType: 'NONE' },
            _sum: { amount: true }
        });

        const cashboxBalance =
            (totalCashSalesAllTime._sum.totalAmount || 0) +
            (totalCashCreditPaymentsAllTime._sum.amount || 0) -
            (totalCashReturnsAllTime._sum.returnedAmount || 0) -
            (totalExpensesAllTime._sum.amount || 0) -
            (totalHandoversAllTime._sum.amount || 0);

        // ================= RESPONSE =================
        res.json({
            success: true,
            data: {
                sales: {
                    total: totalSales,
                    totalAmount: netSalesAmount,
                    totalProfit: netProfit,
                    netRevenueAfterHandover: netRevenueAfterHandover, // Təslim edildikdən sonra qalan gəlir
                    today: {
                        count: todaySales,
                        amount: todayNetAmount,
                        profit: todayNetProfit,
                        netRevenueAfterHandover: todayNetRevenueAfterHandover // Bu günkü təslim edildikdən sonra qalan
                    }
                },
                returns: {
                    total: totalReturns,
                    totalAmount: returnsAggregation._sum.totalAmount || 0,
                    returnedAmount: returnsAggregation._sum.returnedAmount || 0,
                    today: {
                        returnedAmount: todayReturnsAggregation._sum.returnedAmount || 0
                    }
                },
                products: {
                    total: totalProducts,
                    active: activeProducts,
                    totalStock: stockAggregation._sum.stock || 0,
                    deleted: { total: deletedProducts, soft: softDeletedProducts, hard: hardDeletedProducts, archived: archivedProducts }
                },
                staff: { total: totalStaff, active: activeStaff },
                expenses: { totalAmount: expensesAggregation._sum.amount || 0, today: { amount: todayExpensesAggregation._sum.amount || 0 } },
                cashHandover: { total: cashHandoverAggregation._count || 0, totalAmount: cashHandoverAggregation._sum.amount || 0, today: { count: todayCashHandoverAggregation._count || 0, amount: todayCashHandoverAggregation._sum.amount || 0 } },
                credits: {
                    total: totalCreditSales,
                    totalAmount: creditSalesAggregation._sum.creditTotalAmount || 0,
                    paidAmount: totalCreditPaid,
                    remainingAmount: creditSalesAggregation._sum.creditRemainingAmount || 0,
                    active: activeCredits,
                    today: {
                        count: todayCreditSales,
                        amount: todayCreditSalesAggregation._sum.creditTotalAmount || 0,
                        paidAmount: (todayCreditSalesAggregation._sum.creditTotalAmount || 0) - (todayCreditSalesAggregation._sum.creditRemainingAmount || 0),
                        remainingAmount: todayCreditSalesAggregation._sum.creditRemainingAmount || 0
                    }
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

