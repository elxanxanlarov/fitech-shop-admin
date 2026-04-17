import prisma from "../lib/prisma.js";
import { Prisma } from "@prisma/client";
import { createActivityLog } from "./activityLogController.js";

// Kredit ödənişi et
export const makeCreditPayment = async (req, res) => {
    try {
        const { saleId, amount, paymentType, note } = req.body;
        const staffId = req.user?.id;

        if (!saleId || !amount) {
            return res.status(400).json({
                success: false,
                message: "Satış ID və məbləğ tələb olunur"
            });
        }

        // Satışı yoxla
        const sale = await prisma.sale.findUnique({
            where: { id: saleId },
            include: {
                creditTerm: true,
                creditPayments: true
            }
        });

        if (!sale) {
            return res.status(404).json({
                success: false,
                message: "Satış tapılmadı"
            });
        }

        if (!sale.isCredit) {
            return res.status(400).json({
                success: false,
                message: "Bu satış kredit satışı deyil"
            });
        }

        if (sale.isCreditPaid) {
            return res.status(400).json({
                success: false,
                message: "Bu kredit artıq tam ödənilib"
            });
        }

        const paymentAmount = new Prisma.Decimal(amount);
        const remainingAmount = sale.creditRemainingAmount || sale.creditTotalAmount || new Prisma.Decimal(0);

        if (paymentAmount.gt(remainingAmount)) {
            return res.status(400).json({
                success: false,
                message: `Ödəniş məbləği qalan məbləğdən çox ola bilməz. Qalan məbləğ: ${remainingAmount.toString()}`
            });
        }

        // Ödəniş yarat
        const payment = await prisma.creditpayment.create({
            data: {
                saleId,
                amount: paymentAmount,
                paymentType: paymentType || 'cash',
                note: note?.trim() || null,
                staffId: staffId || null,
                branchId: sale.branchId // Satış olan filialı qeyd et
            }
        });

        // Qalan məbləği hesabla
        const newRemainingAmount = remainingAmount.sub(paymentAmount);
        const isFullyPaid = newRemainingAmount.lte(0);

        // Satışı yenilə
        await prisma.sale.update({
            where: { id: saleId },
            data: {
                creditRemainingAmount: isFullyPaid ? new Prisma.Decimal(0) : newRemainingAmount,
                isCreditPaid: isFullyPaid,
                paidAmount: sale.paidAmount.add(paymentAmount)
            }
        });

        // Əgər kredit tam ödənilibsə, bildirişləri sil
        if (isFullyPaid) {
            await prisma.notification.deleteMany({
                where: {
                    saleId: saleId,
                    type: 'credit_payment_due'
                }
            });
        }

        // Activity log
        try {
            await createActivityLog({
                staffId: staffId || null,
                entityType: "CreditPayment",
                entityId: payment.id,
                action: "CREATE",
                description: `Kredit ödənişi edildi: ${paymentAmount.toString()} AZN`,
                changes: {
                    saleId: saleId,
                    amount: paymentAmount.toString(),
                    remainingAmount: newRemainingAmount.toString()
                }
            });
        } catch (logError) {
            console.error("Activity log error:", logError);
        }

        return res.status(201).json({
            success: true,
            date: payment,
            remainingAmount: newRemainingAmount.toString(),
            isFullyPaid
        });
    } catch (error) {
        console.error("makeCreditPayment error", error);
        return res.status(500).json({
            success: false,
            message: "Kredit ödənişi edilərkən xəta baş verdi"
        });
    }
};

// Satışın kredit ödənişləri
export const getSaleCreditPayments = async (req, res) => {
    try {
        const { saleId } = req.params;

        const payments = await prisma.creditpayment.findMany({
            where: { saleId },
            include: {
                staff: {
                    select: {
                        id: true,
                        name: true,
                        surName: true
                    }
                }
            },
            orderBy: {
                paymentDate: 'desc'
            }
        });

        return res.status(200).json({
            success: true,
            date: payments
        });
    } catch (error) {
        console.error("getSaleCreditPayments error", error);
        return res.status(500).json({
            success: false,
            message: "Kredit ödənişləri alınarkən xəta baş verdi"
        });
    }
};

// Bütün aktiv kredit satışları
export const getActiveCredits = async (req, res) => {
    try {
        const credits = await prisma.sale.findMany({
            where: {
                isCredit: true,
                isCreditPaid: false
            },
            include: {
                creditTerm: true,
                creditPayments: {
                    orderBy: {
                        paymentDate: 'desc'
                    }
                }
            },
            orderBy: {
                creditStartDate: 'asc'
            }
        });

        return res.status(200).json({
            success: true,
            date: credits
        });
    } catch (error) {
        console.error("getActiveCredits error", error);
        return res.status(500).json({
            success: false,
            message: "Aktiv kreditlər alınarkən xəta baş verdi"
        });
    }
};

