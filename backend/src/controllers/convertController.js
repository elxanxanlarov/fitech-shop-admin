import prisma from "../lib/prisma.js";

// Kürdəxanı filialını tap
const getKurdaxani = async () => {
    return prisma.branch.findFirst({ where: { name: 'Kürdəxanı' } });
};

// Hər entity üçün branchId-siz (null) olan qeydlərin sayını ver
export const getConvertStats = async (req, res) => {
    try {
        const [
            staffCount,
            finalDeliveryCount,
            expenseCount,
            cashHandoverCount,
            productCount,
            saleCount,
            categoryCount,
            subCategoryCount,
            // Silinmiş elementlər
            deletedProducts,
            deletedSales,
            deletedExpenses,
            deletedCashHandovers,
            deletedFinalDeliveries,
            deletedCategories,
            deletedSubCategories,
        ] = await Promise.all([
            // staff modelinin deleteType sahəsi yoxdur
            prisma.staff.count({ where: { branchId: null } }),
            prisma.finaldelivery.count({ where: { branchId: null, deleteType: 'NONE' } }),
            prisma.expense.count({ where: { branchId: null, deleteType: 'NONE' } }),
            prisma.cashhandover.count({ where: { branchId: null, deleteType: 'NONE' } }),
            // Məhsullar: heç bir filial stoku olmayan köhnə məhsullar
            prisma.product.count({ where: { branchStocks: { none: {} }, deleteType: 'NONE' } }),
            prisma.sale.count({ where: { branchId: null, deleteType: 'NONE' } }),
            prisma.category.count({ where: { branchId: null, deleteType: 'NONE' } }),
            prisma.subcategory.count({ where: { branchId: null, deleteType: 'NONE' } }),
            // Silinmişlər (SOFT + ARCHIVED)
            prisma.product.count({ where: { deleteType: { in: ['SOFT', 'ARCHIVED'] } } }),
            prisma.sale.count({ where: { deleteType: { not: 'NONE' } } }),
            prisma.expense.count({ where: { deleteType: { not: 'NONE' } } }),
            prisma.cashhandover.count({ where: { deleteType: { not: 'NONE' } } }),
            prisma.finaldelivery.count({ where: { deleteType: { not: 'NONE' } } }),
            prisma.category.count({ where: { deleteType: { not: 'NONE' } } }),
            prisma.subcategory.count({ where: { deleteType: { not: 'NONE' } } }),
        ]);

        const totalDeleted = deletedProducts + deletedSales + deletedExpenses +
            deletedCashHandovers + deletedFinalDeliveries + deletedCategories + deletedSubCategories;

        return res.status(200).json({
            success: true,
            data: {
                staff: staffCount,
                finalDelivery: finalDeliveryCount,
                expense: expenseCount,
                cashHandover: cashHandoverCount,
                product: productCount,
                sale: saleCount,
                category: categoryCount,
                subCategory: subCategoryCount,
                deleted: {
                    total: totalDeleted,
                    product: deletedProducts,
                    sale: deletedSales,
                    expense: deletedExpenses,
                    cashHandover: deletedCashHandovers,
                    finalDelivery: deletedFinalDeliveries,
                    category: deletedCategories,
                    subCategory: deletedSubCategories,
                }
            }
        });
    } catch (error) {
        console.error("getConvertStats error", error);
        return res.status(500).json({
            success: false,
            message: "Statistika alınarkən xəta baş verdi",
            error: error.message
        });
    }
};

// Silinmiş elementləri bərpa et (deleteType → NONE)
export const restoreDeleted = async (req, res) => {
    try {
        const { entities } = req.body; // boş olsa hamısı
        const all = !entities || entities.length === 0;
        const includes = (key) => all || entities.includes(key);
        const results = {};

        if (includes('product')) {
            const r = await prisma.product.updateMany({
                where: { deleteType: { in: ['SOFT', 'ARCHIVED'] } },
                data: { deleteType: 'NONE' }
            });
            results.product = r.count;
        }
        if (includes('sale')) {
            const r = await prisma.sale.updateMany({
                where: { deleteType: { not: 'NONE' } },
                data: { deleteType: 'NONE' }
            });
            results.sale = r.count;
        }
        if (includes('expense')) {
            const r = await prisma.expense.updateMany({
                where: { deleteType: { not: 'NONE' } },
                data: { deleteType: 'NONE' }
            });
            results.expense = r.count;
        }
        if (includes('cashHandover')) {
            const r = await prisma.cashhandover.updateMany({
                where: { deleteType: { not: 'NONE' } },
                data: { deleteType: 'NONE' }
            });
            results.cashHandover = r.count;
        }
        if (includes('finalDelivery')) {
            const r = await prisma.finaldelivery.updateMany({
                where: { deleteType: { not: 'NONE' } },
                data: { deleteType: 'NONE' }
            });
            results.finalDelivery = r.count;
        }
        if (includes('category')) {
            const r = await prisma.category.updateMany({
                where: { deleteType: { not: 'NONE' } },
                data: { deleteType: 'NONE' }
            });
            results.category = r.count;
        }
        if (includes('subCategory')) {
            const r = await prisma.subcategory.updateMany({
                where: { deleteType: { not: 'NONE' } },
                data: { deleteType: 'NONE' }
            });
            results.subCategory = r.count;
        }

        const total = Object.values(results).reduce((s, v) => s + v, 0);
        return res.status(200).json({
            success: true,
            message: `${total} element uğurla bərpa edildi`,
            results
        });
    } catch (error) {
        console.error("restoreDeleted error", error);
        return res.status(500).json({ success: false, message: "Bərpa zamanı xəta baş verdi", error: error.message });
    }
};

// Silinmiş elementləri həmişəlik sil (HARD DELETE)
export const hardDeleteAll = async (req, res) => {
    try {
        const { entities } = req.body;
        const all = !entities || entities.length === 0;
        const includes = (key) => all || entities.includes(key);
        const results = {};

        if (includes('product')) {
            const r = await prisma.product.deleteMany({
                where: { deleteType: { in: ['SOFT', 'ARCHIVED'] } }
            });
            results.product = r.count;
        }
        if (includes('sale')) {
            const r = await prisma.sale.deleteMany({
                where: { deleteType: { not: 'NONE' } }
            });
            results.sale = r.count;
        }
        if (includes('expense')) {
            const r = await prisma.expense.deleteMany({
                where: { deleteType: { not: 'NONE' } }
            });
            results.expense = r.count;
        }
        if (includes('cashHandover')) {
            const r = await prisma.cashhandover.deleteMany({
                where: { deleteType: { not: 'NONE' } }
            });
            results.cashHandover = r.count;
        }
        if (includes('finalDelivery')) {
            const r = await prisma.finaldelivery.deleteMany({
                where: { deleteType: { not: 'NONE' } }
            });
            results.finalDelivery = r.count;
        }
        if (includes('category')) {
            const r = await prisma.category.deleteMany({
                where: { deleteType: { not: 'NONE' } }
            });
            results.category = r.count;
        }
        if (includes('subCategory')) {
            const r = await prisma.subcategory.deleteMany({
                where: { deleteType: { not: 'NONE' } }
            });
            results.subCategory = r.count;
        }

        const total = Object.values(results).reduce((s, v) => s + v, 0);
        return res.status(200).json({
            success: true,
            message: `${total} element həmişəlik silindi`,
            results
        });
    } catch (error) {
        console.error("hardDeleteAll error", error);
        return res.status(500).json({ success: false, message: "Silmə zamanı xəta baş verdi", error: error.message });
    }
};

// Seçilmiş entity-ləri filiala bağla (body.branchId verilməsə Kürdəxanı)
export const assignToKurdaxani = async (req, res) => {
    try {
        const { entities, branchId: bodyBranchId } = req.body;

        let targetBranch;
        if (bodyBranchId) {
            targetBranch = await prisma.branch.findFirst({
                where: { id: bodyBranchId, deleteType: 'NONE' }
            });
            if (!targetBranch) {
                return res.status(404).json({
                    success: false,
                    message: "Seçilmiş filial tapılmadı"
                });
            }
        } else {
            targetBranch = await getKurdaxani();
            if (!targetBranch) {
                return res.status(404).json({
                    success: false,
                    message: "Kürdəxanı filialı tapılmadı"
                });
            }
        }

        const branchId = targetBranch.id;
        const all = !entities || entities.length === 0;
        const includes = (key) => all || entities.includes(key);

        const results = {};

        if (includes('staff')) {
            const r = await prisma.staff.updateMany({
                where: { branchId: null },
                data: { branchId }
            });
            results.staff = r.count;
        }

        if (includes('finalDelivery')) {
            const r = await prisma.finaldelivery.updateMany({
                where: { branchId: null },
                data: { branchId }
            });
            results.finalDelivery = r.count;
        }

        if (includes('expense')) {
            const r = await prisma.expense.updateMany({
                where: { branchId: null },
                data: { branchId }
            });
            results.expense = r.count;
        }

        if (includes('cashHandover')) {
            const r = await prisma.cashhandover.updateMany({
                where: { branchId: null },
                data: { branchId }
            });
            results.cashHandover = r.count;
        }

        if (includes('sale')) {
            const r = await prisma.sale.updateMany({
                where: { branchId: null },
                data: { branchId }
            });
            results.sale = r.count;
        }

        // Kateqoriyalar və Alt Kateqoriyalar artıq qlobaldır, filiala bağlamağa ehtiyac yoxdur.

        if (includes('product')) {
            // Məhsulların özündə branchId yoxdur, onlar BranchStock vasitəsilə idarə edilir.
            // Mövcud branchstock qeydlərini mərkəzi stokla yenilə.
            const allProducts = await prisma.product.findMany({
                where: { deleteType: 'NONE' },
                select: { 
                    id: true,
                    stock: true,
                    fullBoxes: true,
                    openedBoxQuantity: true
                }
            });

            let converted = 0;
            // Digər filialları tap
            const otherBranches = await prisma.branch.findMany({
                where: { id: { not: branchId }, deleteType: 'NONE' },
                select: { id: true }
            });

            for (const p of allProducts) {
                // 1. Hədəf filiala (Kürdəxanı) stoku ötür və ya yarat
                const existing = await prisma.branchstock.findFirst({
                    where: { branchId, productId: p.id }
                });
                if (existing) {
                    if (existing.stock === 0 && p.stock > 0) {
                        await prisma.branchstock.update({
                            where: { id: existing.id },
                            data: {
                                stock: p.stock,
                                fullBoxes: p.fullBoxes || 0,
                                openedBoxQuantity: p.openedBoxQuantity || 0
                            }
                        });
                        converted++;
                    }
                } else {
                    await prisma.branchstock.create({
                        data: {
                            branchId,
                            productId: p.id,
                            stock: p.stock || 0,
                            fullBoxes: p.fullBoxes || 0,
                            openedBoxQuantity: p.openedBoxQuantity || 0
                        }
                    });
                    converted++;
                }

                // 2. Digər bütün filiallar üçün stoku 0-a bərabərləşdir
                if (otherBranches.length > 0) {
                    await prisma.branchstock.updateMany({
                        where: {
                            branchId: { in: otherBranches.map(b => b.id) },
                            productId: p.id
                        },
                        data: {
                            stock: 0,
                            fullBoxes: 0,
                            openedBoxQuantity: 0
                        }
                    });
                }
            }
            results.product = converted;
        }

        return res.status(200).json({
            success: true,
            message: `Məlumatlar "${targetBranch.name}" filialına uğurla bağlandı`,
            results
        });
    } catch (error) {
        console.error("assignToKurdaxani error", error);
        return res.status(500).json({
            success: false,
            message: "Köçürmə zamanı xəta baş verdi",
            error: error.message
        });
    }
};
