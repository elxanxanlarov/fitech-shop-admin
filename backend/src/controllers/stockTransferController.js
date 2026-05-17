import prisma from "../lib/prisma.js";
import { createActivityLog } from "./activityLogController.js";
import { createNotification } from "./notificationController.js";

async function addQuantityToDestinationBranchStock(tx, toBranchId, item) {
    const branchStock = await tx.branchstock.findFirst({
        where: {
            branchId: toBranchId,
            productId: item.productId
        }
    });

    const product = await tx.product.findUnique({ where: { id: item.productId } });
    const ppb = product?.piecesPerBox || 1;

    if (branchStock) {
        let newFullBoxes = branchStock.fullBoxes + (item.fullBoxes || 0);
        let newOpenedBoxQuantity = branchStock.openedBoxQuantity + (item.openedBoxQuantity || 0);
        if (newOpenedBoxQuantity >= ppb) {
            newFullBoxes += Math.floor(newOpenedBoxQuantity / ppb);
            newOpenedBoxQuantity = newOpenedBoxQuantity % ppb;
        }
        await tx.branchstock.update({
            where: { id: branchStock.id },
            data: {
                stock: branchStock.stock + item.quantity,
                fullBoxes: newFullBoxes,
                openedBoxQuantity: newOpenedBoxQuantity
            }
        });
    } else {
        await tx.branchstock.create({
            data: {
                branchId: toBranchId,
                productId: item.productId,
                stock: item.quantity,
                fullBoxes: item.fullBoxes || 0,
                openedBoxQuantity: item.openedBoxQuantity || 0
            }
        });
    }
}

async function assertCanCreateFilialTransfer(staffId, fromBranchId) {
    const staff = await prisma.staff.findUnique({
        where: { id: staffId },
        include: { role: true }
    });
    if (!staff?.role?.name) {
        return { ok: false, status: 403, message: "İcazə yoxdur" };
    }
    const rn = staff.role.name.toLowerCase();
    const isSuper = rn === "superadmin";
    const isAdmin = rn === "admin";
    if (isSuper || (isAdmin && staff.isBoss)) {
        return { ok: true };
    }
    if (isAdmin && !staff.isBoss) {
        if (!staff.branchId || staff.branchId !== fromBranchId) {
            return {
                ok: false,
                status: 403,
                message: "Yalnız öz filialınızdan məhsul köçürə bilərsiniz"
            };
        }
        return { ok: true };
    }
    return { ok: false, status: 403, message: "İcazə yoxdur" };
}

// Yeni stok transferi yarat (Mərkəzdən Filiala)
export const createTransfer = async (req, res) => {
    try {
        const { toBranchId, fromBranchId, items, note } = req.body;
        const staffId = req.staff?.id;

        if (!toBranchId || !items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Filial və məhsullar tələb olunur"
            });
        }

        if (fromBranchId && fromBranchId === toBranchId) {
            return res.status(400).json({
                success: false,
                message: "Göndərən və qəbul edən filial eyni ola bilməz"
            });
        }

        const result = await prisma.$transaction(async (tx) => {
            // Transfer qeydini yarat
            const transfer = await tx.stocktransfer.create({
                data: {
                    toBranchId,
                    fromBranchId: fromBranchId || null,
                    staffId,
                    note,
                    status: 'PENDING'
                }
            });

            for (const item of items) {
                const { productId, quantity, fullBoxes, openedBoxQuantity } = item;

                if (fromBranchId) {
                    // ── Filialdan filialə transfer ──────────────────────
                    const branchStock = await tx.branchstock.findFirst({
                        where: { branchId: fromBranchId, productId }
                    });

                    if (!branchStock || branchStock.stock < quantity) {
                        const product = await tx.product.findUnique({ where: { id: productId }, select: { name: true } });
                        throw new Error(`Filialda kifayət qədər stok yoxdur: ${product?.name || productId}`);
                    }

                    let newFB = branchStock.fullBoxes - (fullBoxes || 0);
                    let newOBQ = branchStock.openedBoxQuantity - (openedBoxQuantity || 0);
                    if (newOBQ < 0) { newFB -= 1; newOBQ += (item.piecesPerBox || 1); }
                    if (newFB < 0) {
                        const product = await tx.product.findUnique({ where: { id: productId }, select: { name: true } });
                        throw new Error(`Filialda qutu sayısı kifayət deyil: ${product?.name || productId}`);
                    }

                    await tx.branchstock.update({
                        where: { id: branchStock.id },
                        data: { stock: branchStock.stock - quantity, fullBoxes: newFB, openedBoxQuantity: newOBQ }
                    });
                } else {
                    // ── Mərkəz bazadan filiala transfer ─────────────────
                    const product = await tx.product.findUnique({ where: { id: productId } });
                    if (!product) throw new Error(`Məhsul tapılmadı: ${productId}`);
                    if (product.stock < quantity) throw new Error(`Mərkəz anbarda kifayət qədər stok yoxdur: ${product.name}`);

                    let newFB = product.fullBoxes - (fullBoxes || 0);
                    let newOBQ = product.openedBoxQuantity - (openedBoxQuantity || 0);
                    if (newOBQ < 0) { newFB -= 1; newOBQ += (product.piecesPerBox || 1); }
                    if (newFB < 0) throw new Error(`Mərkəz anbarda qutu sayısı kifayət deyil: ${product.name}`);

                    await tx.product.update({
                        where: { id: productId },
                        data: { stock: product.stock - quantity, fullBoxes: newFB, openedBoxQuantity: newOBQ }
                    });

                    await tx.stockmovement.create({
                        data: {
                            productId, staffId, type: 'OUT', quantity: -quantity,
                            previousStock: product.stock, newStock: product.stock - quantity,
                            previousFullBoxes: product.fullBoxes, newFullBoxes: newFB,
                            previousOpenedBoxQuantity: product.openedBoxQuantity, newOpenedBoxQuantity: newOBQ,
                            note: `Filiala transfer: ${transfer.id}`
                        }
                    });
                }

                // Transfer item yarat
                await tx.stocktransferitem.create({
                    data: { transferId: transfer.id, productId, quantity, fullBoxes, openedBoxQuantity }
                });
            }

            return transfer;
        });

        await createActivityLog({
            staffId,
            entityType: 'StockTransfer',
            entityId: result.id,
            action: 'CREATE',
            description: fromBranchId
                ? `Filialdan-filiala transfer yarad\u0131ld\u0131 (PENDING)`
                : `Yeni stok transferi yarad\u0131ld\u0131 (PENDING)`
        });

        const fromBranch = fromBranchId 
            ? await prisma.branch.findUnique({ where: { id: fromBranchId } })
            : null;

        await createNotification({
            type: 'branch_transfer',
            title: 'Yeni Məhsul Köçürməsi',
            message: `${fromBranch?.name || 'Mərkəzi Anbar'} tərəfindən yeni məhsul köçürüldü.`,
            branchId: toBranchId
        });

        return res.status(201).json({ success: true, data: result });
    } catch (error) {
        console.error("createTransfer error", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Transfer yarad\u0131lark\u0259n x\u0259ta ba\u015f verdi"
        });
    }
};

export const updateTransfer = async (req, res) => {
    try {
        const { id } = req.params;
        const { toBranchId, items, note } = req.body;
        const staffId = req.staff?.id;

        if (!toBranchId || !items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Filial və məhsullar tələb olunur"
            });
        }

        const existingTransfer = await prisma.stocktransfer.findUnique({
            where: { id },
            include: { items: true }
        });

        if (!existingTransfer) {
            return res.status(404).json({ success: false, message: "Transfer tapılmadı" });
        }

        if (existingTransfer.status !== 'PENDING') {
            return res.status(400).json({ success: false, message: "Yalnız 'PENDING' statusundakı transferləri dəyişmək olar" });
        }

        const result = await prisma.$transaction(async (tx) => {
            // 1. Köhnə məhsulları mənbəyə geri qaytar
            for (const item of existingTransfer.items) {
                if (existingTransfer.fromBranchId) {
                    const bs = await tx.branchstock.findFirst({
                        where: { branchId: existingTransfer.fromBranchId, productId: item.productId }
                    });
                    const product = await tx.product.findUnique({ where: { id: item.productId } });
                    const ppb = product?.piecesPerBox || 1;

                    if (bs) {
                        let newFB = bs.fullBoxes + (item.fullBoxes || 0);
                        let newOBQ = bs.openedBoxQuantity + (item.openedBoxQuantity || 0);
                        if (newOBQ >= ppb) { newFB += Math.floor(newOBQ / ppb); newOBQ %= ppb; }
                        await tx.branchstock.update({
                            where: { id: bs.id },
                            data: { stock: bs.stock + item.quantity, fullBoxes: newFB, openedBoxQuantity: newOBQ }
                        });
                    }
                } else {
                    const product = await tx.product.findUnique({ where: { id: item.productId } });
                    const ppb = product.piecesPerBox || 1;
                    let newFB = product.fullBoxes + (item.fullBoxes || 0);
                    let newOBQ = product.openedBoxQuantity + (item.openedBoxQuantity || 0);
                    if (newOBQ >= ppb) { newFB += Math.floor(newOBQ / ppb); newOBQ %= ppb; }

                    await tx.product.update({
                        where: { id: item.productId },
                        data: { stock: product.stock + item.quantity, fullBoxes: newFB, openedBoxQuantity: newOBQ }
                    });
                }
            }

            // 2. Köhnə item-ləri sil
            await tx.stocktransferitem.deleteMany({ where: { transferId: id } });

            // 3. Yeni məhsulları yoxla və çıx
            for (const item of items) {
                const { productId, quantity, fullBoxes, openedBoxQuantity } = item;

                if (existingTransfer.fromBranchId) {
                    const branchStock = await tx.branchstock.findFirst({
                        where: { branchId: existingTransfer.fromBranchId, productId }
                    });

                    if (!branchStock || branchStock.stock < quantity) {
                        const product = await tx.product.findUnique({ where: { id: productId }, select: { name: true } });
                        throw new Error(`Filialda kifayət qədər stok yoxdur: ${product?.name || productId}`);
                    }

                    const product = await tx.product.findUnique({ where: { id: productId } });
                    const ppb = product?.piecesPerBox || 1;

                    let newFB = branchStock.fullBoxes - (fullBoxes || 0);
                    let newOBQ = branchStock.openedBoxQuantity - (openedBoxQuantity || 0);
                    if (newOBQ < 0) { newFB -= 1; newOBQ += ppb; }
                    if (newFB < 0) {
                        throw new Error(`Filialda qutu sayısı kifayət deyil: ${product?.name || productId}`);
                    }

                    await tx.branchstock.update({
                        where: { id: branchStock.id },
                        data: { stock: branchStock.stock - quantity, fullBoxes: newFB, openedBoxQuantity: newOBQ }
                    });
                } else {
                    const product = await tx.product.findUnique({ where: { id: productId } });
                    if (!product) throw new Error(`Məhsul tapılmadı: ${productId}`);
                    if (product.stock < quantity) throw new Error(`Mərkəz anbarda kifayət qədər stok yoxdur: ${product.name}`);

                    let newFB = product.fullBoxes - (fullBoxes || 0);
                    let newOBQ = product.openedBoxQuantity - (openedBoxQuantity || 0);
                    if (newOBQ < 0) { newFB -= 1; newOBQ += (product.piecesPerBox || 1); }
                    if (newFB < 0) throw new Error(`Mərkəz anbarda qutu sayısı kifayət deyil: ${product.name}`);

                    await tx.product.update({
                        where: { id: productId },
                        data: { stock: product.stock - quantity, fullBoxes: newFB, openedBoxQuantity: newOBQ }
                    });
                }

                // Yeni item-ləri yarat
                await tx.stocktransferitem.create({
                    data: { transferId: id, productId, quantity, fullBoxes, openedBoxQuantity }
                });
            }

            // 4. Transfer recordunu yenilə
            const updatedTransfer = await tx.stocktransfer.update({
                where: { id },
                data: { toBranchId, note }
            });

            return updatedTransfer;
        });

        await createActivityLog({
            staffId,
            entityType: 'StockTransfer',
            entityId: id,
            action: 'UPDATE',
            description: `Transfer redaktə edildi: ${id}`
        });

        return res.status(200).json({ success: true, data: result });
    } catch (error) {
        console.error("updateTransfer error", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Transfer yenilənərkən xəta baş verdi"
        });
    }
};


// Transfer statusunu yenilə (Məsələn PENDING -> SHIPPED -> COMPLETED)
export const updateTransferStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // COMPLETED, CANCELLED, SHIPPED

        const transfer = await prisma.stocktransfer.findUnique({
            where: { id },
            include: { items: true }
        });

        if (!transfer) {
            return res.status(404).json({
                success: false,
                message: "Transfer tapılmadı"
            });
        }

        if (transfer.status === 'COMPLETED' || transfer.status === 'CANCELLED') {
            return res.status(400).json({
                success: false,
                message: "Tamamlanmış və ya ləğv edilmiş transferi dəyişmək olmaz"
            });
        }

        const result = await prisma.$transaction(async (tx) => {
            // Statusu yenilə
            const updated = await tx.stocktransfer.update({
                where: { id },
                data: { status }
            });

            // Əgər status COMPLETED-dirsə, filial stokunu artır
            if (status === 'COMPLETED') {
                for (const item of transfer.items) {
                    const branchStock = await tx.branchstock.findFirst({
                        where: {
                            branchId: transfer.toBranchId,
                            productId: item.productId
                        }
                    });

                    if (branchStock) {
                        // Mövcud stoku artır
                        let newFullBoxes = branchStock.fullBoxes + (item.fullBoxes || 0);
                        let newOpenedBoxQuantity = branchStock.openedBoxQuantity + (item.openedBoxQuantity || 0);

                        const product = await tx.product.findUnique({ where: { id: item.productId } });
                        if (newOpenedBoxQuantity >= (product.piecesPerBox || 1)) {
                            newFullBoxes += Math.floor(newOpenedBoxQuantity / (product.piecesPerBox || 1));
                            newOpenedBoxQuantity = newOpenedBoxQuantity % (product.piecesPerBox || 1);
                        }

                        await tx.branchstock.update({
                            where: { id: branchStock.id },
                            data: {
                                stock: branchStock.stock + item.quantity,
                                fullBoxes: newFullBoxes,
                                openedBoxQuantity: newOpenedBoxQuantity
                            }
                        });
                    } else {
                        // Yeni filial stoku yarat
                        await tx.branchstock.create({
                            data: {
                                branchId: transfer.toBranchId,
                                productId: item.productId,
                                stock: item.quantity,
                                fullBoxes: item.fullBoxes || 0,
                                openedBoxQuantity: item.openedBoxQuantity || 0
                            }
                        });
                    }
                }
            }

            // Əgər status CANCELLED-dirsə, mənbə stokuna geri qaytar
            if (status === 'CANCELLED') {
                for (const item of transfer.items) {
                    if (transfer.fromBranchId) {
                        // Filialdan filiala idi — mənbə filialına geri qaytar
                        const bs = await tx.branchstock.findFirst({
                            where: { branchId: transfer.fromBranchId, productId: item.productId }
                        });
                        const product = await tx.product.findUnique({ where: { id: item.productId } });
                        const ppb = product?.piecesPerBox || 1;

                        if (bs) {
                            let newFB = bs.fullBoxes + (item.fullBoxes || 0);
                            let newOBQ = bs.openedBoxQuantity + (item.openedBoxQuantity || 0);
                            if (newOBQ >= ppb) { newFB += Math.floor(newOBQ / ppb); newOBQ %= ppb; }
                            await tx.branchstock.update({
                                where: { id: bs.id },
                                data: { stock: bs.stock + item.quantity, fullBoxes: newFB, openedBoxQuantity: newOBQ }
                            });
                        } else {
                            await tx.branchstock.create({
                                data: {
                                    branchId: transfer.fromBranchId,
                                    productId: item.productId,
                                    stock: item.quantity,
                                    fullBoxes: item.fullBoxes || 0,
                                    openedBoxQuantity: item.openedBoxQuantity || 0
                                }
                            });
                        }
                    } else {
                        // Mərkəz bazadan idi — mərkəz stokuna geri qaytar
                        const product = await tx.product.findUnique({ where: { id: item.productId } });
                        const ppb = product.piecesPerBox || 1;
                        let newFB = product.fullBoxes + (item.fullBoxes || 0);
                        let newOBQ = product.openedBoxQuantity + (item.openedBoxQuantity || 0);
                        if (newOBQ >= ppb) { newFB += Math.floor(newOBQ / ppb); newOBQ %= ppb; }

                        await tx.product.update({
                            where: { id: item.productId },
                            data: { stock: product.stock + item.quantity, fullBoxes: newFB, openedBoxQuantity: newOBQ }
                        });

                        await tx.stockmovement.create({
                            data: {
                                productId: item.productId,
                                staffId: req.staff?.id,
                                type: 'IN',
                                quantity: item.quantity,
                                previousStock: product.stock,
                                newStock: product.stock + item.quantity,
                                note: `Transfer ləğv edildi: ${transfer.id}`
                            }
                        });
                    }
                }
            }

            return updated;
        });

        await createActivityLog({
            staffId: req.staff?.id,
            entityType: 'StockTransfer',
            entityId: id,
            action: 'UPDATE',
            description: `Transfer statusu yeniləndi: ${status}`
        });

        return res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error("updateTransferStatus error", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Status yenilənərkən xəta baş verdi"
        });
    }
};

// Bütün transferləri gətir
export const getAllTransfers = async (req, res) => {
    try {
        const { toBranchId, fromBranchId, branchId, status, productId } = req.query;
        const where = {};
        if (toBranchId) where.toBranchId = toBranchId;
        if (fromBranchId) where.fromBranchId = fromBranchId;
        if (status) where.status = status;

        if (branchId) {
            where.OR = [
                { toBranchId: branchId },
                { fromBranchId: branchId }
            ];
        }

        if (productId) {
            where.items = {
                some: {
                    productId: productId
                }
            };
        }

        const transfers = await prisma.stocktransfer.findMany({
            where,
            include: {
                fromBranch: true,
                toBranch: true,
                staff: {
                    select: {
                        name: true,
                        surName: true
                    }
                },
                items: {
                    include: {
                        product: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        const formattedTransfers = transfers.map(t => {
            const result = { ...t };
            if (productId) {
                const item = t.items.find(i => i.productId === productId);
                if (item) {
                    result.quantity = item.quantity;
                    result.fullBoxes = item.fullBoxes;
                    result.openedBoxQuantity = item.openedBoxQuantity;
                }
            }
            return result;
        });

        return res.status(200).json({
            success: true,
            data: formattedTransfers
        });
    } catch (error) {
        console.error("getAllTransfers error", error);
        return res.status(500).json({
            success: false,
            message: "Transferlər alınarkən xəta baş verdi"
        });
    }
};

export const createFilialProductTransferComplete = async (req, res) => {
    try {
        const staffId = req.staffId;
        if (!staffId) {
            return res.status(401).json({
                success: false,
                message: "Giriş tələb olunur"
            });
        }

        const { fromBranchId, toBranchId, items, note } = req.body;

        if (!fromBranchId || !toBranchId || !items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Göndərən filial, qəbul filialı və məhsullar tələb olunur"
            });
        }

        if (fromBranchId === toBranchId) {
            return res.status(400).json({
                success: false,
                message: "Göndərən və qəbul edən filial eyni ola bilməz"
            });
        }

        const auth = await assertCanCreateFilialTransfer(staffId, fromBranchId);
        if (!auth.ok) {
            return res.status(auth.status).json({ success: false, message: auth.message });
        }

        const transfer = await prisma.$transaction(async (tx) => {
            for (const item of items) {
                const { productId, quantity, fullBoxes, openedBoxQuantity } = item;
                if (!productId || !quantity || quantity < 1) {
                    throw new Error("Hər sətirdə məhsul və müsbət miqdar tələb olunur");
                }

                const branchStock = await tx.branchstock.findFirst({
                    where: { branchId: fromBranchId, productId }
                });

                if (!branchStock || branchStock.stock < quantity) {
                    const product = await tx.product.findUnique({ where: { id: productId }, select: { name: true } });
                    throw new Error(`Filialda kifayət qədər stok yoxdur: ${product?.name || productId}`);
                }

                const product = await tx.product.findUnique({ where: { id: productId } });
                const ppb = product?.piecesPerBox || 1;

                let newFB = branchStock.fullBoxes - (fullBoxes || 0);
                let newOBQ = branchStock.openedBoxQuantity - (openedBoxQuantity || 0);
                if (newOBQ < 0) {
                    newFB -= 1;
                    newOBQ += ppb;
                }
                if (newFB < 0) {
                    throw new Error(`Filialda qutu sayısı kifayət deyil: ${product?.name || productId}`);
                }

                await tx.branchstock.update({
                    where: { id: branchStock.id },
                    data: {
                        stock: branchStock.stock - quantity,
                        fullBoxes: newFB,
                        openedBoxQuantity: newOBQ
                    }
                });
            }

            const created = await tx.stocktransfer.create({
                data: {
                    toBranchId,
                    fromBranchId,
                    staffId,
                    note,
                    status: "COMPLETED"
                }
            });

            for (const item of items) {
                const { productId, quantity, fullBoxes, openedBoxQuantity } = item;
                await tx.stocktransferitem.create({
                    data: {
                        transferId: created.id,
                        productId,
                        quantity,
                        fullBoxes,
                        openedBoxQuantity
                    }
                });
                await addQuantityToDestinationBranchStock(tx, toBranchId, {
                    productId,
                    quantity,
                    fullBoxes,
                    openedBoxQuantity
                });
            }


            return created;
        });

        await createActivityLog({
            staffId,
            entityType: "StockTransfer",
            entityId: transfer.id,
            action: "CREATE",
            description: "Filialdan filiala məhsul köçürməsi (tamamlandı)"
        });

        return res.status(201).json({ success: true, data: transfer });
    } catch (error) {
        console.error("createFilialProductTransferComplete error", error);
        const msg = error.message || "Köçürmə zamanı xəta baş verdi";
        const clientError =
            /Filialda|tələb olunur|qutu sayısı|Hər sətirdə|müsbət miqdar/i.test(msg);
        return res.status(clientError ? 400 : 500).json({
            success: false,
            message: msg
        });
    }
    }

