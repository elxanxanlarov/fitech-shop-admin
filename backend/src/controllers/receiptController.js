import prisma from '../lib/prisma.js';

// Qəbz nömrəsi yarat
const generateReceiptNumber = async () => {
    const year = new Date().getFullYear();
    const prefix = `REC-${year}-`;
    
    // Bu il üçün son qəbz nömrəsini tap
    const lastReceipt = await prisma.receipt.findFirst({
        where: {
            receiptNumber: {
                startsWith: prefix
            }
        },
        orderBy: {
            receiptNumber: 'desc'
        }
    });
    
    let sequence = 1;
    if (lastReceipt) {
        const lastSequence = parseInt(lastReceipt.receiptNumber.split('-')[2] || '0');
        sequence = lastSequence + 1;
    }
    
    return `${prefix}${sequence.toString().padStart(6, '0')}`;
};

// Satış üçün qəbz yarat
export const createReceiptForSale = async (sale) => {
    try {
        // Qəbz artıq varsa, onu qaytar
        const existingReceipt = await prisma.receipt.findUnique({
            where: { saleId: sale.id }
        });
        
        if (existingReceipt) {
            return existingReceipt;
        }
        
        // Yeni qəbz yarat
        const receiptNumber = await generateReceiptNumber();
        
        const receipt = await prisma.receipt.create({
            data: {
                saleId: sale.id,
                receiptNumber,
                customerName: sale.customerName,
                customerSurname: sale.customerSurname,
                customerPhone: sale.customerPhone,
                totalAmount: sale.totalAmount,
                paidAmount: sale.paidAmount,
                profitAmount: sale.profitAmount,
                paymentType: sale.paymentType,
                note: sale.note
            }
        });
        
        return receipt;
    } catch (error) {
        console.error('Error creating receipt:', error);
        throw error;
    }
};

// ID-yə görə qəbz gətir
export const getReceiptById = async (req, res) => {
    try {
        const { id } = req.params;
        
        const receipt = await prisma.receipt.findUnique({
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
                }
            }
        });
        
        if (!receipt) {
            return res.status(404).json({
                success: false,
                message: 'Qəbz tapılmadı'
            });
        }
        
        res.json({
            success: true,
            data: receipt
        });
    } catch (error) {
        console.error('Error fetching receipt:', error);
        res.status(500).json({
            success: false,
            message: 'Qəbz alınarkən xəta baş verdi',
            error: error.message
        });
    }
};

// Satış ID-yə görə qəbz gətir
export const getReceiptBySaleId = async (req, res) => {
    try {
        const { saleId } = req.params;
        
        const receipt = await prisma.receipt.findUnique({
            where: { saleId },
            include: {
                sale: {
                    include: {
                        items: {
                            include: {
                                product: true
                            }
                        }
                    }
                }
            }
        });
        
        if (!receipt) {
            return res.status(404).json({
                success: false,
                message: 'Qəbz tapılmadı'
            });
        }
        
        res.json({
            success: true,
            data: receipt
        });
    } catch (error) {
        console.error('Error fetching receipt by sale ID:', error);
        res.status(500).json({
            success: false,
            message: 'Qəbz alınarkən xəta baş verdi',
            error: error.message
        });
    }
};

