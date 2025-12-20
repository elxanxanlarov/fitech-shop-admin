import prisma from "../lib/prisma.js";
import { createActivityLog } from "./activityLogController.js";

// Bütün məbləğ təslimlərini gətir
export const getAllCashHandovers = async (req, res) => {
    try {
        const { startDate, endDate, deleteType, includeDeleted } = req.query;
        
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
        const { deleteType = 'SOFT' } = req.body; // Default: SOFT delete
        const staffId = req.user?.id || req.staffId;
        
        // Ensure deleteType is valid
        const validDeleteType = (deleteType && typeof deleteType === 'string' && deleteType.toUpperCase() === 'HARD') ? 'HARD' : 'SOFT';

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

        // DeleteType-a görə silmə
        if (validDeleteType === 'HARD') {
            // Hard delete - məbləğ təslimini tamamilə sil
            await prisma.cashHandover.delete({
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
            await prisma.cashHandover.update({
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

