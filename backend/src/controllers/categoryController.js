import prisma from "../lib/prisma.js";
import { createActivityLog } from "./activityLogController.js";
import { getStoreFilter } from "../utils/storeHelper.js";

// Bütün kateqoriyaları gətir
export const getAllCategories = async (req, res) => {
    try {
        const { deleteType, includeDeleted, branchId, includeUnassigned } = req.query;

        const storeFilter = getStoreFilter(req);
        const where = { ...storeFilter };

        // DeleteType filter - default olaraq yalnız silinməyən kateqoriyaları göstər
        if (includeDeleted === 'true') {
            // Bütün kateqoriyaları göstər (silinmişlər də daxil)
        } else if (deleteType) {
            where.deleteType = deleteType.toUpperCase();
        } else {
            // Default: yalnız silinməyən kateqoriyaları göstər
            where.deleteType = 'NONE';
        }

        // Filial filtri silindi - kateqoriyalar artıq hamı üçün görünür

        const categories = await prisma.category.findMany({
            where,
            include: {
                branch: {
                    select: { id: true, name: true }
                },
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
        const { name, description, isActive, branchId, store } = req.body;

        if (!name || name.trim() === "") {
            return res.status(400).json({
                success: false,
                message: "Kateqoriya adı tələb olunur"
            });
        }

        // Kateqoriyalar artıq qlobaldır (branchId mütləq null olur)
        const effectiveBranchId = null;
        const existingCategory = await prisma.category.findFirst({
            where: {
                name: name.trim(),
                branchId: effectiveBranchId
            }
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
                branchId: effectiveBranchId,
                store: store || 'FITECH',
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

// Bütün kateqoriyaları qlobal et (branchId = null)
export const makeCategoriesGlobal = async (req, res) => {
    try {
        const [catResult, subCatResult] = await Promise.all([
            prisma.category.updateMany({
                where: { NOT: { branchId: null } },
                data: { branchId: null }
            }),
            prisma.subcategory.updateMany({
                where: { NOT: { branchId: null } },
                data: { branchId: null }
            })
        ]);

        return res.status(200).json({
            success: true,
            message: `Bütün ${catResult.count} kateqoriya və ${subCatResult.count} alt kateqoriya qlobal edildi (Mərkəzi Banka keçirildi)`,
            categoriesUpdated: catResult.count,
            subCategoriesUpdated: subCatResult.count
        });
    } catch (error) {
        console.error("makeCategoriesGlobal error", error);
        return res.status(500).json({
            success: false,
            message: "Kateqoriyalar qlobal edilərkən xəta baş verdi",
            error: error.message
        });
    }
};

// Kateqoriyanı yenilə
export const updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, isActive, deleteType, branchId } = req.body;

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

        // Kateqoriyalar artıq qlobaldır (branchId mütləq null olur)
        const effectiveBranchId = null;

        if (name && name.trim() !== existingCategory.name) {
            const duplicateCategory = await prisma.category.findFirst({
                where: {
                    name: name.trim(),
                    branchId: effectiveBranchId,
                    id: { not: id }
                }
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
            isActive: existingCategory.isActive,
            branchId: existingCategory.branchId
        };

        const updatedCategory = await prisma.category.update({
            where: { id },
            data: {
                name: name ? name.trim() : existingCategory.name,
                description: description !== undefined ? (description?.trim() || null) : existingCategory.description,
                isActive: isActive !== undefined ? isActive : existingCategory.isActive,
                deleteType: deleteType !== undefined ? deleteType.toUpperCase() : existingCategory.deleteType,
                branchId: effectiveBranchId,
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
        const { deleteType = 'SOFT' } = req.body; // Default: SOFT delete

        // Ensure deleteType is valid
        const validDeleteType = (deleteType && typeof deleteType === 'string' && deleteType.toUpperCase() === 'HARD') ? 'HARD' : 'SOFT';

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

        // DeleteType-a görə silmə
        if (validDeleteType === 'HARD') {
            // Hard delete - Bütün əlaqəli məlumatları (alt kateqoriyalar, məhsullar və onların qeydləri) tap və sil
            // 1. Kateqoriyaya aid olan bütün məhsulların ID-lərini gətir
            const productsInCategory = await prisma.product.findMany({
                where: { categoryId: id },
                select: { id: true }
            });
            const productIds = productsInCategory.map(p => p.id);

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

                // 3. Alt kateqoriyaları sil
                prisma.subcategory.deleteMany({
                    where: { categoryId: id }
                }),

                // 4. Kateqoriyanı sil
                prisma.category.delete({
                    where: { id }
                })
            ]);

            // Activity log yarat
            try {
                await createActivityLog({
                    staffId: req.staffId || null,
                    entityType: "Category",
                    entityId: id,
                    action: "HARD_DELETE",
                    description: `Kateqoriya və ona bağlı bütün məlumatlar (məhsullar, alt kateqoriyalar) tamamilə silindi: ${existingCategory.name}`,
                    changes: {
                        name: existingCategory.name,
                        productsDeleted: productIds.length
                    }
                });
            } catch (logError) {
                console.error("Activity log yaradılarkən xəta:", logError);
            }
        } else {
            // Soft delete - deleteType-u dəyiş
            await prisma.category.update({
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
                    entityType: "Category",
                    entityId: id,
                    action: "SOFT_DELETE",
                    description: `Kateqoriya soft delete edildi: ${existingCategory.name}`,
                    changes: {
                        name: existingCategory.name,
                        description: existingCategory.description,
                        deleteType: 'SOFT'
                    }
                });
            } catch (logError) {
                console.error("Activity log yaradılarkən xəta:", logError);
            }
        }

        return res.json({
            success: true,
            message: validDeleteType === 'HARD' ? "Kateqoriya tamamilə silindi" : "Kateqoriya soft delete edildi",
        });
    } catch (error) {
        console.error("deleteCategory error", error);
        return res.status(500).json({
            success: false,
            message: "Kateqoriya silinərkən xəta baş verdi",
        });
    }
};

