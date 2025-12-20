import prisma from "../lib/prisma.js";
import { createActivityLog } from "./activityLogController.js";

// Bütün alt kateqoriyaları gətir
export const getAllSubCategories = async (req, res) => {
    try {
        const { categoryId, deleteType, includeDeleted } = req.query;
        
        const where = {};
        
        // DeleteType filter - default olaraq yalnız silinməyən alt kateqoriyaları göstər
        if (includeDeleted === 'true') {
            // Bütün alt kateqoriyaları göstər (silinmişlər də daxil)
        } else if (deleteType) {
            where.deleteType = deleteType.toUpperCase();
        } else {
            // Default: yalnız silinməyən alt kateqoriyaları göstər
            where.deleteType = 'NONE';
        }
        
        if (categoryId) {
            where.categoryId = categoryId;
        }

        const subCategories = await prisma.subCategory.findMany({
            where,
            include: {
                category: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            },
            orderBy: {
                name: 'asc'
            }
        });

        return res.status(200).json({
            success: true,
            date: subCategories,
        });
    } catch (error) {
        console.error("getAllSubCategories error", error);
        return res.status(500).json({
            success: false,
            message: "Alt kateqoriyalar alınarkən xəta baş verdi"
        });
    }
};

// Alt kateqoriya ID-yə görə gətir
export const getSubCategoryById = async (req, res) => {
    try {
        const { id } = req.params;
        const subCategory = await prisma.subCategory.findUnique({
            where: { id },
            include: {
                category: {
                    select: {
                        id: true,
                        name: true,
                        description: true
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

        if (!subCategory) {
            return res.status(404).json({
                success: false,
                message: "Alt kateqoriya tapılmadı",
            });
        }

        return res.json({
            success: true,
            date: subCategory,
        });
    } catch (error) {
        console.error("getSubCategoryById error", error);
        return res.status(500).json({
            success: false,
            message: "Alt kateqoriya tapılarkən xəta baş verdi",
        });
    }
};

// Yeni alt kateqoriya yarat
export const createSubCategory = async (req, res) => {
    try {
        const { name, description, categoryId, isActive } = req.body;

        if (!name || name.trim() === "") {
            return res.status(400).json({
                success: false,
                message: "Alt kateqoriya adı tələb olunur"
            });
        }

        if (!categoryId) {
            return res.status(400).json({
                success: false,
                message: "Kateqoriya ID tələb olunur"
            });
        }

        // Kateqoriyanın mövcud olub olmadığını yoxla
        const category = await prisma.category.findUnique({
            where: { id: categoryId }
        });

        if (!category) {
            return res.status(404).json({
                success: false,
                message: "Kateqoriya tapılmadı"
            });
        }

        // Eyni kateqoriya daxilində eyni adlı alt kateqoriyanın olub olmadığını yoxla
        const existingSubCategory = await prisma.subCategory.findFirst({
            where: {
                name: name.trim(),
                categoryId: categoryId
            }
        });

        if (existingSubCategory) {
            return res.status(400).json({
                success: false,
                message: "Bu kateqoriyada bu adlı alt kateqoriya artıq mövcuddur"
            });
        }

        const newSubCategory = await prisma.subCategory.create({
            data: {
                name: name.trim(),
                description: description?.trim() || null,
                categoryId: categoryId,
                isActive: typeof isActive === "boolean" ? isActive : true,
            },
            include: {
                category: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        });

        // Activity log yarat
        try {
            await createActivityLog({
                staffId: req.staffId || null,
                entityType: "SubCategory",
                entityId: newSubCategory.id,
                action: "CREATE",
                description: `Yeni alt kateqoriya yaradıldı: ${newSubCategory.name} (${category.name})`,
                changes: {
                    name: newSubCategory.name,
                    description: newSubCategory.description,
                    categoryId: newSubCategory.categoryId,
                    categoryName: category.name,
                    isActive: newSubCategory.isActive
                }
            });
        } catch (logError) {
            console.error("Activity log yaradılarkən xəta:", logError);
        }

        return res.status(201).json({
            success: true,
            message: "Alt kateqoriya uğurla yaradıldı",
            date: newSubCategory,
        });
    } catch (error) {
        console.error("createSubCategory error", error);
        return res.status(500).json({
            success: false,
            message: "Alt kateqoriya yaradılarkən xəta baş verdi",
        });
    }
};

// Alt kateqoriyanı yenilə
export const updateSubCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, categoryId, isActive, deleteType } = req.body;

        // Alt kateqoriyanın mövcud olub olmadığını yoxla
        const existingSubCategory = await prisma.subCategory.findUnique({
            where: { id },
            include: {
                category: true
            }
        });

        if (!existingSubCategory) {
            return res.status(404).json({
                success: false,
                message: "Alt kateqoriya tapılmadı"
            });
        }

        // Əgər kateqoriya dəyişdirilirsə, yeni kateqoriyanın mövcud olub olmadığını yoxla
        const finalCategoryId = categoryId || existingSubCategory.categoryId;
        if (categoryId && categoryId !== existingSubCategory.categoryId) {
            const category = await prisma.category.findUnique({
                where: { id: categoryId }
            });

            if (!category) {
                return res.status(404).json({
                    success: false,
                    message: "Kateqoriya tapılmadı"
                });
            }
        }

        // Əgər ad dəyişdirilirsə və ya kateqoriya dəyişdirilirsə, unikal olub olmadığını yoxla
        const finalName = name ? name.trim() : existingSubCategory.name;
        if ((name && name.trim() !== existingSubCategory.name) || (categoryId && categoryId !== existingSubCategory.categoryId)) {
            const duplicateSubCategory = await prisma.subCategory.findFirst({
                where: {
                    name: finalName,
                    categoryId: finalCategoryId,
                    id: {
                        not: id
                    }
                }
            });

            if (duplicateSubCategory) {
                return res.status(400).json({
                    success: false,
                    message: "Bu kateqoriyada bu adlı alt kateqoriya artıq mövcuddur"
                });
            }
        }

        const oldData = {
            name: existingSubCategory.name,
            description: existingSubCategory.description,
            categoryId: existingSubCategory.categoryId,
            categoryName: existingSubCategory.category.name,
            isActive: existingSubCategory.isActive
        };

        const updatedSubCategory = await prisma.subCategory.update({
            where: { id },
            data: {
                name: finalName,
                description: description !== undefined ? (description?.trim() || null) : existingSubCategory.description,
                categoryId: finalCategoryId,
                isActive: isActive !== undefined ? isActive : existingSubCategory.isActive,
                deleteType: deleteType !== undefined ? deleteType.toUpperCase() : existingSubCategory.deleteType,
            },
            include: {
                category: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        });

        const newData = {
            name: updatedSubCategory.name,
            description: updatedSubCategory.description,
            categoryId: updatedSubCategory.categoryId,
            categoryName: updatedSubCategory.category.name,
            isActive: updatedSubCategory.isActive
        };

        // Activity log yarat
        try {
            await createActivityLog({
                staffId: req.staffId || null,
                entityType: "SubCategory",
                entityId: updatedSubCategory.id,
                action: "UPDATE",
                description: `Alt kateqoriya yeniləndi: ${updatedSubCategory.name} (${updatedSubCategory.category.name})`,
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
            message: "Alt kateqoriya uğurla yeniləndi",
            date: updatedSubCategory,
        });
    } catch (error) {
        console.error("updateSubCategory error", error);
        return res.status(500).json({
            success: false,
            message: "Alt kateqoriya yenilənərkən xəta baş verdi",
        });
    }
};

// Alt kateqoriyanı sil
export const deleteSubCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { deleteType = 'SOFT' } = req.body; // Default: SOFT delete
        
        // Ensure deleteType is valid
        const validDeleteType = (deleteType && typeof deleteType === 'string' && deleteType.toUpperCase() === 'HARD') ? 'HARD' : 'SOFT';

        // Alt kateqoriyanın mövcud olub olmadığını yoxla
        const existingSubCategory = await prisma.subCategory.findUnique({
            where: { id },
            include: {
                category: true,
                products: true
            }
        });

        if (!existingSubCategory) {
            return res.status(404).json({
                success: false,
                message: "Alt kateqoriya tapılmadı"
            });
        }

        // DeleteType-a görə silmə
        if (validDeleteType === 'HARD') {
            // Hard delete - əvvəlcə yoxla ki, məhsul var
            if (existingSubCategory.products.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: "Bu alt kateqoriyaya aid məhsullar var. Əvvəlcə məhsulları silin və ya başqa alt kateqoriyaya köçürün"
                });
            }

            await prisma.subCategory.delete({
                where: { id }
            });

            // Activity log yarat
            try {
                await createActivityLog({
                    staffId: req.staffId || null,
                    entityType: "SubCategory",
                    entityId: id,
                    action: "HARD_DELETE",
                    description: `Alt kateqoriya tamamilə silindi: ${existingSubCategory.name} (${existingSubCategory.category.name})`,
                    changes: {
                        name: existingSubCategory.name,
                        description: existingSubCategory.description,
                        categoryId: existingSubCategory.categoryId,
                        categoryName: existingSubCategory.category.name
                    }
                });
            } catch (logError) {
                console.error("Activity log yaradılarkən xəta:", logError);
            }
        } else {
            // Soft delete - deleteType-u dəyiş
            await prisma.subCategory.update({
                where: { id },
                data: {
                    deleteType: 'SOFT',
                    isActive: false // Soft delete zamanı isActive də false olsun
                }
            });

            // Activity log yarat
            try {
                await createActivityLog({
                    staffId: req.staffId || null,
                    entityType: "SubCategory",
                    entityId: id,
                    action: "SOFT_DELETE",
                    description: `Alt kateqoriya soft delete edildi: ${existingSubCategory.name} (${existingSubCategory.category.name})`,
                    changes: {
                        name: existingSubCategory.name,
                        description: existingSubCategory.description,
                        categoryId: existingSubCategory.categoryId,
                        categoryName: existingSubCategory.category.name,
                        deleteType: 'SOFT'
                    }
                });
            } catch (logError) {
                console.error("Activity log yaradılarkən xəta:", logError);
            }
        }

        return res.json({
            success: true,
            message: validDeleteType === 'HARD' ? "Alt kateqoriya tamamilə silindi" : "Alt kateqoriya soft delete edildi",
        });
    } catch (error) {
        console.error("deleteSubCategory error", error);
        return res.status(500).json({
            success: false,
            message: "Alt kateqoriya silinərkən xəta baş verdi",
        });
    }
};

