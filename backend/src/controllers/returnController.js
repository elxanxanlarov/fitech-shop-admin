import prisma from "../lib/prisma.js";
import { Prisma } from "@prisma/client";
import { createActivityLog } from "./activityLogController.js";

export const getAllReturns = async (req, res) => {
    try {
        const returns = await prisma.saleReturn.findMany({
            include: {
                sale: true,
                items: {
                    include: {
                        product: true,
                        saleItem: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc',
            }
        });
        return res.status(200).json({ success: true, date: returns });
    } catch (error) {
        console.error("getAllReturns error", error);
        return res.status(500).json({ success: false, message: "Qaytarmalar siyahısı alınarkən xəta baş verdi" });
    }
};

export const getReturnById = async (req, res) => {
    try {
        const { id } = req.params;
        const returnItem = await prisma.saleReturn.findUnique({
            where: { id },
            include: {
                sale: {
                    include: {
                        items: {
                            include: {
                                product: true
                            }
                        }
                    }
                },
                items: {
                    include: {
                        product: true,
                        saleItem: {
                            include: {
                                product: true
                            }
                        }
                    }
                }
            }
        });
        if (!returnItem) {
            return res.status(404).json({ success: false, message: "Qaytarma tapılmadı" });
        }
        return res.json({ success: true, date: returnItem });
    } catch (error) {
        console.error("getReturnById error", error);
        return res.status(500).json({ success: false, message: "Qaytarma tapılarkən xəta baş verdi" });
    }
};

export const getReturnsBySaleId = async (req, res) => {
    try {
        const { saleId } = req.params;
        const returns = await prisma.saleReturn.findMany({
            where: { saleId },
            include: {
                items: {
                    include: {
                        product: true,
                        saleItem: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc',
            }
        });
        return res.status(200).json({ success: true, date: returns });
    } catch (error) {
        console.error("getReturnsBySaleId error", error);
        return res.status(500).json({ success: false, message: "Qaytarmalar siyahısı alınarkən xəta baş verdi" });
    }
};

export const createReturn = async (req, res) => {
    try {
        const { saleId, customerName, customerSurname, customerPhone, items, reason, note } = req.body;

        if (!saleId) {
            return res.status(400).json({ success: false, message: "Satış ID tələb olunur" });
        }

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ success: false, message: "Ən azı bir məhsul seçilməlidir" });
        }

        // Satışı yoxla
        const sale = await prisma.sale.findUnique({
            where: { id: saleId },
            include: {
                items: {
                    include: {
                        product: true,
                        returnItems: true
                    }
                }
            }
        });

        if (!sale) {
            return res.status(404).json({ success: false, message: "Satış tapılmadı" });
        }

        let totalAmount = new Prisma.Decimal(0);
        let returnedAmount = new Prisma.Decimal(0);
        let totalLoss = new Prisma.Decimal(0);
        const returnItems = [];

        for (const item of items) {
            const { saleItemId, quantity } = item;
            
            if (!saleItemId || !quantity || quantity <= 0) {
                return res.status(400).json({ success: false, message: "Sale Item ID və miqdar tələb olunur" });
            }

            // Sale item-ı tap
            const saleItem = sale.items.find(si => si.id === saleItemId);
            if (!saleItem) {
                return res.status(404).json({ success: false, message: `Satış məhsulu tapılmadı: ${saleItemId}` });
            }

            // Artıq qaytarılmış miqdarı hesabla
            const alreadyReturned = saleItem.returnItems.reduce((sum, ri) => sum + ri.quantity, 0);
            const availableToReturn = saleItem.quantity - alreadyReturned;

            if (quantity > availableToReturn) {
                return res.status(400).json({ 
                    success: false, 
                    message: `Qaytarma miqdarı çox böyükdür. Mövcud qaytarıla bilən: ${availableToReturn}` 
                });
            }

            const pricePerItem = saleItem.pricePerItem;
            const totalPrice = pricePerItem.mul(quantity);
            const purchasePriceTotal = saleItem.purchasePrice.mul(quantity);
            const loss = totalPrice.sub(purchasePriceTotal); // Qaytarma zamanı zərər

            totalAmount = totalAmount.add(totalPrice);
            returnedAmount = returnedAmount.add(totalPrice);
            totalLoss = totalLoss.add(loss);

            returnItems.push({
                saleItemId,
                productId: saleItem.productId,
                quantity: parseInt(quantity),
                pricePerItem,
                totalPrice,
                purchasePrice: saleItem.purchasePrice,
                loss
            });
        }

        // Qaytarma yarat
        const returnRecord = await prisma.saleReturn.create({
            data: {
                saleId,
                customerName: customerName?.trim() || sale.customerName || null,
                customerSurname: customerSurname?.trim() || sale.customerSurname || null,
                customerPhone: customerPhone?.trim() || sale.customerPhone || null,
                totalAmount,
                returnedAmount,
                reason: reason?.trim() || null,
                note: note?.trim() || null,
                items: {
                    create: returnItems
                }
            },
            include: {
                sale: true,
                items: {
                    include: {
                        product: true,
                        saleItem: true
                    }
                }
            }
        });

        // Stokları geri qaytar
        for (const item of returnItems) {
            await prisma.product.update({
                where: { id: item.productId },
                data: {
                    stock: {
                        increment: item.quantity
                    }
                }
            });
        }

        // Sale-də isRefunded-i true et
        await prisma.sale.update({
            where: { id: saleId },
            data: {
                isRefunded: true,
                refundedAt: new Date()
            }
        });

        // Activity log yarat
        try {
            await createActivityLog({
                staffId: req.staffId || null,
                entityType: "SaleReturn",
                entityId: returnRecord.id,
                action: "RETURN",
                description: `Qaytarma yaradıldı: ${returnRecord.customerName || ''} ${returnRecord.customerSurname || ''} - ${returnRecord.returnedAmount.toString()} AZN`,
                changes: {
                    saleId: returnRecord.saleId,
                    customerName: returnRecord.customerName,
                    customerSurname: returnRecord.customerSurname,
                    totalAmount: returnRecord.totalAmount.toString(),
                    returnedAmount: returnRecord.returnedAmount.toString(),
                    reason: returnRecord.reason,
                    itemsCount: returnRecord.items.length
                }
            });
        } catch (logError) {
            console.error("Activity log yaradılarkən xəta:", logError);
        }

        return res.status(201).json({ 
            success: true, 
            message: "Qaytarma uğurla yaradıldı", 
            date: returnRecord 
        });
    } catch (error) {
        console.error("createReturn error", error);
        return res.status(500).json({ success: false, message: "Qaytarma yaradılarkən xəta baş verdi" });
    }
};

export const updateReturn = async (req, res) => {
    try {
        const { id } = req.params;
        const { customerName, customerSurname, customerPhone, reason, note } = req.body;

        const existingReturn = await prisma.saleReturn.findUnique({ 
            where: { id },
            include: { items: true }
        });
        
        if (!existingReturn) {
            return res.status(404).json({ success: false, message: "Qaytarma tapılmadı" });
        }

        const updatedReturn = await prisma.saleReturn.update({
            where: { id },
            data: {
                customerName: customerName !== undefined ? (customerName?.trim() || null) : existingReturn.customerName,
                customerSurname: customerSurname !== undefined ? (customerSurname?.trim() || null) : existingReturn.customerSurname,
                customerPhone: customerPhone !== undefined ? (customerPhone?.trim() || null) : existingReturn.customerPhone,
                reason: reason !== undefined ? (reason?.trim() || null) : existingReturn.reason,
                note: note !== undefined ? (note?.trim() || null) : existingReturn.note,
            },
            include: {
                sale: true,
                items: {
                    include: {
                        product: true,
                        saleItem: true
                    }
                }
            }
        });

        // Activity log yarat
        try {
            const changes = {};
            if (customerName !== undefined && customerName !== existingReturn.customerName) changes.customerName = { old: existingReturn.customerName, new: updatedReturn.customerName };
            if (customerSurname !== undefined && customerSurname !== existingReturn.customerSurname) changes.customerSurname = { old: existingReturn.customerSurname, new: updatedReturn.customerSurname };
            if (customerPhone !== undefined && customerPhone !== existingReturn.customerPhone) changes.customerPhone = { old: existingReturn.customerPhone, new: updatedReturn.customerPhone };
            if (reason !== undefined && reason !== existingReturn.reason) changes.reason = { old: existingReturn.reason, new: updatedReturn.reason };

            await createActivityLog({
                staffId: req.staffId || null,
                entityType: "SaleReturn",
                entityId: updatedReturn.id,
                action: "UPDATE",
                description: `Qaytarma yeniləndi: ${updatedReturn.customerName || ''} ${updatedReturn.customerSurname || ''}`,
                changes: Object.keys(changes).length > 0 ? changes : null
            });
        } catch (logError) {
            console.error("Activity log yaradılarkən xəta:", logError);
        }

        return res.status(200).json({ success: true, message: "Qaytarma yeniləndi", date: updatedReturn });
    } catch (error) {
        console.error("updateReturn error", error);
        return res.status(500).json({ success: false, message: "Qaytarma yenilənərkən xəta baş verdi" });
    }
};

export const deleteReturn = async (req, res) => {
    try {
        const { id } = req.params;
        const existingReturn = await prisma.saleReturn.findUnique({ 
            where: { id },
            include: { 
                items: {
                    include: {
                        product: true
                    }
                }
            }
        });
        
        if (!existingReturn) {
            return res.status(404).json({ success: false, message: "Qaytarma tapılmadı" });
        }

        // Stokları geri çıxar (qaytarma silinəndə stoklar azalmalıdır)
        for (const item of existingReturn.items) {
            await prisma.product.update({
                where: { id: item.productId },
                data: {
                    stock: {
                        decrement: item.quantity
                    }
                }
            });
        }

        await prisma.saleReturn.delete({ where: { id } });

        // Activity log yarat
        try {
            await createActivityLog({
                staffId: req.staffId || null,
                entityType: "SaleReturn",
                entityId: existingReturn.id,
                action: "DELETE",
                description: `Qaytarma silindi: ${existingReturn.customerName || ''} ${existingReturn.customerSurname || ''} - ${existingReturn.returnedAmount.toString()} AZN`,
                changes: {
                    saleId: existingReturn.saleId,
                    customerName: existingReturn.customerName,
                    customerSurname: existingReturn.customerSurname,
                    returnedAmount: existingReturn.returnedAmount.toString(),
                    itemsCount: existingReturn.items.length
                }
            });
        } catch (logError) {
            console.error("Activity log yaradılarkən xəta:", logError);
        }

        return res.json({ success: true, message: "Qaytarma silindi", date: existingReturn });
    } catch (error) {
        console.error("deleteReturn error", error);
        return res.status(500).json({ success: false, message: "Qaytarma silinərkən xəta baş verdi" });
    }
};

