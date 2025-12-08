import prisma from "../lib/prisma.js";
import { createActivityLog } from "./activityLogController.js";

// Bütün xərcləri gətir
export const getAllExpenses = async (req, res) => {
    try {
        const { startDate, endDate, category } = req.query;
        
        const where = {};
        
        // Tarix filter
        if (startDate || endDate) {
            where.date = {};
            if (startDate) {
                where.date.gte = new Date(startDate);
            }
            if (endDate) {
                where.date.lte = new Date(endDate);
            }
        }
        
        // Kateqoriya filter
        if (category) {
            where.category = category;
        }
        
        const expenses = await prisma.expense.findMany({
            where,
            include: {
                staff: {
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
            date: expenses,
        });
    } catch (error) {
        console.error("getAllExpenses error", error);
        return res.status(500).json({
            success: false,
            message: "Xərclər alınarkən xəta baş verdi"
        });
    }
};

// Xərc ID-yə görə gətir
export const getExpenseById = async (req, res) => {
    try {
        const { id } = req.params;
        const expense = await prisma.expense.findUnique({
            where: { id },
            include: {
                staff: {
                    select: {
                        id: true,
                        name: true,
                        surName: true,
                        email: true
                    }
                }
            }
        });

        if (!expense) {
            return res.status(404).json({
                success: false,
                message: "Xərc tapılmadı",
            });
        }

        return res.json({
            success: true,
            date: expense,
        });
    } catch (error) {
        console.error("getExpenseById error", error);
        return res.status(500).json({
            success: false,
            message: "Xərc tapılarkən xəta baş verdi",
        });
    }
};

// Yeni xərc yarat
export const createExpense = async (req, res) => {
    try {
        const { title, description, amount, category, date, note } = req.body;

        if (!title || title.trim() === "") {
            return res.status(400).json({
                success: false,
                message: "Xərc başlığı tələb olunur"
            });
        }

        if (!amount || parseFloat(amount) <= 0) {
            return res.status(400).json({
                success: false,
                message: "Məbləğ tələb olunur və 0-dan böyük olmalıdır"
            });
        }

        const newExpense = await prisma.expense.create({
            data: {
                title: title.trim(),
                description: description?.trim() || null,
                amount: parseFloat(amount),
                category: category?.trim() || null,
                date: date ? new Date(date) : new Date(),
                note: note?.trim() || null,
                staffId: req.staffId || null,
            },
            include: {
                staff: {
                    select: {
                        id: true,
                        name: true,
                        surName: true,
                        email: true
                    }
                }
            }
        });

        // Activity log yarat
        try {
            await createActivityLog({
                staffId: req.staffId || null,
                entityType: "Expense",
                entityId: newExpense.id,
                action: "CREATE",
                description: `Yeni xərc yaradıldı: ${newExpense.title} - ${newExpense.amount} AZN`,
                changes: {
                    title: newExpense.title,
                    description: newExpense.description,
                    amount: newExpense.amount,
                    category: newExpense.category,
                    date: newExpense.date,
                    note: newExpense.note
                }
            });
        } catch (logError) {
            console.error("Activity log yaradılarkən xəta:", logError);
        }

        return res.status(201).json({
            success: true,
            message: "Xərc uğurla yaradıldı",
            date: newExpense,
        });
    } catch (error) {
        console.error("createExpense error", error);
        return res.status(500).json({
            success: false,
            message: "Xərc yaradılarkən xəta baş verdi",
        });
    }
};

// Xərci yenilə
export const updateExpense = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, amount, category, date, note } = req.body;

        // Xərcin mövcud olub olmadığını yoxla
        const existingExpense = await prisma.expense.findUnique({
            where: { id }
        });

        if (!existingExpense) {
            return res.status(404).json({
                success: false,
                message: "Xərc tapılmadı"
            });
        }

        if (title && title.trim() === "") {
            return res.status(400).json({
                success: false,
                message: "Xərc başlığı tələb olunur"
            });
        }

        if (amount && parseFloat(amount) <= 0) {
            return res.status(400).json({
                success: false,
                message: "Məbləğ 0-dan böyük olmalıdır"
            });
        }

        const oldData = {
            title: existingExpense.title,
            description: existingExpense.description,
            amount: existingExpense.amount,
            category: existingExpense.category,
            date: existingExpense.date,
            note: existingExpense.note
        };

        const updatedExpense = await prisma.expense.update({
            where: { id },
            data: {
                title: title !== undefined ? title.trim() : existingExpense.title,
                description: description !== undefined ? (description?.trim() || null) : existingExpense.description,
                amount: amount !== undefined ? parseFloat(amount) : existingExpense.amount,
                category: category !== undefined ? (category?.trim() || null) : existingExpense.category,
                date: date !== undefined ? new Date(date) : existingExpense.date,
                note: note !== undefined ? (note?.trim() || null) : existingExpense.note,
            },
            include: {
                staff: {
                    select: {
                        id: true,
                        name: true,
                        surName: true,
                        email: true
                    }
                }
            }
        });

        const newData = {
            title: updatedExpense.title,
            description: updatedExpense.description,
            amount: updatedExpense.amount,
            category: updatedExpense.category,
            date: updatedExpense.date,
            note: updatedExpense.note
        };

        // Activity log yarat
        try {
            await createActivityLog({
                staffId: req.staffId || null,
                entityType: "Expense",
                entityId: updatedExpense.id,
                action: "UPDATE",
                description: `Xərc yeniləndi: ${updatedExpense.title} - ${updatedExpense.amount} AZN`,
                changes: {
                    old: oldData,
                    new: newData
                }
            });
        } catch (logError) {
            console.error("Activity log yaradılarkən xəta:", logError);
        }

        return res.json({
            success: true,
            message: "Xərc uğurla yeniləndi",
            date: updatedExpense,
        });
    } catch (error) {
        console.error("updateExpense error", error);
        return res.status(500).json({
            success: false,
            message: "Xərc yenilənərkən xəta baş verdi",
        });
    }
};

// Xərci sil
export const deleteExpense = async (req, res) => {
    try {
        const { id } = req.params;

        // Xərcin mövcud olub olmadığını yoxla
        const existingExpense = await prisma.expense.findUnique({
            where: { id }
        });

        if (!existingExpense) {
            return res.status(404).json({
                success: false,
                message: "Xərc tapılmadı"
            });
        }

        await prisma.expense.delete({
            where: { id }
        });

        // Activity log yarat
        try {
            await createActivityLog({
                staffId: req.staffId || null,
                entityType: "Expense",
                entityId: id,
                action: "DELETE",
                description: `Xərc silindi: ${existingExpense.title} - ${existingExpense.amount} AZN`,
                changes: {
                    title: existingExpense.title,
                    description: existingExpense.description,
                    amount: existingExpense.amount,
                    category: existingExpense.category,
                    date: existingExpense.date,
                    note: existingExpense.note
                }
            });
        } catch (logError) {
            console.error("Activity log yaradılarkən xəta:", logError);
        }

        return res.json({
            success: true,
            message: "Xərc uğurla silindi",
        });
    } catch (error) {
        console.error("deleteExpense error", error);
        return res.status(500).json({
            success: false,
            message: "Xərc silinərkən xəta baş verdi",
        });
    }
};

