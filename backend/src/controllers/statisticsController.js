import prisma from '../lib/prisma.js';
import { Prisma } from '@prisma/client';

// Ümumi statistika (Dashboard üçün)
export const getOverallStatistics = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        
        // Date filter üçün where condition
        let dateFilter = {};
        if (startDate && endDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            dateFilter = {
                createdAt: {
                    gte: start,
                    lte: end
                }
            };
        }

        // Ümumi satışlar
        const totalSales = await prisma.sale.count({
            where: {
                isRefunded: false,
                ...dateFilter
            }
        });

        const salesAggregation = await prisma.sale.aggregate({
            where: {
                isRefunded: false,
                ...dateFilter
            },
            _sum: {
                totalAmount: true,
                profitAmount: true
            }
        });

        // Ümumi qaytarmalar
        const totalReturns = await prisma.saleReturn.count({
            where: dateFilter
        });

        const returnsAggregation = await prisma.saleReturn.aggregate({
            where: dateFilter,
            _sum: {
                totalAmount: true,
                returnedAmount: true
            }
        });

        // Ümumi məhsullar
        const totalProducts = await prisma.product.count();
        const activeProducts = await prisma.product.count({
            where: {
                isActive: true
            }
        });

        const stockAggregation = await prisma.product.aggregate({
            where: {
                isActive: true
            },
            _sum: {
                stock: true
            }
        });

        // Ümumi işçilər
        const totalStaff = await prisma.staff.count();
        const activeStaff = await prisma.staff.count({
            where: {
                isActive: true
            }
        });

        // Ümumi xərclər
        let expenseDateFilter = {};
        if (startDate && endDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            expenseDateFilter = {
                date: {
                    gte: start,
                    lte: end
                }
            };
        }

        const expensesAggregation = await prisma.expense.aggregate({
            where: expenseDateFilter,
            _sum: {
                amount: true
            }
        });

        // Ümumi məbləğ təslimi (Cash Handover)
        let cashHandoverDateFilter = {};
        if (startDate && endDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            cashHandoverDateFilter = {
                date: {
                    gte: start,
                    lte: end
                }
            };
        }

        const cashHandoverAggregation = await prisma.cashHandover.aggregate({
            where: cashHandoverDateFilter,
            _sum: {
                amount: true
            },
            _count: true
        });

        // Bu günkü satışlar (yalnız date filter yoxdursa)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        let todaySales = 0;
        let todaySalesAggregation = { _sum: { totalAmount: 0, profitAmount: 0 } };
        let todayReturns = 0;
        let todayReturnsAggregation = { _sum: { totalAmount: 0, returnedAmount: 0 } };
        let todayExpensesAggregation = { _sum: { amount: 0 } };
        let todayCashHandoverAggregation = { _sum: { amount: 0 }, _count: 0 };

        if (!startDate || !endDate) {
            todaySales = await prisma.sale.count({
                where: {
                    isRefunded: false,
                    createdAt: {
                        gte: today,
                        lt: tomorrow
                    }
                }
            });

            todaySalesAggregation = await prisma.sale.aggregate({
                where: {
                    isRefunded: false,
                    createdAt: {
                        gte: today,
                        lt: tomorrow
                    }
                },
                _sum: {
                    totalAmount: true,
                    profitAmount: true
                }
            });

            // Bu günkü qaytarmalar
            todayReturns = await prisma.saleReturn.count({
                where: {
                    createdAt: {
                        gte: today,
                        lt: tomorrow
                    }
                }
            });

            todayReturnsAggregation = await prisma.saleReturn.aggregate({
                where: {
                    createdAt: {
                        gte: today,
                        lt: tomorrow
                    }
                },
                _sum: {
                    totalAmount: true,
                    returnedAmount: true
                }
            });

            // Bu günkü xərclər
            todayExpensesAggregation = await prisma.expense.aggregate({
                where: {
                    date: {
                        gte: today,
                        lt: tomorrow
                    }
                },
                _sum: {
                    amount: true
                }
            });

            // Bu günkü məbləğ təslimi
            todayCashHandoverAggregation = await prisma.cashHandover.aggregate({
                where: {
                    date: {
                        gte: today,
                        lt: tomorrow
                    }
                },
                _sum: {
                    amount: true
                },
                _count: true
            });
        }

        res.json({
            success: true,
            data: {
                sales: {
                    total: totalSales,
                    totalAmount: salesAggregation._sum.totalAmount || 0,
                    totalProfit: salesAggregation._sum.profitAmount || 0,
                    today: {
                        count: todaySales,
                        amount: todaySalesAggregation._sum.totalAmount || 0,
                        profit: todaySalesAggregation._sum.profitAmount || 0
                    }
                },
                returns: {
                    total: totalReturns,
                    totalAmount: returnsAggregation._sum.totalAmount || 0,
                    returnedAmount: returnsAggregation._sum.returnedAmount || 0,
                    today: {
                        count: todayReturns,
                        amount: todayReturnsAggregation._sum.totalAmount || 0,
                        returnedAmount: todayReturnsAggregation._sum.returnedAmount || 0
                    }
                },
                products: {
                    total: totalProducts,
                    active: activeProducts,
                    totalStock: stockAggregation._sum.stock || 0
                },
                staff: {
                    total: totalStaff,
                    active: activeStaff
                },
                expenses: {
                    totalAmount: expensesAggregation._sum.amount || 0,
                    today: {
                        amount: todayExpensesAggregation._sum.amount || 0
                    }
                },
                cashHandover: {
                    total: cashHandoverAggregation._count || 0,
                    totalAmount: cashHandoverAggregation._sum.amount || 0,
                    today: {
                        count: todayCashHandoverAggregation._count || 0,
                        amount: todayCashHandoverAggregation._sum.amount || 0
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error fetching overall statistics:', error);
        res.status(500).json({
            success: false,
            message: 'Statistika məlumatları alınarkən xəta baş verdi',
            error: error.message
        });
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

        // Satışlar
        const sales = await prisma.sale.findMany({
            where: {
                isRefunded: false,
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

        // Qaytarmalar
        const returns = await prisma.saleReturn.findMany({
            where: {
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

        const returnsAggregation = await prisma.saleReturn.aggregate({
            where: {
                createdAt: {
                    gte: start,
                    lte: end
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

            const returnsAggregation = await prisma.saleReturn.aggregate({
                where: {
                    createdAt: {
                        gte: currentDate,
                        lt: nextDate
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
        const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
        const endDate = req.query.endDate ? new Date(req.query.endDate) : null;

        let whereClause = {
            sale: {
                isRefunded: false
            }
        };

        if (startDate && endDate) {
            endDate.setHours(23, 59, 59, 999);
            whereClause.sale.createdAt = {
                gte: startDate,
                lte: endDate
            };
        }

        const topProducts = await prisma.saleItem.groupBy({
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
                }
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
        const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
        const endDate = req.query.endDate ? new Date(req.query.endDate) : null;

        let whereClause = {
            isRefunded: false
        };

        if (startDate && endDate) {
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
        const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
        const endDate = req.query.endDate ? new Date(req.query.endDate) : null;

        let whereClause = {
            isRefunded: false
        };

        if (startDate && endDate) {
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

