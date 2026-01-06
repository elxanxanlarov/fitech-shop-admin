import prisma from "../lib/prisma.js";
import { Prisma } from "@prisma/client";
import { createActivityLog } from "./activityLogController.js";
import { createReceiptForSale } from "./receiptController.js";
import { decreaseProductStock, increaseProductStock, calculateProductPrice, calculateProductStock } from "../utils/productStockHelper.js";

export const getAllSales = async (req, res) => {
    try {
        const { deleteType, includeDeleted, startDate, endDate } = req.query;
        
        const where = {};
        
        // DeleteType filter - default olaraq yalnız silinməyən satışları göstər
        if (includeDeleted === 'true') {
            // Bütün satışları göstər (silinmişlər də daxil)
        } else if (deleteType) {
            where.deleteType = deleteType.toUpperCase();
        } else {
            // Default: yalnız silinməyən satışları göstər
            where.deleteType = 'NONE';
        }
        
        // Date filter - tarix aralığına görə filtrlə
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) {
                // Başlanğıc tarix: günün başlanğıcı (00:00:00)
                const start = new Date(startDate);
                start.setHours(0, 0, 0, 0);
                where.createdAt.gte = start;
            }
            if (endDate) {
                // Son tarix: günün sonu (23:59:59)
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                where.createdAt.lte = end;
            }
        }
        
        const sales = await prisma.sale.findMany({
            where,
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
        return res.status(200).json({ success: true, data: sales });
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
        return res.status(200).json({ success: true, data: sale });
    } catch (error) {
        console.error("getSaleById error", error);
        return res.status(500).json({ success: false, message: "Satış tapılarkən xəta baş verdi" });
    }
};

export const createSale = async (req, res) => {
    try {
        const { 
            customerName, 
            customerSurname, 
            customerPhone, 
            items, 
            note, 
            paymentType,
            isCredit,
            creditTermId
        } = req.body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ success: false, message: "Ən azı bir məhsul seçilməlidir" });
        }

        // Məhsulları yoxla və stokları yenilə
        let totalAmount = new Prisma.Decimal(0);
        let totalProfit = new Prisma.Decimal(0);
        const saleItems = [];

        for (const item of items) {
            const { productId, quantity, pricePerItem: customPricePerItem } = item;
            
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

            // Stock yoxla (qutu/ədəd məntiqinə uyğun)
            const availableStock = calculateProductStock(product);
            if (availableStock < quantity) {
                return res.status(400).json({ 
                    success: false, 
                    message: `Kifayət qədər stok yoxdur: ${product.name}. Mövcud stok: ${availableStock}` 
                });
            }

            // Qiyməti müəyyən et (qutu/ədəd məntiqinə uyğun)
            let totalPrice;
            if (customPricePerItem !== undefined && customPricePerItem !== null && !isNaN(parseFloat(customPricePerItem))) {
                // Custom price verilib, onu istifadə et
                const customPrice = new Prisma.Decimal(parseFloat(customPricePerItem));
                if (customPrice.lt(0)) {
                    return res.status(400).json({ success: false, message: `Qiymət mənfi ola bilməz: ${product.name}` });
                }
                totalPrice = customPrice.mul(quantity);
            } else {
                // Qutu/ədəd məntiqinə uyğun qiymət hesabla
                const calculatedPrice = calculateProductPrice(product, quantity);
                totalPrice = new Prisma.Decimal(calculatedPrice);
            }

            // pricePerItem-i hesabla (statistika üçün)
            const pricePerItem = totalPrice.div(quantity);

            // Purchase price hesabla
            const purchasePricePerItem = product.purchasePrice;
            const purchasePriceTotal = purchasePricePerItem.mul(quantity);
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

        // Kredit məntiqini hesabla
        let creditData = {};
        if (isCredit && creditTermId) {
            const creditTerm = await prisma.creditTerm.findUnique({
                where: { id: creditTermId }
            });

            if (!creditTerm) {
                return res.status(404).json({
                    success: false,
                    message: "Kredit müddəti tapılmadı"
                });
            }

            if (!creditTerm.isActive) {
                return res.status(400).json({
                    success: false,
                    message: "Bu kredit müddəti aktiv deyil"
                });
            }

            // Faizlə birlikdə ümumi məbləğ
            const interestRate = creditTerm.interestRate.div(100); // 4.3% -> 0.043
            const creditTotalAmount = totalAmount.mul(new Prisma.Decimal(1).add(interestRate));
            
            // Aylıq ödəniş (faizsiz bölünür)
            const monthlyPayment = totalAmount.div(creditTerm.months);
            
            // Kredit başlama və bitmə tarixləri
            const creditStartDate = new Date();
            const creditEndDate = new Date(creditStartDate);
            creditEndDate.setMonth(creditStartDate.getMonth() + creditTerm.months);

            creditData = {
                isCredit: true,
                creditTermId: creditTermId,
                creditInterestPercent: creditTerm.interestRate,
                creditTotalAmount: creditTotalAmount,
                creditRemainingAmount: creditTotalAmount, // İlkin olaraq tam məbləğ qalır
                creditMonthlyPayment: monthlyPayment,
                creditStartDate: creditStartDate,
                creditEndDate: creditEndDate,
                isCreditPaid: false,
                paidAmount: new Prisma.Decimal(0) // Kreditdə ilkin ödəniş 0
            };
        }

        // Satış yarat
        const sale = await prisma.sale.create({
            data: {
                customerName: customerName?.trim() || null,
                customerSurname: customerSurname?.trim() || null,
                customerPhone: customerPhone?.trim() || null,
                totalAmount,
                paidAmount: isCredit ? new Prisma.Decimal(0) : totalAmount, // Kreditdə 0, normalda tam
                profitAmount: totalProfit,
                paymentType: paymentType || 'cash', // "cash" (nagd) və ya "card" (kart)
                note: note?.trim() || null,
                ...creditData,
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

        // Stokları yenilə (qutu/ədəd məntiqinə uyğun)
        for (const item of saleItems) {
            const product = await prisma.product.findUnique({
                where: { id: item.productId }
            });

            if (!product) continue;

            try {
                // Stok azalt (qutu/ədəd məntiqinə uyğun)
                const newStockData = decreaseProductStock(product, item.quantity);

                await prisma.product.update({
                    where: { id: item.productId },
                    data: {
                        stock: newStockData.stock,
                        fullBoxes: newStockData.fullBoxes,
                        openedBoxQuantity: newStockData.openedBoxQuantity
                    }
                });
            } catch (stockError) {
                console.error(`Stok yenilənərkən xəta (${product.name}):`, stockError);
                // Xətanı log et, amma satışı ləğv etmə
            }
        }

        // Qəbz yarat
        try {
            await createReceiptForSale(sale);
        } catch (receiptError) {
            console.error("Qəbz yaradılarkən xəta:", receiptError);
            // Qəbz xətası əsas əməliyyatı dayandırmamalıdır
        }

        // Əgər kredit satışıdırsa və ilk ödəniş məbləği varsa, ilk ödənişi yarat
        if (isCredit && creditTermId && req.body.initialPaymentAmount && parseFloat(req.body.initialPaymentAmount) > 0) {
            try {
                const initialPaymentAmount = new Prisma.Decimal(req.body.initialPaymentAmount);
                const initialPaymentType = req.body.initialPaymentType || 'cash';
                
                // İlk ödənişi yarat
                await prisma.creditPayment.create({
                    data: {
                        saleId: sale.id,
                        amount: initialPaymentAmount,
                        paymentType: initialPaymentType,
                        paymentDate: new Date(),
                        note: 'Bu ayın ödənişi',
                        staffId: req.staffId || null
                    }
                });
                
                // Satışın paidAmount və creditRemainingAmount-u yenilə
                const newRemainingAmount = creditData.creditTotalAmount.sub(initialPaymentAmount);
                const isFullyPaid = newRemainingAmount.lte(0);
                
                await prisma.sale.update({
                    where: { id: sale.id },
                    data: {
                        paidAmount: initialPaymentAmount,
                        creditRemainingAmount: isFullyPaid ? new Prisma.Decimal(0) : newRemainingAmount,
                        isCreditPaid: isFullyPaid
                    }
                });
            } catch (paymentError) {
                console.error("İlk ödəniş yaradılarkən xəta:", paymentError);
                // Ödəniş xətası əsas əməliyyatı dayandırmamalıdır
            }
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
        const { customerName, customerSurname, customerPhone, paidAmount, note, paymentType, deleteType } = req.body;

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
                deleteType: deleteType !== undefined ? deleteType.toUpperCase() : existingSale.deleteType,
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
        const { deleteType = 'SOFT' } = req.body; // Default: SOFT delete
        
        // Ensure deleteType is valid
        const validDeleteType = (deleteType && typeof deleteType === 'string' && deleteType.toUpperCase() === 'HARD') ? 'HARD' : 'SOFT';
        
        console.log(`deleteSale request, id: ${id}, deleteType: ${validDeleteType}`);
        const existingSale = await prisma.sale.findUnique({ 
            where: { id },
            include: { items: true }
        });
        
        if (!existingSale) {
            return res.status(404).json({ success: false, message: "Satış tapılmadı" });
        }

        // DeleteType-a görə silmə
        if (validDeleteType === 'HARD') {
            // Hard delete - stokları geri qaytar və tamamilə sil
            // Qaytarmaları yüklə (qalan miqdarı hesablamaq üçün)
            const saleReturns = await prisma.saleReturn.findMany({
                where: { saleId: id },
                include: {
                    items: {
                        include: {
                            saleItem: true
                        }
                    }
                }
            });

            // Hər bir sale item üçün qaytarılan miqdarı hesabla
            const returnedQuantities = new Map();
            saleReturns.forEach(saleReturn => {
                saleReturn.items.forEach(returnItem => {
                    const saleItemId = returnItem.saleItemId;
                    const returnedQty = returnItem.quantity || 0;
                    const currentReturned = returnedQuantities.get(saleItemId) || 0;
                    returnedQuantities.set(saleItemId, currentReturned + returnedQty);
                });
            });

            // Remove related records that reference Sale to avoid foreign key constraint errors
            try {
                const saleItemIds = existingSale.items.map(i => i.id);

                // 1) Delete SaleReturnItem entries that reference these sale items
                if (saleItemIds.length > 0) {
                    console.log(`Deleting SaleReturnItem by saleItemId count: ${saleItemIds.length}`);
                    await prisma.saleReturnItem.deleteMany({ where: { saleItemId: { in: saleItemIds } } });
                }

                // 2) Find SaleReturn records for this sale and delete their items
                // QAYTARMALARI SİL (lakin stokları azaltma, çünki biz sonra qalan miqdarı geri qaytaracağıq)
                const returnIds = saleReturns.map(r => r.id);
                if (returnIds.length > 0) {
                    console.log(`Deleting SaleReturnItem by returnId count: ${returnIds.length}`);
                    await prisma.saleReturnItem.deleteMany({ where: { returnId: { in: returnIds } } });
                    console.log(`Deleting SaleReturn records count: ${returnIds.length}`);
                    await prisma.saleReturn.deleteMany({ where: { id: { in: returnIds } } });
                }

                // 3) İndi stokları geri qaytar (yalnız qalan miqdarı)
                // Qaytarma silindiyi üçün artıq qaytarma miqdarı stokda deyil
                // Biz yalnız qalan (satış - qaytarma) miqdarı geri qaytarmalıyıq
                for (const item of existingSale.items) {
                    const returnedQty = returnedQuantities.get(item.id) || 0;
                    const remainingQty = item.quantity - returnedQty; // Qalan miqdar
                    
                    // Əgər qalan miqdar varsa, yalnız onu geri qaytar
                    if (remainingQty > 0) {
                        const product = await prisma.product.findUnique({
                            where: { id: item.productId }
                        });

                        if (product) {
                            try {
                                // Stok artır (qutu/ədəd məntiqinə uyğun)
                                const newStockData = increaseProductStock(product, remainingQty);

                                await prisma.product.update({
                                    where: { id: item.productId },
                                    data: {
                                        stock: newStockData.stock,
                                        fullBoxes: newStockData.fullBoxes,
                                        openedBoxQuantity: newStockData.openedBoxQuantity
                                    }
                                });
                            } catch (stockError) {
                                console.error(`Stok yenilənərkən xəta (${product.name}):`, stockError);
                                // Xətanı log et, amma silməni dayandırma
                            }
                        }
                    }
                }

                // 4) Delete SaleItem records for this sale
                if (saleItemIds.length > 0) {
                    console.log(`Deleting SaleItem records count: ${saleItemIds.length}`);
                    await prisma.saleItem.deleteMany({ where: { id: { in: saleItemIds } } });
                }

                // 4) Delete any receipts linked to this sale (should cascade, but be explicit)
                console.log(`Deleting Receipt(s) for sale id: ${id}`);
                await prisma.receipt.deleteMany({ where: { saleId: id } });

                // Finally, delete the sale
                await prisma.sale.delete({ where: { id } });
            } catch (deleteError) {
                console.error('Error while deleting related sale records', deleteError);
                throw deleteError; // will be caught by outer catch
            }

            // Activity log yarat
            try {
                await createActivityLog({
                    staffId: req.staffId || null,
                    entityType: "Sale",
                    entityId: existingSale.id,
                    action: "HARD_DELETE",
                    description: `Satış tamamilə silindi: ${existingSale.customerName || ''} ${existingSale.customerSurname || ''} - ${existingSale.totalAmount.toString()} AZN`,
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
        } else {
            // Soft delete - deleteType-u dəyiş
            await prisma.sale.update({
                where: { id },
                data: {
                    deleteType: 'SOFT'
                }
            });

            // Activity log yarat
            try {
                await createActivityLog({
                    staffId: req.staffId || null,
                    entityType: "Sale",
                    entityId: existingSale.id,
                    action: "SOFT_DELETE",
                    description: `Satış soft delete edildi: ${existingSale.customerName || ''} ${existingSale.customerSurname || ''} - ${existingSale.totalAmount.toString()} AZN`,
                    changes: {
                        customerName: existingSale.customerName,
                        customerSurname: existingSale.customerSurname,
                        totalAmount: existingSale.totalAmount.toString(),
                        itemsCount: existingSale.items.length,
                        deleteType: 'SOFT'
                    }
                });
            } catch (logError) {
                console.error("Activity log yaradılarkən xəta:", logError);
            }
        }

        return res.json({ success: true, message: validDeleteType === 'HARD' ? "Satış tamamilə silindi" : "Satış soft delete edildi", data: existingSale });
    } catch (error) {
        console.error("deleteSale error", error);
        // Return error message for debugging (can be removed in production)
        return res.status(500).json({ success: false, message: "Satış silinərkən xəta baş verdi", error: error.message });
    }
};

