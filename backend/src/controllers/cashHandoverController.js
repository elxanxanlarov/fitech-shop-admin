import prisma from "../lib/prisma.js";
import { createActivityLog } from "./activityLogController.js";

// Bütün məbləğ təslimlərini gətir
export const getAllCashHandovers = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        
        const where = {};
        
        // Tarix filter
        if (startDate || endDate) {
            where.date = {};
            if (startDate) {
                const start = new Date(startDate);
                start.setHours(0, 0, 0, 0);
                where.date.gte = start;
            }
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                where.date.lte = end;
            }
        }
        
        const cashHandovers = await prisma.cashHandover.findMany({
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
        
        const cashHandover = await prisma.cashHandover.findUnique({
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
        const { date, amount, handedOverToId, handedOverById, note } = req.body;
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
        let handoverDate = date ? new Date(date) : new Date();
        handoverDate.setHours(0, 0, 0, 0);

        const cashHandover = await prisma.cashHandover.create({
            data: {
                date: handoverDate,
                amount: parseFloat(amount),
                handedOverToId,
                handedOverById,
                note: note || null
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
        const { date, amount, handedOverToId, handedOverById, note } = req.body;
        const staffId = req.user?.id;

        // Məbləğ təsliminin mövcud olduğunu yoxla
        const existingCashHandover = await prisma.cashHandover.findUnique({
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
        let handoverDate = date ? new Date(date) : existingCashHandover.date;
        if (date) {
            handoverDate.setHours(0, 0, 0, 0);
        }

        const updateData = {};
        if (date !== undefined) updateData.date = handoverDate;
        if (amount !== undefined) updateData.amount = parseFloat(amount);
        if (handedOverToId !== undefined) updateData.handedOverToId = handedOverToId;
        if (handedOverById !== undefined) updateData.handedOverById = handedOverById;
        if (note !== undefined) updateData.note = note || null;

        const cashHandover = await prisma.cashHandover.update({
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
        const staffId = req.user?.id;

        // Məbləğ təsliminin mövcud olduğunu yoxla
        const cashHandover = await prisma.cashHandover.findUnique({
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

        await prisma.cashHandover.delete({
            where: { id }
        });

        // Activity log
        await createActivityLog({
            staffId: staffId || cashHandover.handedOverById,
            entityType: "CashHandover",
            entityId: id,
            action: "DELETE",
            description: `Məbləğ təslimi silindi (${cashHandover.amount} AZN)`
        });

        return res.status(200).json({
            success: true,
            message: "Məbləğ təslimi uğurla silindi"
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

