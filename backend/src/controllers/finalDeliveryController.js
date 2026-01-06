import prisma from "../lib/prisma.js";
import { Prisma } from "@prisma/client";
import { createActivityLog } from "./activityLogController.js";
import { calculateProductStock } from "../utils/productStockHelper.js";

// Bütün yekun təslimatları gətir
export const getAllFinalDeliveries = async (req, res) => {
    try {
        const { deleteType, includeDeleted, page = 1, limit = 10 } = req.query;
        
        const where = {};
        
        // DeleteType filter
        if (includeDeleted === 'true') {
            // Bütün təslimatları göstər (silinmişlər də daxil)
        } else if (deleteType) {
            where.deleteType = deleteType.toUpperCase();
        } else {
            // Default: yalnız silinməyən təslimatları göstər
            where.deleteType = 'NONE';
        }
        
        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        const [deliveries, total] = await Promise.all([
            prisma.finalDelivery.findMany({
                where,
                include: {
                    staff: {
                        select: {
                            id: true,
                            name: true,
                            surName: true
                        }
                    },
                    items: {
                        include: {
                            product: {
                                select: {
                                    id: true,
                                    name: true,
                                    unitType: true,
                                    piecesPerBox: true
                                }
                            }
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                },
                skip,
                take: parseInt(limit)
            }),
            prisma.finalDelivery.count({ where })
        ]);
        
        return res.status(200).json({ 
            success: true, 
            data: deliveries,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error("getAllFinalDeliveries error", error);
        return res.status(500).json({ 
            success: false, 
            message: "Yekun təslimatlar siyahısı alınarkən xəta baş verdi" 
        });
    }
};

// ID-yə görə yekun təslimat gətir
export const getFinalDeliveryById = async (req, res) => {
    try {
        const { id } = req.params;
        
        const delivery = await prisma.finalDelivery.findUnique({
            where: { id },
            include: {
                staff: {
                    select: {
                        id: true,
                        name: true,
                        surName: true
                    }
                },
                items: {
                    include: {
                        product: {
                            include: {
                                category: {
                                    select: {
                                        id: true,
                                        name: true
                                    }
                                },
                                subCategory: {
                                    select: {
                                        id: true,
                                        name: true
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });
        
        if (!delivery) {
            return res.status(404).json({ 
                success: false, 
                message: "Yekun təslimat tapılmadı" 
            });
        }
        
        return res.status(200).json({ success: true, data: delivery });
    } catch (error) {
        console.error("getFinalDeliveryById error", error);
        return res.status(500).json({ 
            success: false, 
            message: "Yekun təslimat tapılarkən xəta baş verdi" 
        });
    }
};

// Preview - Tarix aralığına görə məhsulları gətir (yaratmadan)
export const previewFinalDelivery = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        
        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: "Başlanğıc və son tarix tələb olunur"
            });
        }
        
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        if (start > end) {
            return res.status(400).json({
                success: false,
                message: "Başlanğıc tarix son tarixdən böyük ola bilməz"
            });
        }
        
        // Bu tarix aralığında olan bütün aktiv məhsulları gətir
        const products = await prisma.product.findMany({
            where: {
                isActive: true,
                deleteType: 'NONE',
                // Yalnız bu tarix aralığının sonuna qədər yaradılmış məhsullar
                createdAt: {
                    lte: end
                }
            },
            include: {
                category: {
                    select: {
                        id: true,
                        name: true
                    }
                },
                subCategory: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        });
        
        // Hər məhsul üçün cari stokunu hesabla
        const previewItems = products.map(product => {
            const stockValue = calculateProductStock(product);
            const safeStock = typeof stockValue === 'number' && !isNaN(stockValue) ? stockValue : (product.stock || 0);

            return {
                productId: product.id,
                product: {
                    id: product.id,
                    name: product.name,
                    unitType: product.unitType,
                    piecesPerBox: product.piecesPerBox,
                    category: product.category,
                    subCategory: product.subCategory
                },
                remainingStock: safeStock,
                stock: safeStock,
                fullBoxes: product.fullBoxes || 0,
                openedBoxQuantity: product.openedBoxQuantity || 0
            };
        });
        
        return res.status(200).json({
            success: true,
            data: previewItems,
            totalProducts: previewItems.length,
            totalStock: previewItems.reduce((sum, item) => sum + item.remainingStock, 0)
        });
    } catch (error) {
        console.error("previewFinalDelivery error", error);
        return res.status(500).json({
            success: false,
            message: "Preview alınarkən xəta baş verdi"
        });
    }
};

// Yekun təslimat yarat
export const createFinalDelivery = async (req, res) => {
    try {
        const { startDate, endDate, note } = req.body;
        
        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: "Başlanğıc və son tarix tələb olunur"
            });
        }
        
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        if (start > end) {
            return res.status(400).json({
                success: false,
                message: "Başlanğıc tarix son tarixdən böyük ola bilməz"
            });
        }
        
        // Tarix formatını hazırla (məsələn "Yanvar 6 (2026) - Fevral 15 (2026)")
        const formatDateForTitle = (date) => {
            const d = new Date(date);
            const months = [
                'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'İyun',
                'İyul', 'Avqust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'
            ];
            return `${months[d.getMonth()]} ${d.getDate()} (${d.getFullYear()})`;
        };
        
        const title = `${formatDateForTitle(start)} - ${formatDateForTitle(end)}`;
        
        // Bu tarix aralığında olan bütün aktiv məhsulları gətir
        const products = await prisma.product.findMany({
            where: {
                isActive: true,
                deleteType: 'NONE',
                // Yalnız bu tarix aralığının sonuna qədər yaradılmış məhsullar
                createdAt: {
                    lte: end
                }
            },
            include: {
                category: {
                    select: {
                        id: true,
                        name: true
                    }
                },
                subCategory: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        });
        
        // Hər məhsul üçün tarix aralığının sonundakı stokunu hesabla
        // Bu sadəcə cari stokdur, çünki biz tarix aralığında stok dəyişikliklərini izləmirik
        // Gələcəkdə StockMovement-ləri nəzərə alaraq daha dəqiq hesablama edilə bilər
        
        const deliveryItems = products.map(product => {
            // Məhsulun cari stokunu helper ilə hesablayırıq
            const stockValue = calculateProductStock(product);
            const safeStock = typeof stockValue === 'number' && !isNaN(stockValue) ? stockValue : (product.stock || 0);

            return {
                productId: product.id,
                // Tarix aralığının sonundakı qalan stok – hazırda cari stok kimi götürürük
                remainingStock: safeStock,
                stock: safeStock,
                fullBoxes: product.fullBoxes || 0,
                openedBoxQuantity: product.openedBoxQuantity || 0
            };
        });
        
        // Yekun təslimat yarat
        const delivery = await prisma.finalDelivery.create({
            data: {
                title,
                startDate: start,
                endDate: end,
                note: note?.trim() || null,
                staffId: req.staffId || null,
                items: {
                    create: deliveryItems
                }
            },
            include: {
                staff: {
                    select: {
                        id: true,
                        name: true,
                        surName: true
                    }
                },
                items: {
                    include: {
                        product: {
                            select: {
                                id: true,
                                name: true,
                                unitType: true,
                                piecesPerBox: true
                            }
                        }
                    }
                }
            }
        });
        
        // Activity log yarat
        try {
            await createActivityLog({
                staffId: req.staffId || null,
                entityType: "FinalDelivery",
                entityId: delivery.id,
                action: "CREATE",
                description: `Yekun təslimat yaradıldı: ${title}`,
                changes: {
                    title: delivery.title,
                    startDate: delivery.startDate.toISOString(),
                    endDate: delivery.endDate.toISOString(),
                    itemsCount: delivery.items.length
                }
            });
        } catch (logError) {
            console.error("Activity log yaradılarkən xəta:", logError);
        }
        
        return res.status(201).json({
            success: true,
            message: "Yekun təslimat uğurla yaradıldı",
            data: delivery
        });
    } catch (error) {
        console.error("createFinalDelivery error", error);
        return res.status(500).json({
            success: false,
            message: "Yekun təslimat yaradılarkən xəta baş verdi"
        });
    }
};

// Yekun təslimatı yenilə
export const updateFinalDelivery = async (req, res) => {
    try {
        const { id } = req.params;
        const { note, deleteType } = req.body;
        
        const existingDelivery = await prisma.finalDelivery.findUnique({
            where: { id }
        });
        
        if (!existingDelivery) {
            return res.status(404).json({
                success: false,
                message: "Yekun təslimat tapılmadı"
            });
        }
        
        const updatedDelivery = await prisma.finalDelivery.update({
            where: { id },
            data: {
                note: note !== undefined ? (note?.trim() || null) : existingDelivery.note,
                deleteType: deleteType !== undefined ? deleteType.toUpperCase() : existingDelivery.deleteType
            },
            include: {
                staff: {
                    select: {
                        id: true,
                        name: true,
                        surName: true
                    }
                },
                items: {
                    include: {
                        product: {
                            select: {
                                id: true,
                                name: true,
                                unitType: true,
                                piecesPerBox: true
                            }
                        }
                    }
                }
            }
        });
        
        // Activity log yarat
        try {
            await createActivityLog({
                staffId: req.staffId || null,
                entityType: "FinalDelivery",
                entityId: updatedDelivery.id,
                action: "UPDATE",
                description: `Yekun təslimat yeniləndi: ${updatedDelivery.title}`,
                changes: {
                    note: { old: existingDelivery.note, new: updatedDelivery.note }
                }
            });
        } catch (logError) {
            console.error("Activity log yaradılarkən xəta:", logError);
        }
        
        return res.status(200).json({
            success: true,
            message: "Yekun təslimat yeniləndi",
            data: updatedDelivery
        });
    } catch (error) {
        console.error("updateFinalDelivery error", error);
        return res.status(500).json({
            success: false,
            message: "Yekun təslimat yenilənərkən xəta baş verdi"
        });
    }
};

// Yekun təslimatı sil
export const deleteFinalDelivery = async (req, res) => {
    try {
        const { id } = req.params;
        const { deleteType = 'SOFT' } = req.body;
        
        const validDeleteType = (deleteType && typeof deleteType === 'string' && deleteType.toUpperCase() === 'HARD') 
            ? 'HARD' 
            : 'SOFT';
        
        const existingDelivery = await prisma.finalDelivery.findUnique({
            where: { id },
            include: { items: true }
        });
        
        if (!existingDelivery) {
            return res.status(404).json({
                success: false,
                message: "Yekun təslimat tapılmadı"
            });
        }
        
        if (validDeleteType === 'HARD') {
            // Hard delete - tamamilə sil
            await prisma.finalDelivery.delete({
                where: { id }
            });
            
            // Activity log yarat
            try {
                await createActivityLog({
                    staffId: req.staffId || null,
                    entityType: "FinalDelivery",
                    entityId: existingDelivery.id,
                    action: "HARD_DELETE",
                    description: `Yekun təslimat tamamilə silindi: ${existingDelivery.title}`,
                    changes: {
                        title: existingDelivery.title,
                        itemsCount: existingDelivery.items.length
                    }
                });
            } catch (logError) {
                console.error("Activity log yaradılarkən xəta:", logError);
            }
        } else {
            // Soft delete
            await prisma.finalDelivery.update({
                where: { id },
                data: {
                    deleteType: 'SOFT'
                }
            });
            
            // Activity log yarat
            try {
                await createActivityLog({
                    staffId: req.staffId || null,
                    entityType: "FinalDelivery",
                    entityId: existingDelivery.id,
                    action: "SOFT_DELETE",
                    description: `Yekun təslimat soft delete edildi: ${existingDelivery.title}`,
                    changes: {
                        title: existingDelivery.title,
                        deleteType: 'SOFT'
                    }
                });
            } catch (logError) {
                console.error("Activity log yaradılarkən xəta:", logError);
            }
        }
        
        return res.json({
            success: true,
            message: validDeleteType === 'HARD' 
                ? "Yekun təslimat tamamilə silindi" 
                : "Yekun təslimat soft delete edildi",
            date: existingDelivery
        });
    } catch (error) {
        console.error("deleteFinalDelivery error", error);
        return res.status(500).json({
            success: false,
            message: "Yekun təslimat silinərkən xəta baş verdi",
            error: error.message
        });
    }
};

// FinalDeliveryItem yenilə
export const updateFinalDeliveryItem = async (req, res) => {
    try {
        const { itemId } = req.params;
        const { remainingStock, stock, fullBoxes, openedBoxQuantity } = req.body;
        
        const existingItem = await prisma.finalDeliveryItem.findUnique({
            where: { id: itemId },
            include: {
                finalDelivery: true,
                product: true
            }
        });
        
        if (!existingItem) {
            return res.status(404).json({
                success: false,
                message: "Təslimat məhsulu tapılmadı"
            });
        }
        
        // Validation
        const newRemainingStock = remainingStock !== undefined ? parseInt(remainingStock) : existingItem.remainingStock;
        const newStock = stock !== undefined ? parseInt(stock) : existingItem.stock;
        const newFullBoxes = fullBoxes !== undefined ? parseInt(fullBoxes) : existingItem.fullBoxes;
        const newOpenedBoxQuantity = openedBoxQuantity !== undefined ? parseInt(openedBoxQuantity) : existingItem.openedBoxQuantity;
        
        if (newRemainingStock < 0 || newStock < 0 || newFullBoxes < 0 || newOpenedBoxQuantity < 0) {
            return res.status(400).json({
                success: false,
                message: "Stok dəyərləri mənfi ola bilməz"
            });
        }
        
        const updatedItem = await prisma.finalDeliveryItem.update({
            where: { id: itemId },
            data: {
                remainingStock: newRemainingStock,
                stock: newStock,
                fullBoxes: newFullBoxes,
                openedBoxQuantity: newOpenedBoxQuantity
            },
            include: {
                product: {
                    select: {
                        id: true,
                        name: true,
                        unitType: true,
                        piecesPerBox: true
                    }
                }
            }
        });
        
        // Activity log yarat
        try {
            await createActivityLog({
                staffId: req.staffId || null,
                entityType: "FinalDelivery",
                entityId: existingItem.finalDeliveryId,
                action: "UPDATE",
                description: `Yekun təslimat məhsulu yeniləndi: ${existingItem.product.name}`,
                changes: {
                    productName: existingItem.product.name,
                    remainingStock: { old: existingItem.remainingStock, new: updatedItem.remainingStock },
                    stock: { old: existingItem.stock, new: updatedItem.stock },
                    fullBoxes: { old: existingItem.fullBoxes, new: updatedItem.fullBoxes },
                    openedBoxQuantity: { old: existingItem.openedBoxQuantity, new: updatedItem.openedBoxQuantity }
                }
            });
        } catch (logError) {
            console.error("Activity log yaradılarkən xəta:", logError);
        }
        
        return res.status(200).json({
            success: true,
            message: "Təslimat məhsulu yeniləndi",
            data: updatedItem
        });
    } catch (error) {
        console.error("updateFinalDeliveryItem error", error);
        return res.status(500).json({
            success: false,
            message: "Təslimat məhsulu yenilənərkən xəta baş verdi"
        });
    }
};

// FinalDeliveryItem əlavə et (yeni məhsul)
export const addFinalDeliveryItem = async (req, res) => {
    try {
        const { deliveryId } = req.params;
        const { productId, remainingStock, stock, fullBoxes, openedBoxQuantity } = req.body;
        
        if (!productId) {
            return res.status(400).json({
                success: false,
                message: "Məhsul ID tələb olunur"
            });
        }
        
        const delivery = await prisma.finalDelivery.findUnique({
            where: { id: deliveryId }
        });
        
        if (!delivery) {
            return res.status(404).json({
                success: false,
                message: "Yekun təslimat tapılmadı"
            });
        }
        
        // Məhsulun artıq bu təslimatda olub-olmadığını yoxla
        const existingItem = await prisma.finalDeliveryItem.findFirst({
            where: {
                finalDeliveryId: deliveryId,
                productId: productId
            }
        });
        
        if (existingItem) {
            return res.status(400).json({
                success: false,
                message: "Bu məhsul artıq təslimatda mövcuddur"
            });
        }
        
        // Məhsulu yoxla
        const product = await prisma.product.findUnique({
            where: { id: productId }
        });
        
        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Məhsul tapılmadı"
            });
        }
        
        // Default dəyərlər
        const newRemainingStock = remainingStock !== undefined ? parseInt(remainingStock) : 0;
        const newStock = stock !== undefined ? parseInt(stock) : 0;
        const newFullBoxes = fullBoxes !== undefined ? parseInt(fullBoxes) : 0;
        const newOpenedBoxQuantity = openedBoxQuantity !== undefined ? parseInt(openedBoxQuantity) : 0;
        
        if (newRemainingStock < 0 || newStock < 0 || newFullBoxes < 0 || newOpenedBoxQuantity < 0) {
            return res.status(400).json({
                success: false,
                message: "Stok dəyərləri mənfi ola bilməz"
            });
        }
        
        const newItem = await prisma.finalDeliveryItem.create({
            data: {
                finalDeliveryId: deliveryId,
                productId: productId,
                remainingStock: newRemainingStock,
                stock: newStock,
                fullBoxes: newFullBoxes,
                openedBoxQuantity: newOpenedBoxQuantity
            },
            include: {
                product: {
                    select: {
                        id: true,
                        name: true,
                        unitType: true,
                        piecesPerBox: true
                    }
                }
            }
        });
        
        // Activity log yarat
        try {
            await createActivityLog({
                staffId: req.staffId || null,
                entityType: "FinalDelivery",
                entityId: deliveryId,
                action: "UPDATE",
                description: `Yekun təslimatına yeni məhsul əlavə edildi: ${product.name}`,
                changes: {
                    productName: product.name,
                    remainingStock: newRemainingStock,
                    stock: newStock,
                    fullBoxes: newFullBoxes,
                    openedBoxQuantity: newOpenedBoxQuantity
                }
            });
        } catch (logError) {
            console.error("Activity log yaradılarkən xəta:", logError);
        }
        
        return res.status(201).json({
            success: true,
            message: "Məhsul təslimatına əlavə edildi",
            data: newItem
        });
    } catch (error) {
        console.error("addFinalDeliveryItem error", error);
        return res.status(500).json({
            success: false,
            message: "Məhsul əlavə edilərkən xəta baş verdi"
        });
    }
};

// FinalDeliveryItem sil
export const deleteFinalDeliveryItem = async (req, res) => {
    try {
        const { itemId } = req.params;
        
        const existingItem = await prisma.finalDeliveryItem.findUnique({
            where: { id: itemId },
            include: {
                finalDelivery: true,
                product: true
            }
        });
        
        if (!existingItem) {
            return res.status(404).json({
                success: false,
                message: "Təslimat məhsulu tapılmadı"
            });
        }
        
        await prisma.finalDeliveryItem.delete({
            where: { id: itemId }
        });
        
        // Activity log yarat
        try {
            await createActivityLog({
                staffId: req.staffId || null,
                entityType: "FinalDelivery",
                entityId: existingItem.finalDeliveryId,
                action: "UPDATE",
                description: `Yekun təslimatdan məhsul silindi: ${existingItem.product.name}`,
                changes: {
                    productName: existingItem.product.name,
                    action: "deleted"
                }
            });
        } catch (logError) {
            console.error("Activity log yaradılarkən xəta:", logError);
        }
        
        return res.status(200).json({
            success: true,
            message: "Məhsul təslimatdan silindi"
        });
    } catch (error) {
        console.error("deleteFinalDeliveryItem error", error);
        return res.status(500).json({
            success: false,
            message: "Məhsul silinərkən xəta baş verdi"
        });
    }
};

