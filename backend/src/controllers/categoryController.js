import prisma from "../lib/prisma.js";
import { createActivityLog } from "./activityLogController.js";

// Bütün kateqoriyaları gətir
export const getAllCategories = async (req, res) => {
    try {
        const categories = await prisma.category.findMany({
            include: {
                subCategories: {
                    where: {
                        isActive: true
                    },
                    orderBy: {
                        name: 'asc'
                    }
                },
                products: {
                    select: {
                        id: true,
                        name: true,
                        isActive: true
                    },
                    orderBy: {
                        name: 'asc'
                    }
                }
            },
            orderBy: {
                name: 'asc'
            }
        });

        return res.status(200).json({
            success: true,
            date: categories,
        });
    } catch (error) {
        console.error("getAllCategories error", error);
        return res.status(500).json({
            success: false,
            message: "Kateqoriyalar alınarkən xəta baş verdi"
        });
    }
};

// Kateqoriya ID-yə görə gətir
export const getCategoryById = async (req, res) => {
    try {
        const { id } = req.params;
        const category = await prisma.category.findUnique({
            where: { id },
            include: {
                subCategories: {
                    orderBy: {
                        name: 'asc'
                    }
                },
                products: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        });

        if (!category) {
            return res.status(404).json({
                success: false,
                message: "Kateqoriya tapılmadı",
            });
        }

        return res.json({
            success: true,
            date: category,
        });
    } catch (error) {
        console.error("getCategoryById error", error);
        return res.status(500).json({
            success: false,
            message: "Kateqoriya tapılarkən xəta baş verdi",
        });
    }
};

// Yeni kateqoriya yarat
export const createCategory = async (req, res) => {
    try {
        const { name, description, isActive } = req.body;

        if (!name || name.trim() === "") {
            return res.status(400).json({
                success: false,
                message: "Kateqoriya adı tələb olunur"
            });
        }

        // Eyni adlı kateqoriyanın olub olmadığını yoxla
        const existingCategory = await prisma.category.findUnique({
            where: { name: name.trim() }
        });

        if (existingCategory) {
            return res.status(400).json({
                success: false,
                message: "Bu adlı kateqoriya artıq mövcuddur"
            });
        }

        const newCategory = await prisma.category.create({
            data: {
                name: name.trim(),
                description: description?.trim() || null,
                isActive: typeof isActive === "boolean" ? isActive : true,
            }
        });

        // Activity log yarat
        try {
            await createActivityLog({
                staffId: req.staffId || null,
                entityType: "Category",
                entityId: newCategory.id,
                action: "CREATE",
                description: `Yeni kateqoriya yaradıldı: ${newCategory.name}`,
                changes: {
                    name: newCategory.name,
                    description: newCategory.description,
                    isActive: newCategory.isActive
                }
            });
        } catch (logError) {
            console.error("Activity log yaradılarkən xəta:", logError);
        }

        return res.status(201).json({
            success: true,
            message: "Kateqoriya uğurla yaradıldı",
            date: newCategory,
        });
    } catch (error) {
        console.error("createCategory error", error);
        return res.status(500).json({
            success: false,
            message: "Kateqoriya yaradılarkən xəta baş verdi",
        });
    }
};

// Kateqoriyanı yenilə
export const updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, isActive } = req.body;

        // Kateqoriyanın mövcud olub olmadığını yoxla
        const existingCategory = await prisma.category.findUnique({
            where: { id }
        });

        if (!existingCategory) {
            return res.status(404).json({
                success: false,
                message: "Kateqoriya tapılmadı"
            });
        }

        // Əgər ad dəyişdirilirsə, yeni adın unikal olub olmadığını yoxla
        if (name && name.trim() !== existingCategory.name) {
            const duplicateCategory = await prisma.category.findUnique({
                where: { name: name.trim() }
            });

            if (duplicateCategory) {
                return res.status(400).json({
                    success: false,
                    message: "Bu adlı kateqoriya artıq mövcuddur"
                });
            }
        }

        const oldData = {
            name: existingCategory.name,
            description: existingCategory.description,
            isActive: existingCategory.isActive
        };

        const updatedCategory = await prisma.category.update({
            where: { id },
            data: {
                name: name ? name.trim() : existingCategory.name,
                description: description !== undefined ? (description?.trim() || null) : existingCategory.description,
                isActive: isActive !== undefined ? isActive : existingCategory.isActive,
            }
        });

        const newData = {
            name: updatedCategory.name,
            description: updatedCategory.description,
            isActive: updatedCategory.isActive
        };

        // Activity log yarat
        try {
            await createActivityLog({
                staffId: req.staffId || null,
                entityType: "Category",
                entityId: updatedCategory.id,
                action: "UPDATE",
                description: `Kateqoriya yeniləndi: ${updatedCategory.name}`,
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
            message: "Kateqoriya uğurla yeniləndi",
            date: updatedCategory,
        });
    } catch (error) {
        console.error("updateCategory error", error);
        return res.status(500).json({
            success: false,
            message: "Kateqoriya yenilənərkən xəta baş verdi",
        });
    }
};

// Kateqoriyanı sil
export const deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;

        // Kateqoriyanın mövcud olub olmadığını yoxla
        const existingCategory = await prisma.category.findUnique({
            where: { id },
            include: {
                products: true,
                subCategories: true
            }
        });

        if (!existingCategory) {
            return res.status(404).json({
                success: false,
                message: "Kateqoriya tapılmadı"
            });
        }

        // Əgər kateqoriyaya aid məhsul və ya alt kateqoriya varsa, silməyə icazə vermə
        if (existingCategory.products.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Bu kateqoriyaya aid məhsullar var. Əvvəlcə məhsulları silin və ya başqa kateqoriyaya köçürün"
            });
        }

        if (existingCategory.subCategories.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Bu kateqoriyaya aid alt kateqoriyalar var. Əvvəlcə alt kateqoriyaları silin"
            });
        }

        await prisma.category.delete({
            where: { id }
        });

        // Activity log yarat
        try {
            await createActivityLog({
                staffId: req.staffId || null,
                entityType: "Category",
                entityId: id,
                action: "DELETE",
                description: `Kateqoriya silindi: ${existingCategory.name}`,
                changes: {
                    name: existingCategory.name,
                    description: existingCategory.description
                }
            });
        } catch (logError) {
            console.error("Activity log yaradılarkən xəta:", logError);
        }

        return res.json({
            success: true,
            message: "Kateqoriya uğurla silindi",
        });
    } catch (error) {
        console.error("deleteCategory error", error);
        return res.status(500).json({
            success: false,
            message: "Kateqoriya silinərkən xəta baş verdi",
        });
    }
};

