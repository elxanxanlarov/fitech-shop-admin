import prisma from "../lib/prisma.js";

// Bütün bildirişləri əldə et
export const getAllNotifications = async (req, res) => {
    try {
        const { isRead, branchId } = req.query;

        const where = {};
        if (isRead !== undefined) {
            where.isRead = isRead === 'true';
        }
        if (branchId) {
            where.OR = [
                { branchId: branchId },
                { branchId: null } // Global notifications
            ];
        }

        const notifications = await prisma.notification.findMany({
            where,
            include: {
                sale: {
                    select: {
                        id: true,
                        customerName: true,
                        customerSurname: true,
                        customerPhone: true,
                        creditTotalAmount: true,
                        creditRemainingAmount: true,
                        creditMonthlyPayment: true,
                        creditStartDate: true,
                        creditEndDate: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        return res.status(200).json({
            success: true,
            date: notifications
        });
    } catch (error) {
        console.error("getAllNotifications error", error);
        return res.status(500).json({
            success: false,
            message: "Bildirişlər alınarkən xəta baş verdi"
        });
    }
};

// Bildirişi oxunmuş kimi işarələ
export const markNotificationAsRead = async (req, res) => {
    try {
        const { id } = req.params;

        const notification = await prisma.notification.update({
            where: { id },
            data: {
                isRead: true,
                readAt: new Date()
            }
        });

        return res.status(200).json({
            success: true,
            date: notification
        });
    } catch (error) {
        console.error("markNotificationAsRead error", error);
        return res.status(500).json({
            success: false,
            message: "Bildiriş yenilənərkən xəta baş verdi"
        });
    }
};

// Bütün bildirişləri oxunmuş kimi işarələ
export const markAllNotificationsAsRead = async (req, res) => {
    try {
        await prisma.notification.updateMany({
            where: {
                isRead: false
            },
            data: {
                isRead: true,
                readAt: new Date()
            }
        });

        return res.status(200).json({
            success: true,
            message: "Bütün bildirişlər oxunmuş kimi işarələndi"
        });
    } catch (error) {
        console.error("markAllNotificationsAsRead error", error);
        return res.status(500).json({
            success: false,
            message: "Bildirişlər yenilənərkən xəta baş verdi"
        });
    }
};

// Bildiriş yarat (helper function)
export const createNotification = async (data) => {
    try {
        const notification = await prisma.notification.create({
            data: {
                type: data.type,
                title: data.title,
                message: data.message,
                saleId: data.saleId || null,
                branchId: data.branchId || null,
                dueDate: data.dueDate || null
            }
        });
        return notification;
    } catch (error) {
        console.error("createNotification error", error);
        return null;
    }
};

// Kredit ödəniş bildirişləri yarat (scheduler üçün)
export const checkCreditPaymentDue = async () => {
    try {
        const today = new Date();
        const threeDaysLater = new Date(today);
        threeDaysLater.setDate(today.getDate() + 3);

        // Aktiv kredit satışları
        const activeCredits = await prisma.sale.findMany({
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
                },
                notifications: {
                    where: {
                        type: 'credit_payment_due',
                        isRead: false
                    }
                }
            }
        });

        for (const credit of activeCredits) {
            if (!credit.creditStartDate || !credit.creditTerm) continue;

            // Növbəti ödəniş tarixini hesabla
            const startDate = new Date(credit.creditStartDate);
            const months = credit.creditTerm.months;
            
            // İlk ödəniş tarixi (1 ay sonra)
            let nextPaymentDate = new Date(startDate);
            nextPaymentDate.setMonth(startDate.getMonth() + 1);

            // Əgər ödənişlər varsa, son ödənişdən sonraki ayı hesabla
            if (credit.creditPayments.length > 0) {
                const lastPayment = credit.creditPayments[0];
                const lastPaymentDate = new Date(lastPayment.paymentDate);
                nextPaymentDate = new Date(lastPaymentDate);
                nextPaymentDate.setMonth(lastPaymentDate.getMonth() + 1);
            }

            // 3 gün qalıb ödəniş tarixi
            const threeDaysBefore = new Date(nextPaymentDate);
            threeDaysBefore.setDate(nextPaymentDate.getDate() - 3);

            // Bugün 3 gün qalıb tarixindədirsə və bildiriş yoxdursa
            if (
                today >= threeDaysBefore && 
                today <= nextPaymentDate &&
                credit.notifications.length === 0
            ) {
                const customerName = credit.customerName || 'Müştəri';
                const customerSurname = credit.customerSurname || '';
                const customerFullName = `${customerName} ${customerSurname}`.trim();
                
                await createNotification({
                    type: 'credit_payment_due',
                    title: 'Kredit ödənişi yaxınlaşır',
                    message: `${customerFullName} müştərisinin ${nextPaymentDate.toLocaleDateString('az-AZ')} tarixində ${credit.creditMonthlyPayment?.toString() || '0'} AZN kredit ödənişi var.`,
                    saleId: credit.id,
                    dueDate: nextPaymentDate
                });
            }
        }

        return { success: true, checked: activeCredits.length };
    } catch (error) {
        console.error("checkCreditPaymentDue error", error);
        return { success: false, error: error.message };
    }
};

