import prisma from "../lib/prisma.js";
import { createActivityLog } from "./activityLogController.js";
import { computeCashboxBalance, buildBranchFilter } from "../services/cashboxService.js";

// Bütün məbləğ təslimlərini gətir
export const getAllCashHandovers = async (req, res) => {
    try {
        const { startDate, endDate, deleteType, includeDeleted, branchId } = req.query;
        
        const where = {};
        
        // DeleteType filter - default olaraq yalnız silinməyən məbləğ təslimlərini göstər
        if (includeDeleted === 'true') {
            // Bütün məbləğ təslimlərini göstər (silinmişlər də daxil)
        } else if (deleteType) {
            where.deleteType = deleteType.toUpperCase();
        } else {
            // Default: yalnız silinməyən məbləğ təslimlərini göstər
            where.deleteType = 'NONE';
        }
        
        // Tarix filter
        if (startDate || endDate) {
            where.date = {};
            if (startDate) {
                const [year, month, day] = startDate.split('-').map(Number);
                const start = new Date(year, month - 1, day, 0, 0, 0, 0);
                where.date.gte = start;
            }
            if (endDate) {
                const [year, month, day] = endDate.split('-').map(Number);
                const end = new Date(year, month - 1, day, 23, 59, 59, 999);
                where.date.lte = end;
            }
        }

        // Branch filter
        if (branchId === 'central') {
            where.branchId = null;
        } else if (branchId) {
            where.branchId = branchId;
        }
        
        const cashHandovers = await prisma.cashhandover.findMany({
            where,
            include: {
                handedOverTo: {
                    select: {
                        id: true,
                        name: true,
                        surName: true,
                        email: true
                    }
                },
                handedOverBy: {
                    select: {
                        id: true,
                        name: true,
                        surName: true,
                        email: true
                    }
                }
            },
            orderBy: {
                date: 'desc'
            }
        });

        return res.status(200).json({
            success: true,
            date: cashHandovers,
        });
    } catch (error) {
        console.error("getAllCashHandovers error", error);
        return res.status(500).json({
            success: false,
            message: "Məbləğ təslimləri alınarkən xəta baş verdi",
            error: error.message
        });
    }
};

// ID-yə görə məbləğ təslimini gətir
export const getCashHandoverById = async (req, res) => {
    try {
        const { id } = req.params;
        
        const cashHandover = await prisma.cashhandover.findUnique({
            where: { id },
            include: {
                handedOverTo: {
                    select: {
                        id: true,
                        name: true,
                        surName: true,
                        email: true
                    }
                },
                handedOverBy: {
                    select: {
                        id: true,
                        name: true,
                        surName: true,
                        email: true
                    }
                }
            }
        });

        if (!cashHandover) {
            return res.status(404).json({
                success: false,
                message: "Məbləğ təslimi tapılmadı"
            });
        }

        return res.status(200).json({
            success: true,
            date: cashHandover,
        });
    } catch (error) {
        console.error("getCashHandoverById error", error);
        return res.status(500).json({
            success: false,
            message: "Məbləğ təslimi alınarkən xəta baş verdi",
            error: error.message
        });
    }
};

// Yeni məbləğ təslimi yarat
export const createCashHandover = async (req, res) => {
    try {
        const { date, amount, handedOverToId, handedOverById, note, branchId } = req.body;
        const staffId = req.user?.id;

        // Validation
        if (!amount || amount <= 0) {
            return res.status(400).json({
                success: false,
                message: "Məbləğ düzgün daxil edilməyib"
            });
        }

        if (!handedOverToId) {
            return res.status(400).json({
                success: false,
                message: "Kimə təslim edildiyi göstərilməyib"
            });
        }

        if (!handedOverById) {
            return res.status(400).json({
                success: false,
                message: "Kim təslim etdiyi göstərilməyib"
            });
        }

        // Staff-lərin mövcud olduğunu yoxla
        const handedOverTo = await prisma.staff.findUnique({
            where: { id: handedOverToId }
        });

        if (!handedOverTo) {
            return res.status(404).json({
                success: false,
                message: "Təslim edilən işçi tapılmadı"
            });
        }

        const handedOverBy = await prisma.staff.findUnique({
            where: { id: handedOverById }
        });

        if (!handedOverBy) {
            return res.status(404).json({
                success: false,
                message: "Təslim edən işçi tapılmadı"
            });
        }

        // Tarix təyin et
        let handoverDate;
        if (date) {
            if (typeof date === 'string' && date.includes('-') && !date.includes('T')) {
                const [y, m, d] = date.split('-').map(Number);
                handoverDate = new Date(y, m - 1, d, 0, 0, 0, 0);
            } else {
                handoverDate = new Date(date);
                handoverDate.setHours(0, 0, 0, 0);
            }
        } else {
            handoverDate = new Date();
            handoverDate.setHours(0, 0, 0, 0);
        }

        const branchFilter = buildBranchFilter(branchId);

        // Kəssa balasnı hesabla (vahid service ilə)
        const cashbox = await computeCashboxBalance(branchFilter);
        const totalAvailableAllTime = cashbox.balance;

        const roundedTotalAvailable = Math.round(totalAvailableAllTime * 100) / 100;
        const roundedAmount = Math.round(parseFloat(amount) * 100) / 100;

        // Validation against total available all time
        if (roundedAmount > (roundedTotalAvailable + 0.01)) {
            return res.status(400).json({
                success: false,
                message: `Ümumi təslim edilməmiş gəlir (${roundedTotalAvailable.toFixed(2)} AZN) məbləğindən çox təslim edə bilməzsiniz`,
                availableRevenue: roundedTotalAvailable
            });
        }

        const cashHandover = await prisma.cashhandover.create({
            data: {
                date: handoverDate,
                amount: parseFloat(amount),
                handedOverToId,
                handedOverById,
                note: note || null,
                branchId: (branchId && branchId !== 'central') ? branchId : null
            },
            include: {
                handedOverTo: {
                    select: {
                        id: true,
                        name: true,
                        surName: true,
                        email: true
                    }
                },
                handedOverBy: {
                    select: {
                        id: true,
                        name: true,
                        surName: true,
                        email: true
                    }
                }
            }
        });

        // Activity log
        await createActivityLog({
            staffId: staffId || handedOverById,
            entityType: "CashHandover",
            entityId: cashHandover.id,
            action: "CREATE",
            description: `${handedOverBy.name} ${handedOverTo.name} adlı işçiyə ${amount} AZN məbləğ təslim etdi`
        });

        return res.status(201).json({
            success: true,
            date: cashHandover,
            message: "Məbləğ təslimi uğurla yaradıldı"
        });
    } catch (error) {
        console.error("createCashHandover error", error);
        return res.status(500).json({
            success: false,
            message: "Məbləğ təslimi yaradılarkən xəta baş verdi",
            error: error.message
        });
    }
};

// Məbləğ təslimini yenilə
export const updateCashHandover = async (req, res) => {
    try {
        const { id } = req.params;
        const { date, amount, handedOverToId, handedOverById, note, branchId } = req.body;
        const staffId = req.user?.id;

        // Məbləğ təsliminin mövcud olduğunu yoxla
        const existingCashHandover = await prisma.cashhandover.findUnique({
            where: { id }
        });

        if (!existingCashHandover) {
            return res.status(404).json({
                success: false,
                message: "Məbləğ təslimi tapılmadı"
            });
        }

        // Validation
        if (amount !== undefined && amount <= 0) {
            return res.status(400).json({
                success: false,
                message: "Məbləğ düzgün daxil edilməyib"
            });
        }

        // Staff-lərin mövcud olduğunu yoxla
        if (handedOverToId) {
            const handedOverTo = await prisma.staff.findUnique({
                where: { id: handedOverToId }
            });

            if (!handedOverTo) {
                return res.status(404).json({
                    success: false,
                    message: "Təslim edilən işçi tapılmadı"
                });
            }
        }

        if (handedOverById) {
            const handedOverBy = await prisma.staff.findUnique({
                where: { id: handedOverById }
            });

            if (!handedOverBy) {
                return res.status(404).json({
                    success: false,
                    message: "Təslim edən işçi tapılmadı"
                });
            }
        }

        // Tarix təyin et
        let handoverDate;
        if (date) {
            if (typeof date === 'string' && date.includes('-') && !date.includes('T')) {
                const [y, m, d] = date.split('-').map(Number);
                handoverDate = new Date(y, m - 1, d, 0, 0, 0, 0);
            } else {
                handoverDate = new Date(date);
                handoverDate.setHours(0, 0, 0, 0);
            }
        } else {
            handoverDate = new Date(existingCashHandover.date);
            handoverDate.setHours(0, 0, 0, 0);
        }

        // Əgər məbləğ və ya tarix dəyişirsə, ümumi gəliri yoxla
        if (amount !== undefined || date !== undefined) {
            const updateBranchFilter = buildBranchFilter(
                currentBranchId && currentBranchId !== 'central' ? currentBranchId : 
                (existingCashHandover.branchId === null ? 'central' : undefined)
            );

            // Kəssa balasnı hesabla (cari id xaric) — vahid service ilə
            const cashbox = await computeCashboxBalance(updateBranchFilter, { excludeHandoverId: id });
            const totalAvailableAllTime = cashbox.balance;


            const roundedTotalAvailable = Math.round(totalAvailableAllTime * 100) / 100;
            const roundedAmount = Math.round((amount !== undefined ? parseFloat(amount) : parseFloat(existingCashHandover.amount)) * 100) / 100;

            if (roundedAmount > (roundedTotalAvailable + 0.01)) {
                return res.status(400).json({
                    success: false,
                    message: `Ümumi təslim edilməmiş gəlir (${roundedTotalAvailable.toFixed(2)} AZN) məbləğindən çox təslim edə bilməzsiniz`,
                    availableRevenue: roundedTotalAvailable
                });
            }
        }

        const updateData = {};
        if (date !== undefined) updateData.date = handoverDate;
        if (amount !== undefined) updateData.amount = parseFloat(amount);
        if (handedOverToId !== undefined) updateData.handedOverToId = handedOverToId;
        if (handedOverById !== undefined) updateData.handedOverById = handedOverById;
        if (note !== undefined) updateData.note = note || null;
        if (branchId !== undefined) updateData.branchId = (branchId && branchId !== 'central') ? branchId : null;

        const cashHandover = await prisma.cashhandover.update({
            where: { id },
            data: updateData,
            include: {
                handedOverTo: {
                    select: {
                        id: true,
                        name: true,
                        surName: true,
                        email: true
                    }
                },
                handedOverBy: {
                    select: {
                        id: true,
                        name: true,
                        surName: true,
                        email: true
                    }
                }
            }
        });

        // Activity log
        await createActivityLog({
            staffId: staffId || cashHandover.handedOverById,
            entityType: "CashHandover",
            entityId: cashHandover.id,
            action: "UPDATE",
            description: "Məbləğ təslimi məlumatları yeniləndi"
        });

        return res.status(200).json({
            success: true,
            date: cashHandover,
            message: "Məbləğ təslimi uğurla yeniləndi"
        });
    } catch (error) {
        console.error("updateCashHandover error", error);
        return res.status(500).json({
            success: false,
            message: "Məbləğ təslimi yenilənərkən xəta baş verdi",
            error: error.message
        });
    }
};

// Məbləğ təslimini sil
export const deleteCashHandover = async (req, res) => {
    try {
        const { id } = req.params;
        const { deleteType = 'SOFT' } = req.body; // Default: SOFT delete
        const staffId = req.user?.id || req.staffId;
        
        // Ensure deleteType is valid
        const validDeleteType = (deleteType && typeof deleteType === 'string' && deleteType.toUpperCase() === 'HARD') ? 'HARD' : 'SOFT';

        // Məbləğ təsliminin mövcud olduğunu yoxla
        const cashHandover = await prisma.cashhandover.findUnique({
            where: { id },
            include: {
                handedOverTo: {
                    select: {
                        name: true,
                        surName: true
                    }
                },
                handedOverBy: {
                    select: {
                        name: true,
                        surName: true
                    }
                }
            }
        });

        if (!cashHandover) {
            return res.status(404).json({
                success: false,
                message: "Məbləğ təslimi tapılmadı"
            });
        }

        // DeleteType-a görə silmə
        if (validDeleteType === 'HARD') {
            // Hard delete - məbləğ təslimini tamamilə sil
            await prisma.cashhandover.delete({
                where: { id }
            });

            // Activity log
            try {
                await createActivityLog({
                    staffId: staffId || cashHandover.handedOverById,
                    entityType: "CashHandover",
                    entityId: id,
                    action: "HARD_DELETE",
                    description: `Məbləğ təslimi tamamilə silindi (${cashHandover.amount} AZN)`,
                    changes: {
                        amount: cashHandover.amount.toString(),
                        date: cashHandover.date,
                        note: cashHandover.note
                    }
                });
            } catch (logError) {
                console.error("Activity log yaradılarkən xəta:", logError);
            }
        } else {
            // Soft delete - deleteType-u dəyiş
            await prisma.cashhandover.update({
                where: { id },
                data: {
                    deleteType: 'SOFT'
                }
            });

            // Activity log
            try {
                await createActivityLog({
                    staffId: staffId || cashHandover.handedOverById,
                    entityType: "CashHandover",
                    entityId: id,
                    action: "SOFT_DELETE",
                    description: `Məbləğ təslimi soft delete edildi (${cashHandover.amount} AZN)`,
                    changes: {
                        amount: cashHandover.amount.toString(),
                        date: cashHandover.date,
                        note: cashHandover.note,
                        deleteType: 'SOFT'
                    }
                });
            } catch (logError) {
                console.error("Activity log yaradılarkən xəta:", logError);
            }
        }

        return res.status(200).json({
            success: true,
            message: validDeleteType === 'HARD' ? "Məbləğ təslimi tamamilə silindi" : "Məbləğ təslimi soft delete edildi"
        });
    } catch (error) {
        console.error("deleteCashHandover error", error);
        return res.status(500).json({
            success: false,
            message: "Məbləğ təslimi silinərkən xəta baş verdi",
            error: error.message
        });
    }
};

// Seçilən tarixə görə mövcud gəliri əldə et (təslim üçün)
export const getAvailableRevenueByDate = async (req, res) => {
    try {
        const { date, excludeId, branchId } = req.query;
        
        if (!date) {
            return res.status(400).json({
                success: false,
                message: "Tarix tələb olunur"
            });
        }

        // Tarixi təyin et
        let selectedDate;
        if (typeof date === 'string' && date.includes('-') && !date.includes('T')) {
            const [y, m, d] = date.split('-').map(Number);
            selectedDate = new Date(y, m - 1, d, 0, 0, 0, 0);
        } else {
            selectedDate = new Date(date);
            selectedDate.setHours(0, 0, 0, 0);
        }
        const nextDate = new Date(selectedDate);
        nextDate.setDate(nextDate.getDate() + 1);

        let currentBranchFilter = {};
        let saleBranchFilter = {};
        if (branchId && branchId !== 'central') {
            currentBranchFilter = { branchId };
            saleBranchFilter = { branchId };
        } else if (branchId === 'central') {
            currentBranchFilter = { branchId: null };
            saleBranchFilter = { branchId: null };
        }

        // Həmin günün satışlarını hesabla (Nəğd)
        const salesAggregation = await prisma.sale.aggregate({
            where: {
                deleteType: 'NONE',
                paymentType: 'cash',
                ...saleBranchFilter,
                createdAt: {
                    gte: selectedDate,
                    lt: nextDate
                }
            },
            _sum: {
                paidAmount: true,
                profitAmount: true
            }
        });

        // Həmin günün kredit ödənişlərini hesabla (Nəğd)
        const creditPaymentsAggregation = await prisma.creditpayment.aggregate({
            where: {
                paymentType: 'cash',
                sale: saleBranchFilter,
                paymentDate: {
                    gte: selectedDate,
                    lt: nextDate
                }
            },
            _sum: {
                amount: true
            }
        });

        // Həmin günün qaytarmalarını hesabla
        const returnsAggregation = await prisma.salereturn.aggregate({
            where: {
                createdAt: {
                    gte: selectedDate,
                    lt: nextDate
                },
                sale: {
                    deleteType: 'NONE',
                    paymentType: 'cash',
                    ...saleBranchFilter
                }
            },
            _sum: {
                returnedAmount: true
            }
        });

        // Həmin günün xərclərini hesabla
        const expensesAggregation = await prisma.expense.aggregate({
            where: {
                deleteType: 'NONE',
                ...currentBranchFilter,
                date: {
                    gte: selectedDate,
                    lt: nextDate
                }
            },
            _sum: {
                amount: true
            }
        });

        // Həmin günün artıq təslim edilmiş məbləğlərini hesabla
        const cashHandoverWhere = {
            date: {
                gte: selectedDate,
                lt: nextDate
            },
            deleteType: 'NONE',
            ...currentBranchFilter
        };

        // Əgər edit modundadırsa, cari cash handover-i çıxar
        if (excludeId) {
            cashHandoverWhere.id = {
                not: excludeId
            };
        }

        const cashHandoverAggregation = await prisma.cashhandover.aggregate({
            where: cashHandoverWhere,
            _sum: {
                amount: true
            }
        });

        // Hesablamalar
        const totalSalesCash = parseFloat(salesAggregation._sum.paidAmount || 0);
        const totalCreditCash = parseFloat(creditPaymentsAggregation._sum.amount || 0);
        const totalInflow = totalSalesCash + totalCreditCash;
        
        const totalReturns = parseFloat(returnsAggregation._sum.returnedAmount || 0);
        const totalExpenses = parseFloat(expensesAggregation._sum.amount || 0);
        const totalOutflow = totalReturns + totalExpenses;
        
        const totalHandedOver = parseFloat(cashHandoverAggregation._sum.amount || 0);
        
        // Xalis gəlir (nəğd)
        const netRevenue = totalInflow - totalOutflow;
        
        // Mövcud gəlir (artıq təslim edilənlər çıxıldıqdan sonra)
        const availableRevenue = netRevenue - totalHandedOver;

        return res.status(200).json({
            success: true,
            data: {
                date: selectedDate,
                totalRevenue: totalInflow,
                totalReturns: totalReturns,
                totalExpenses: totalExpenses,
                netRevenue: netRevenue,
                totalHandedOver: totalHandedOver,
                availableRevenue: Math.max(0, parseFloat((availableRevenue).toFixed(2))), // Mənfi ola bilməz və yuvarlaqlaşdır
                profit: parseFloat(salesAggregation._sum.profitAmount || 0)
            }
        });
    } catch (error) {
        console.error("getAvailableRevenueByDate error", error);
        return res.status(500).json({
            success: false,
            message: "Gəlir məlumatları alınarkən xəta baş verdi",
            error: error.message
        });
    }
};

// Təslim edilməmiş (payout gözləyən) tarixləri gətir
export const getPayoutPendingDates = async (req, res) => {
    try {
        const { branchId } = req.query;
        // branchId yoxdursa => hamısı (bütün filiallar)
        // branchId === 'central' => yalnız filialsız (null)
        // branchId => konkret filial
        let currentBranchFilter = {};
        let saleBranchFilter = {};
        if (branchId && branchId !== 'central') {
            currentBranchFilter = { branchId };
            saleBranchFilter = { branchId };
        } else if (branchId === 'central') {
            currentBranchFilter = { branchId: null };
            saleBranchFilter = { branchId: null };
        }
        // branchId yoxdursa: {} = bütün filiallar (statistika ilə eyni)
        // Son 180 günü yoxlayaq (təxminən 6 ay)
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 180);
        startDate.setHours(0, 0, 0, 0);

        // Satışları gətir (Nəğd)
        const sales = await prisma.sale.findMany({
            where: {
                deleteType: 'NONE',
                isRefunded: false,
                paymentType: 'cash',
                ...saleBranchFilter,
                createdAt: {
                    gte: startDate
                }
            },
            select: {
                paidAmount: true,
                createdAt: true
            }
        });

        // Kredit ödənişlərini gətir (Nəğd)
        const creditPayments = await prisma.creditpayment.findMany({
            where: {
                paymentType: 'cash',
                sale: saleBranchFilter,
                paymentDate: {
                    gte: startDate
                }
            },
            select: {
                amount: true,
                paymentDate: true
            }
        });

        // Qaytarmaları gətir
        const returns = await prisma.salereturn.findMany({
            where: {
                createdAt: {
                    gte: startDate
                },
                sale: {
                    deleteType: 'NONE',
                    paymentType: 'cash',
                    ...saleBranchFilter
                }
            },
            select: {
                returnedAmount: true,
                createdAt: true
            }
        });

        // Xərcləri gətir
        const expenses = await prisma.expense.findMany({
            where: {
                deleteType: 'NONE',
                ...currentBranchFilter,
                date: {
                    gte: startDate
                }
            },
            select: {
                amount: true,
                date: true
            }
        });

        // Artıq edilmiş təslimləri gətir
        const handovers = await prisma.cashhandover.findMany({
            where: {
                deleteType: 'NONE',
                ...currentBranchFilter,
                date: {
                    gte: startDate
                }
            },
            select: {
                amount: true,
                date: true
            }
        });

        const dailyData = {};
        
        // Helper to get local date string YYYY-MM-DD
        const getLocalDateStr = (d) => {
            const date = new Date(d);
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
        };

        // Satışları günlərə böl
        sales.forEach(sale => {
            const dateStr = getLocalDateStr(sale.createdAt);
            if (!dailyData[dateStr]) dailyData[dateStr] = { totalRevenue: 0, totalReturns: 0, totalExpenses: 0, totalHandedOver: 0 };
            dailyData[dateStr].totalRevenue += parseFloat(sale.paidAmount);
        });

        // Kredit ödənişlərini günlərə böl
        creditPayments.forEach(cp => {
            const dateStr = getLocalDateStr(cp.paymentDate);
            if (!dailyData[dateStr]) dailyData[dateStr] = { totalRevenue: 0, totalReturns: 0, totalExpenses: 0, totalHandedOver: 0 };
            dailyData[dateStr].totalRevenue += parseFloat(cp.amount);
        });

        // Qaytarmaları günlərə böl
        returns.forEach(ret => {
            const dateStr = getLocalDateStr(ret.createdAt);
            if (!dailyData[dateStr]) dailyData[dateStr] = { totalRevenue: 0, totalReturns: 0, totalExpenses: 0, totalHandedOver: 0 };
            dailyData[dateStr].totalReturns += parseFloat(ret.returnedAmount);
        });

        // Xərcləri günlərə böl
        expenses.forEach(exp => {
            const dateStr = getLocalDateStr(exp.date);
            if (!dailyData[dateStr]) dailyData[dateStr] = { totalRevenue: 0, totalReturns: 0, totalExpenses: 0, totalHandedOver: 0 };
            dailyData[dateStr].totalExpenses += parseFloat(exp.amount);
        });

        // Təslimləri günlərə böl
        handovers.forEach(h => {
            const dateStr = getLocalDateStr(h.date);
            if (!dailyData[dateStr]) dailyData[dateStr] = { totalRevenue: 0, totalReturns: 0, totalExpenses: 0, totalHandedOver: 0 };
            dailyData[dateStr].totalHandedOver += parseFloat(h.amount);
        });

        const pendingDates = Object.keys(dailyData)
            .map(date => {
                const data = dailyData[date];
                const availableRevenue = data.totalRevenue - data.totalReturns - data.totalExpenses - data.totalHandedOver;
                return {
                    date,
                    ...data,
                    availableRevenue: parseFloat(availableRevenue.toFixed(2))
                };
            })
            .filter(item => item.availableRevenue > 0.01) // Keep showing individual positive days
            .sort((a, b) => b.date.localeCompare(a.date));

        // K\u0259ssa balans\u0131n\u0131 vahid service il\u0259 hesabla
        const allTimeResult = await computeCashboxBalance(currentBranchFilter);

        return res.status(200).json({
            success: true,
            data: pendingDates,
            totalAvailable: Math.max(0, allTimeResult.balance),
            breakdown: {
                cashIn:    allTimeResult.cashIn,
                cashOut:   allTimeResult.cashOut,
                sales:     allTimeResult.cashSales,
                credits:   allTimeResult.creditPayments,
                returns:   allTimeResult.returns,
                expenses:  allTimeResult.expenses,
                handovers: allTimeResult.handovers,
                netBalance: allTimeResult.balance,
            }
        });
    } catch (error) {
        console.error("getPayoutPendingDates error", error);
        return res.status(500).json({
            success: false,
            message: "Təslim edilməmiş günlərin siyahısı alınarkən xəta baş verdi",
            error: error.message
        });
    }
};

