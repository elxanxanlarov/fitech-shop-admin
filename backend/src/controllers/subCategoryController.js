import prisma from "../lib/prisma.js";
import { createActivityLog } from "./activityLogController.js";
import { getStoreFilter } from "../utils/storeHelper.js";

// Bütün alt kateqoriyaları gətir
export const getAllSubCategories = async (req, res) => {
    try {
        const { categoryId, deleteType, includeDeleted, branchId, includeUnassigned } = req.query;
        
        const storeFilter = getStoreFilter(req);
        const where = { ...storeFilter };
        
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

        // Filial filtri silindi - alt kateqoriyalar artıq hamı üçün görünür

        const subCategories = await prisma.subcategory.findMany({
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
        const subCategory = await prisma.subcategory.findUnique({
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
        const { name, description, categoryId, isActive, branchId, store } = req.body;

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
        const existingSubCategory = await prisma.subcategory.findFirst({
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

        // Subkateqoriyalar artıq qlobaldır (branchId mütləq null olur)
        const effectiveBranchId = null;

        const newSubCategory = await prisma.subcategory.create({
            data: {
                name: name.trim(),
                description: description?.trim() || null,
                categoryId: categoryId,
                isActive: typeof isActive === "boolean" ? isActive : true,
                branchId: effectiveBranchId,
                store: store || 'FITECH',
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
        const existingSubCategory = await prisma.subcategory.findUnique({
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
            const duplicateSubCategory = await prisma.subcategory.findFirst({
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

        const updatedSubCategory = await prisma.subcategory.update({
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
        const existingSubCategory = await prisma.subcategory.findUnique({
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
            // Hard delete - Bütün əlaqəli məlumatları (məhsullar və onların qeydləri) find və sil
            // 1. Alt kateqoriyaya aid olan bütün məhsulların ID-lərini gətir
            const productsInSubCategory = await prisma.product.findMany({
                where: { subCategoryId: id },
                select: { id: true }
            });
            const productIds = productsInSubCategory.map(p => p.id);

            await prisma.$transaction([
                // 2. Əgər məhsullar varsa, onlara aid olan alt cədvəlləri təmizlə
                ...(productIds.length > 0 ? [
                    prisma.salereturnitem.deleteMany({ where: { productId: { in: productIds } } }),
                    prisma.saleitem.deleteMany({ where: { productId: { in: productIds } } }),
                    prisma.finaldeliveryitem.deleteMany({ where: { productId: { in: productIds } } }),
                    prisma.stocktransferitem.deleteMany({ where: { productId: { in: productIds } } }),
                    prisma.stockmovement.deleteMany({ where: { productId: { in: productIds } } }),
                    prisma.branchstock.deleteMany({ where: { productId: { in: productIds } } }),
                    prisma.product.deleteMany({ where: { id: { in: productIds } } })
                ] : []),
                
                // 3. Alt kateqoriyanı sil
                prisma.subcategory.delete({
                    where: { id }
                })
            ]);

            // Activity log yarat
            try {
                await createActivityLog({
                    staffId: req.staffId || null,
                    entityType: "SubCategory",
                    entityId: id,
                    action: "HARD_DELETE",
                    description: `Alt kateqoriya və ona bağlı bütün məhsullar tamamilə silindi: ${existingSubCategory.name} (${existingSubCategory.category.name})`,
                    changes: {
                        name: existingSubCategory.name,
                        productsDeleted: productIds.length
                    }
                });
            } catch (logError) {
                console.error("Activity log yaradılarkən xəta:", logError);
            }
        } else {
            // Soft delete - deleteType-u dəyiş
            await prisma.subcategory.update({
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

