import prisma from "../lib/prisma.js";
import { createActivityLog } from "./activityLogController.js";

// Get all stock movements
export const getAllStockMovements = async (req, res) => {
    try {
        const { productId } = req.query;
        
        const where = {};
        if (productId) {
            where.productId = productId;
        }

        const movements = await prisma.stockMovement.findMany({
            where,
            include: {
                product: {
                    select: {
                        id: true,
                        name: true,
                        barcode: true
                    }
                },
                staff: {
                    select: {
                        id: true,
                        name: true,
                        surName: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        return res.status(200).json({
            success: true,
            date: movements,
        });
    } catch (error) {
        console.error("getAllStockMovements error", error);
        return res.status(500).json({
            success: false,
            message: "Stok hərəkətləri alınarkən xəta baş verdi"
        });
    }
};

// Get stock movement by ID
export const getStockMovementById = async (req, res) => {
    try {
        const { id } = req.params;
        const movement = await prisma.stockMovement.findUnique({
            where: { id },
            include: {
                product: true,
                staff: true
            }
        });

        if (!movement) {
            return res.status(404).json({
                success: false,
                message: "Stok hərəkəti tapılmadı",
            });
        }

        return res.json({
            success: true,
            date: movement,
        });
    } catch (error) {
        console.error("getStockMovementById error", error);
        return res.status(500).json({
            success: false,
            message: "Stok hərəkəti alınarkən xəta baş verdi"
        });
    }
};

// Create stock movement
export const createStockMovement = async (req, res) => {
    try {
        const { 
            productId,
            type,
            quantity,
            note
        } = req.body;

        // Validate required fields
        if (!productId || !type || quantity === undefined) {
            return res.status(400).json({
                success: false,
                message: "Məhsul ID, növ və miqdar tələb olunur",
            });
        }

        // Validate type
        const validTypes = ['IN', 'OUT', 'ADJUSTMENT'];
        if (!validTypes.includes(type)) {
            return res.status(400).json({
                success: false,
                message: "Stok hərəkəti növü düzgün deyil (IN, OUT, ADJUSTMENT)",
            });
        }

        // Validate quantity
        const quantityNum = parseInt(quantity);
        if (isNaN(quantityNum) || quantityNum === 0) {
            return res.status(400).json({
                success: false,
                message: "Miqdar 0-dan fərqli olmalıdır",
            });
        }

        // Get product
        const product = await prisma.product.findUnique({
            where: { id: productId }
        });

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Məhsul tapılmadı",
            });
        }

        const previousStock = product.stock;
        let newStock = previousStock;

        // Calculate new stock based on type
        if (type === 'IN') {
            newStock = previousStock + Math.abs(quantityNum);
        } else if (type === 'OUT') {
            newStock = previousStock - Math.abs(quantityNum);
            if (newStock < 0) {
                return res.status(400).json({
                    success: false,
                    message: `Stokda kifayət qədər məhsul yoxdur. Mövcud stok: ${previousStock}`,
                });
            }
        } else if (type === 'ADJUSTMENT') {
            newStock = quantityNum;
            if (newStock < 0) {
                return res.status(400).json({
                    success: false,
                    message: "Stok mənfi ola bilməz",
                });
            }
        }

        // Create stock movement
        const movement = await prisma.stockMovement.create({
            data: {
                productId: productId,
                type: type,
                quantity: type === 'ADJUSTMENT' ? (newStock - previousStock) : quantityNum,
                previousStock: previousStock,
                newStock: newStock,
                note: note?.trim() || null,
                staffId: req.staffId || null
            }
        });

        // Update product stock
        await prisma.product.update({
            where: { id: productId },
            data: { stock: newStock }
        });

        // Activity log
        try {
            await createActivityLog({
                staffId: req.staffId || null,
                entityType: "StockMovement",
                entityId: movement.id,
                action: "CREATE",
                description: `Stok hərəkəti: ${product.name} - ${type} (${quantityNum} ədəd)`,
                changes: {
                    productId: productId,
                    type: type,
                    quantity: quantityNum,
                    previousStock: previousStock,
                    newStock: newStock
                }
            });
        } catch (logError) {
            console.error("Activity log yaradılarkən xəta:", logError);
        }

        return res.status(201).json({
            success: true,
            message: "Stok hərəkəti uğurla yaradıldı",
            date: movement,
        });
    } catch (error) {
        console.error("createStockMovement error", error);
        return res.status(500).json({
            success: false,
            message: "Stok hərəkəti yaradılarkən xəta baş verdi"
        });
    }
};

// Delete stock movement (and revert stock)
export const deleteStockMovement = async (req, res) => {
    try {
        const { id } = req.params;

        const movement = await prisma.stockMovement.findUnique({
            where: { id },
            include: {
                product: true
            }
        });

        if (!movement) {
            return res.status(404).json({
                success: false,
                message: "Stok hərəkəti tapılmadı",
            });
        }

        // Revert stock
        await prisma.product.update({
            where: { id: movement.productId },
            data: { stock: movement.previousStock }
        });

        // Delete movement
        await prisma.stockMovement.delete({
            where: { id }
        });

        // Activity log
        try {
            await createActivityLog({
                staffId: req.staffId || null,
                entityType: "StockMovement",
                entityId: movement.id,
                action: "DELETE",
                description: `Stok hərəkəti silindi: ${movement.product.name} - ${movement.type}`,
                changes: {
                    productId: movement.productId,
                    type: movement.type,
                    quantity: movement.quantity
                }
            });
        } catch (logError) {
            console.error("Activity log yaradılarkən xəta:", logError);
        }

        return res.json({
            success: true,
            message: "Stok hərəkəti silindi",
            date: movement,
        });
    } catch (error) {
        console.error("deleteStockMovement error", error);
        return res.status(500).json({
            success: false,
            message: "Stok hərəkəti silinirkən xəta baş verdi"
        });
    }
};

