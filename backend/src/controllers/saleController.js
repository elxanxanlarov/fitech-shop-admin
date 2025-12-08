import prisma from "../lib/prisma.js";
import { Prisma } from "@prisma/client";
import { createActivityLog } from "./activityLogController.js";
import { createReceiptForSale } from "./receiptController.js";

export const getAllSales = async (req, res) => {
    try {
        const sales = await prisma.sale.findMany({
            include: {
                items: {
                    include: {
                        product: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc',
            }
        });
        return res.status(200).json({ success: true, date: sales });
    } catch (error) {
        console.error("getAllSales error", error);
        return res.status(500).json({ success: false, message: "Satışlar siyahısı alınarkən xəta baş verdi" });
    }
};

export const getSaleById = async (req, res) => {
    try {
        const { id } = req.params;
        const sale = await prisma.sale.findUnique({
            where: { id },
            include: {
                items: {
                    include: {
                        product: true,
                        returnItems: true
                    }
                },
                returns: {
                    include: {
                        items: {
                            include: {
                                product: true,
                                saleItem: true
                            }
                        }
                    }
                }
            }
        });
        if (!sale) {
            return res.status(404).json({ success: false, message: "Satış tapılmadı" });
        }
        return res.json({ success: true, date: sale });
    } catch (error) {
        console.error("getSaleById error", error);
        return res.status(500).json({ success: false, message: "Satış tapılarkən xəta baş verdi" });
    }
};

export const createSale = async (req, res) => {
    try {
        const { customerName, customerSurname, customerPhone, items, note, paymentType } = req.body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ success: false, message: "Ən azı bir məhsul seçilməlidir" });
        }

        // Məhsulları yoxla və stokları yenilə
        let totalAmount = new Prisma.Decimal(0);
        let totalProfit = new Prisma.Decimal(0);
        const saleItems = [];

        for (const item of items) {
            const { productId, quantity } = item;
            
            if (!productId || !quantity || quantity <= 0) {
                return res.status(400).json({ success: false, message: "Məhsul ID və miqdar tələb olunur" });
            }

            const product = await prisma.product.findUnique({
                where: { id: productId }
            });

            if (!product) {
                return res.status(404).json({ success: false, message: `Məhsul tapılmadı: ${productId}` });
            }

            if (!product.isActive) {
                return res.status(400).json({ success: false, message: `Məhsul aktiv deyil: ${product.name}` });
            }

            if (product.stock < quantity) {
                return res.status(400).json({ success: false, message: `Kifayət qədər stok yoxdur: ${product.name}. Mövcud stok: ${product.stock}` });
            }

            // Qiyməti müəyyən et (endirim varsa endirim qiyməti, yoxdursa satış qiyməti)
            const pricePerItem = product.hasDiscount && product.discountPrice 
                ? product.discountPrice 
                : product.salePrice;

            const totalPrice = pricePerItem.mul(quantity);
            const purchasePriceTotal = product.purchasePrice.mul(quantity);
            const profit = totalPrice.sub(purchasePriceTotal);

            totalAmount = totalAmount.add(totalPrice);
            totalProfit = totalProfit.add(profit);

            saleItems.push({
                productId,
                quantity: parseInt(quantity),
                pricePerItem,
                totalPrice,
                purchasePrice: product.purchasePrice,
                profit
            });
        }

        // Satış yarat
        const sale = await prisma.sale.create({
            data: {
                customerName: customerName?.trim() || null,
                customerSurname: customerSurname?.trim() || null,
                customerPhone: customerPhone?.trim() || null,
                totalAmount,
                paidAmount: totalAmount, // İlkin olaraq tam ödəniş
                profitAmount: totalProfit,
                paymentType: paymentType || 'cash', // "cash" (nagd) və ya "card" (kart)
                note: note?.trim() || null,
                items: {
                    create: saleItems
                }
            },
            include: {
                items: {
                    include: {
                        product: true
                    }
                }
            }
        });

        // Stokları yenilə
        for (const item of items) {
            await prisma.product.update({
                where: { id: item.productId },
                data: {
                    stock: {
                        decrement: parseInt(item.quantity)
                    }
                }
            });
        }

        // Qəbz yarat
        try {
            await createReceiptForSale(sale);
        } catch (receiptError) {
            console.error("Qəbz yaradılarkən xəta:", receiptError);
            // Qəbz xətası əsas əməliyyatı dayandırmamalıdır
        }

        // Activity log yarat
        try {
            await createActivityLog({
                staffId: req.staffId || null,
                entityType: "Sale",
                entityId: sale.id,
                action: "SALE",
                description: `Yeni satış yaradıldı: ${sale.customerName || ''} ${sale.customerSurname || ''} - ${totalAmount.toString()} AZN`,
                changes: {
                    customerName: sale.customerName,
                    customerSurname: sale.customerSurname,
                    customerPhone: sale.customerPhone,
                    totalAmount: sale.totalAmount.toString(),
                    profitAmount: sale.profitAmount?.toString() || '0',
                    paymentType: sale.paymentType,
                    itemsCount: sale.items.length
                }
            });
        } catch (logError) {
            console.error("Activity log yaradılarkən xəta:", logError);
        }

        return res.status(201).json({ success: true, message: "Satış uğurla yaradıldı", date: sale });
    } catch (error) {
        console.error("createSale error", error);
        return res.status(500).json({ success: false, message: "Satış yaradılarkən xəta baş verdi" });
    }
};

export const updateSale = async (req, res) => {
    try {
        const { id } = req.params;
        const { customerName, customerSurname, customerPhone, paidAmount, note, paymentType } = req.body;

        const existingSale = await prisma.sale.findUnique({ 
            where: { id },
            include: { items: true }
        });
        
        if (!existingSale) {
            return res.status(404).json({ success: false, message: "Satış tapılmadı" });
        }

        const updatedSale = await prisma.sale.update({
            where: { id },
            data: {
                customerName: customerName !== undefined ? (customerName?.trim() || null) : existingSale.customerName,
                customerSurname: customerSurname !== undefined ? (customerSurname?.trim() || null) : existingSale.customerSurname,
                customerPhone: customerPhone !== undefined ? (customerPhone?.trim() || null) : existingSale.customerPhone,
                paidAmount: paidAmount !== undefined ? new Prisma.Decimal(paidAmount) : existingSale.paidAmount,
                paymentType: paymentType !== undefined ? (paymentType || 'cash') : existingSale.paymentType,
                note: note !== undefined ? (note?.trim() || null) : existingSale.note,
            },
            include: {
                items: {
                    include: {
                        product: true
                    }
                }
            }
        });

        // Activity log yarat
        try {
            const changes = {};
            if (customerName !== undefined && customerName !== existingSale.customerName) changes.customerName = { old: existingSale.customerName, new: updatedSale.customerName };
            if (customerSurname !== undefined && customerSurname !== existingSale.customerSurname) changes.customerSurname = { old: existingSale.customerSurname, new: updatedSale.customerSurname };
            if (customerPhone !== undefined && customerPhone !== existingSale.customerPhone) changes.customerPhone = { old: existingSale.customerPhone, new: updatedSale.customerPhone };
            if (paidAmount !== undefined && paidAmount.toString() !== existingSale.paidAmount.toString()) changes.paidAmount = { old: existingSale.paidAmount.toString(), new: updatedSale.paidAmount.toString() };
            if (paymentType !== undefined && paymentType !== existingSale.paymentType) changes.paymentType = { old: existingSale.paymentType, new: updatedSale.paymentType };

            await createActivityLog({
                staffId: req.staffId || null,
                entityType: "Sale",
                entityId: updatedSale.id,
                action: "UPDATE",
                description: `Satış yeniləndi: ${updatedSale.customerName || ''} ${updatedSale.customerSurname || ''}`,
                changes: Object.keys(changes).length > 0 ? changes : null
            });
        } catch (logError) {
            console.error("Activity log yaradılarkən xəta:", logError);
        }

        return res.status(200).json({ success: true, message: "Satış yeniləndi", date: updatedSale });
    } catch (error) {
        console.error("updateSale error", error);
        return res.status(500).json({ success: false, message: "Satış yenilənərkən xəta baş verdi" });
    }
};

export const deleteSale = async (req, res) => {
    try {
        const { id } = req.params;
        const existingSale = await prisma.sale.findUnique({ 
            where: { id },
            include: { items: true }
        });
        
        if (!existingSale) {
            return res.status(404).json({ success: false, message: "Satış tapılmadı" });
        }

        // Stokları geri qaytar
        for (const item of existingSale.items) {
            await prisma.product.update({
                where: { id: item.productId },
                data: {
                    stock: {
                        increment: item.quantity
                    }
                }
            });
        }

        await prisma.sale.delete({ where: { id } });

        // Activity log yarat
        try {
            await createActivityLog({
                staffId: req.staffId || null,
                entityType: "Sale",
                entityId: existingSale.id,
                action: "DELETE",
                description: `Satış silindi: ${existingSale.customerName || ''} ${existingSale.customerSurname || ''} - ${existingSale.totalAmount.toString()} AZN`,
                changes: {
                    customerName: existingSale.customerName,
                    customerSurname: existingSale.customerSurname,
                    totalAmount: existingSale.totalAmount.toString(),
                    itemsCount: existingSale.items.length
                }
            });
        } catch (logError) {
            console.error("Activity log yaradılarkən xəta:", logError);
        }

        return res.json({ success: true, message: "Satış silindi", date: existingSale });
    } catch (error) {
        console.error("deleteSale error", error);
        return res.status(500).json({ success: false, message: "Satış silinərkən xəta baş verdi" });
    }
};

