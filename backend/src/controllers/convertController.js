import prisma from '../lib/prisma.js';

/** getConvertStats: Temizlik merkezi üçün statistika qaytarır */
export const getConvertStats = async (req, res) => {
    try {
        const { branchId } = req.query;

        const [
            staffCount,
            finalDeliveryCount,
            expenseCount,
            cashHandoverCount,
            productCount,
            saleCount
        ] = await Promise.all([
            prisma.staff.count({ where: { branchId: null } }),
            prisma.finaldelivery.count({ where: { branchId: null } }),
            prisma.expense.count({ where: { branchId: null } }),
            prisma.cashhandover.count({ where: { branchId: null } }),
            prisma.product.count({
                where: {
                    OR: [
                        { stock: { gt: 0 } },
                        { fullBoxes: { gt: 0 } },
                        { openedBoxQuantity: { gt: 0 } }
                    ]
                }
            }),
            prisma.sale.count({ where: { branchId: null } }),
        ]);

        const deletedWhere = (base = {}) => {
            if (branchId && branchId !== 'central') {
                base.branchId = branchId;
            }
            base.deleteType = { not: 'NONE' };
            return base;
        };

        const [
            deletedProducts,
            deletedSales,
            deletedExpenses,
            deletedCashHandovers,
            deletedFinalDeliveries,
        ] = await Promise.all([
            // BranchId varsa branchDeletedProduct tablosundan say
            branchId && branchId !== 'central' 
                ? prisma.branchDeletedProduct.count({ where: { branchId } })
                : prisma.product.count({ where: { deleteType: 'SOFT' } }),
            
            prisma.sale.count({ where: deletedWhere() }),
            prisma.expense.count({ where: deletedWhere() }),
            prisma.cashhandover.count({ where: deletedWhere() }),
            prisma.finaldelivery.count({ where: deletedWhere() }),
        ]);

        const totalDeleted = deletedProducts + deletedSales + deletedExpenses +
            deletedCashHandovers + deletedFinalDeliveries;

        return res.status(200).json({
            success: true,
            data: {
                staff: staffCount,
                finalDelivery: finalDeliveryCount,
                expense: expenseCount,
                cashHandover: cashHandoverCount,
                product: productCount,
                sale: saleCount,
                deleted: {
                    total: totalDeleted,
                    product: deletedProducts,
                    sale: deletedSales,
                    expense: deletedExpenses,
                    cashHandover: deletedCashHandovers,
                    finalDelivery: deletedFinalDeliveries,
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

/** restoreDeleted: Silinmiş elementləri bərpa edir */
export const restoreDeleted = async (req, res) => {
    try {
        const { entities, itemIds } = req.body;
        const { branchId } = req.query;
        const all = !entities || entities.length === 0;
        const includes = (key) => all || entities.includes(key);
        const results = {};

        const filter = (base) => {
            if (branchId && branchId !== 'central') {
                base.branchId = branchId;
            }
            if (itemIds && itemIds.length > 0) {
                base.id = { in: itemIds };
            }
            return base;
        };

        if (includes('product')) {
            if (branchId && branchId !== 'central') {
                const where = { branchId };
                if (itemIds && itemIds.length > 0) {
                    where.productId = { in: itemIds };
                }
                const r = await prisma.branchDeletedProduct.deleteMany({ where });
                results.product = r.count;
            } else {
                const r = await prisma.product.updateMany({
                    where: filter({ deleteType: { in: ['SOFT', 'ARCHIVED'] } }),
                    data: { deleteType: 'NONE' }
                });
                results.product = r.count;
            }
        }
        if (includes('sale')) {
            const r = await prisma.sale.updateMany({
                where: filter({ deleteType: { not: 'NONE' } }),
                data: { deleteType: 'NONE' }
            });
            results.sale = r.count;
        }
        if (includes('expense')) {
            const r = await prisma.expense.updateMany({
                where: filter({ deleteType: { not: 'NONE' } }),
                data: { deleteType: 'NONE' }
            });
            results.expense = r.count;
        }
        if (includes('cashHandover')) {
            const r = await prisma.cashhandover.updateMany({
                where: filter({ deleteType: { not: 'NONE' } }),
                data: { deleteType: 'NONE' }
            });
            results.cashHandover = r.count;
        }
        if (includes('finalDelivery')) {
            const r = await prisma.finaldelivery.updateMany({
                where: filter({ deleteType: { not: 'NONE' } }),
                data: { deleteType: 'NONE' }
            });
            results.finalDelivery = r.count;
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

/** hardDeleteAll: Elementləri bazadan həmişəlik silir */
export const hardDeleteAll = async (req, res) => {
    try {
        const { entities, itemIds } = req.body;
        const { branchId } = req.query;
        const all = !entities || entities.length === 0;
        const includes = (key) => all || entities.includes(key);
        const results = {};

        const filter = (base) => {
            if (branchId && branchId !== 'central') {
                base.branchId = branchId;
            }
            if (itemIds && itemIds.length > 0) {
                base.id = { in: itemIds };
            }
            return base;
        };

        if (includes('product')) {
            if (branchId && branchId !== 'central') {
                const where = { branchId };
                if (itemIds && itemIds.length > 0) {
                    where.productId = { in: itemIds };
                }
                const r = await prisma.branchDeletedProduct.deleteMany({ where });
                results.product = r.count;
            } else {
                const r = await prisma.product.deleteMany({
                    where: filter({ deleteType: { in: ['SOFT', 'ARCHIVED'] } })
                });
                results.product = r.count;
            }
        }
        if (includes('sale')) {
            // Sale hard delete üçün manual cascadlar lazımdır (FK sərhədləri)
            const salesToDelete = await prisma.sale.findMany({
                where: filter({ deleteType: { not: 'NONE' } }),
                select: { id: true }
            });
            const saleIds = salesToDelete.map(s => s.id);
            
            if (saleIds.length > 0) {
                console.log(`Bulk hard deleting ${saleIds.length} sales...`);
                // Use a transaction for safety
                await prisma.$transaction(async (tx) => {
                    // 1. Receipts
                    await tx.receipt.deleteMany({ where: { saleId: { in: saleIds } } });
                    // 2. Returns and Return Items
                    const returns = await tx.salereturn.findMany({ where: { saleId: { in: saleIds } }, select: { id: true } });
                    const returnIds = returns.map(r => r.id);
                    if (returnIds.length > 0) {
                        await tx.salereturnitem.deleteMany({ where: { returnId: { in: returnIds } } });
                        await tx.salereturn.deleteMany({ where: { id: { in: returnIds } } });
                    }
                    // 3. Sale Items and their Return Item references
                    const saleItems = await tx.saleitem.findMany({ where: { saleId: { in: saleIds } }, select: { id: true } });
                    const saleItemIds = saleItems.map(si => si.id);
                    if (saleItemIds.length > 0) {
                        await tx.salereturnitem.deleteMany({ where: { saleItemId: { in: saleItemIds } } });
                        await tx.saleitem.deleteMany({ where: { id: { in: saleItemIds } } });
                    }
                    // 4. Finally Sales
                    const r = await tx.sale.deleteMany({ where: { id: { in: saleIds } } });
                    results.sale = r.count;
                }, {
                    maxWait: 10000,
                    timeout: 30000
                });
            } else {
                results.sale = 0;
            }
        }
        if (includes('expense')) {
            const r = await prisma.expense.deleteMany({
                where: filter({ deleteType: { not: 'NONE' } })
            });
            results.expense = r.count;
        }
        if (includes('cashHandover')) {
            const r = await prisma.cashhandover.deleteMany({
                where: filter({ deleteType: { not: 'NONE' } })
            });
            results.cashHandover = r.count;
        }
        if (includes('finalDelivery')) {
            const r = await prisma.finaldelivery.deleteMany({
                where: filter({ deleteType: { not: 'NONE' } })
            });
            results.finalDelivery = r.count;
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

/** assignToBranch: Filialsız qeydləri seçilmiş filiala bağlayır */
export const assignToBranch = async (req, res) => {
    try {
        const { entities, branchId: bodyBranchId } = req.body;
        if (!bodyBranchId) return res.status(400).json({ success: false, message: "Filial seçilməyib" });

        const results = {};
        const all = !entities || entities.length === 0;
        const includes = (key) => all || entities.includes(key);

        if (includes('staff')) {
            const r = await prisma.staff.updateMany({ where: { branchId: null }, data: { branchId: bodyBranchId } });
            results.staff = r.count;
        }
        if (includes('sale')) {
            const r = await prisma.sale.updateMany({ where: { branchId: null }, data: { branchId: bodyBranchId } });
            results.sale = r.count;
        }
        if (includes('expense')) {
            const r = await prisma.expense.updateMany({ where: { branchId: null }, data: { branchId: bodyBranchId } });
            results.expense = r.count;
        }
        if (includes('cashHandover')) {
            const r = await prisma.cashhandover.updateMany({ where: { branchId: null }, data: { branchId: bodyBranchId } });
            results.cashHandover = r.count;
        }
        if (includes('finalDelivery')) {
            const r = await prisma.finaldelivery.updateMany({ where: { branchId: null }, data: { branchId: bodyBranchId } });
            results.finalDelivery = r.count;
        }
        if (includes('product')) {
            const unassignedProducts = await prisma.product.findMany({
                where: {
                    OR: [
                        { stock: { gt: 0 } },
                        { fullBoxes: { gt: 0 } },
                        { openedBoxQuantity: { gt: 0 } }
                    ]
                }
            });

            if (unassignedProducts.length > 0) {
                const productIds = unassignedProducts.map(p => p.id);
                
                await prisma.$transaction(async (tx) => {
                    // Pre-fetch all existing branch stocks for these products in one query
                    const existingStocks = await tx.branchstock.findMany({
                        where: {
                            branchId: bodyBranchId,
                            productId: { in: productIds }
                        }
                    });

                    const stockMap = new Map(existingStocks.map(s => [s.productId, s]));

                    // Update or create branch stock for each product
                    for (const p of unassignedProducts) {
                        const bStock = stockMap.get(p.id);

                        if (bStock) {
                            await tx.branchstock.update({
                                where: { id: bStock.id },
                                data: {
                                    stock: bStock.stock + p.stock,
                                    fullBoxes: bStock.fullBoxes + p.fullBoxes,
                                    openedBoxQuantity: bStock.openedBoxQuantity + p.openedBoxQuantity
                                }
                            });
                        } else {
                            await tx.branchstock.create({
                                data: {
                                    branchId: bodyBranchId,
                                    productId: p.id,
                                    stock: p.stock,
                                    fullBoxes: p.fullBoxes,
                                    openedBoxQuantity: p.openedBoxQuantity
                                }
                            });
                        }
                    }

                    // Batch update all products to zero out their stock in one query
                    await tx.product.updateMany({
                        where: { id: { in: productIds } },
                        data: {
                            stock: 0,
                            fullBoxes: 0,
                            openedBoxQuantity: 0
                        }
                    });
                }, {
                    maxWait: 10000, // Wait up to 10s to get a connection
                    timeout: 30000  // Allow up to 30s for the transaction to complete
                });
            }
            results.product = unassignedProducts.length;
        }

        return res.status(200).json({ success: true, message: "Seçilmiş elementlər filiala bağlandı", results });
    } catch (error) {
        console.error("assignToBranch error", error);
        return res.status(500).json({ success: false, message: "Bağlama zamanı xəta baş verdi", error: error.message });
    }
};

/** getDeletedProducts: Filial üzrə silinmiş məhsulların siyahısını (stokla birgə) qaytarır */
export const getDeletedProducts = async (req, res) => {
    try {
        const { branchId } = req.query;
        if (!branchId || branchId === 'central') {
            const products = await prisma.product.findMany({
                where: { deleteType: 'SOFT' },
                include: { category: true }
            });
            return res.json({
                success: true,
                data: products.map(p => ({
                    id: p.id,
                    name: p.name,
                    barcode: p.barcode,
                    categoryName: p.category?.name,
                    stock: p.stock,
                    fullBoxes: p.fullBoxes,
                    deletedAt: p.updatedAt
                }))
            });
        }

        const deletedList = await prisma.branchDeletedProduct.findMany({
            where: { branchId },
            include: {
                product: {
                    include: {
                        category: true,
                        branchStocks: { where: { branchId } }
                    }
                }
            }
        });

        const data = deletedList.map(item => {
            const p = item.product;
            const bStock = p.branchStocks[0] || { stock: 0, fullBoxes: 0 };
            return {
                id: p.id,
                name: p.name,
                barcode: p.barcode,
                categoryName: p.category?.name,
                stock: bStock.stock,
                fullBoxes: bStock.fullBoxes,
                deletedAt: item.deletedAt
            };
        });

        return res.json({ success: true, data });
    } catch (error) {
        console.error("getDeletedProducts error", error);
        return res.status(500).json({ success: false, message: "Siyahı alınarkən xəta baş verdi" });
    }
};
