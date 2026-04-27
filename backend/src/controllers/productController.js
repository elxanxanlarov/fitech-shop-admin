import prisma from "../lib/prisma.js";
import { Prisma } from "@prisma/client";
import { createActivityLog } from "./activityLogController.js";
import XLSX from "xlsx";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { calculateProductStock, decreaseProductStock, increaseProductStock } from "../utils/productStockHelper.js";

// In productController.js
export const getAllProducts = async (req, res) => {
    try {
        const {
            categoryId,
            categoryName,
            minStock,
            maxStock,
            stockStatus,
            hasImage,
            isActive,
            isOfficial,
            search,
            deleteType,
            includeDeleted,
            minPurchasePrice,
            maxPurchasePrice,
            minSalePrice,
            maxSalePrice,
            subCategoryId,
            subCategoryName,
            branchId,
            includeUnassigned
        } = req.query;

        const andConditions = [];

        // Branch identity filter - if branchId is provided
        if (branchId && branchId !== 'central') {
            if (deleteType?.toUpperCase() === 'SOFT') {
                // Show ONLY products soft-deleted in this branch
                andConditions.push({
                    branchDeletedProducts: {
                        some: {
                            branchId: branchId
                        }
                    }
                });
            } else {
                // Default: show products NOT soft-deleted in this branch
                andConditions.push({
                    branchDeletedProducts: {
                        none: {
                            branchId: branchId
                        }
                    }
                });
                
                // Also ensure the main product is not soft-deleted globally
                if (includeDeleted !== 'true') {
                    andConditions.push({ deleteType: 'NONE' });
                }
            }
        } else {
            // Default: Central warehouse behavior
            if (includeDeleted !== 'true') {
                if (deleteType) {
                    andConditions.push({ deleteType: deleteType.toUpperCase() });
                } else {
                    andConditions.push({ deleteType: 'NONE' });
                }
            }
        }

        // Category filter by ID (takes precedence over categoryName)
        if (categoryId) {
            andConditions.push({ categoryId });
        } else if (categoryName) {
            const category = await prisma.category.findFirst({
                where: { name: categoryName },
                select: { id: true }
            });

            if (category) {
                andConditions.push({ categoryId: category.id });
            } else {
                andConditions.push({ categoryId: 'non-existent-id' });
            }
        }

        // Subcategory filter by ID
        if (subCategoryId) {
            andConditions.push({ subCategoryId });
        } else if (subCategoryName) {
            const subCategory = await prisma.subcategory.findFirst({
                where: { name: subCategoryName },
                select: { id: true }
            });

            if (subCategory) {
                andConditions.push({ subCategoryId: subCategory.id });
            } else {
                andConditions.push({ subCategoryId: 'non-existent-id' });
            }
        }

        // Stock filters based on branchId
        if (branchId && branchId !== 'central') {
            const branchStockFilter = {};
            let isFilteringByStock = false;

            if (stockStatus) {
                isFilteringByStock = true;
                const stockStatusLower = stockStatus.toLowerCase().trim();
                if (stockStatusLower === 'stokda var' || stockStatusLower === 'in stock') {
                    branchStockFilter.stock = { gt: 10 };
                } else if (stockStatusLower === 'az stok' || stockStatusLower === 'low stock') {
                    branchStockFilter.stock = { gte: 1, lte: 10 };
                } else if (stockStatusLower === 'stokda yoxdur' || stockStatusLower === 'out of stock') {
                    branchStockFilter.stock = 0;
                }
            } else if (minStock !== undefined || maxStock !== undefined) {
                isFilteringByStock = true;
                branchStockFilter.stock = {};
                if (minStock !== undefined) branchStockFilter.stock.gte = parseInt(minStock);
                if (maxStock !== undefined) branchStockFilter.stock.lte = parseInt(maxStock);
            }

            if (isFilteringByStock) {
                const isSearchingOutOfStock = (stockStatus && (stockStatus.toLowerCase().includes('yoxdur') || stockStatus.toLowerCase().includes('out of stock'))) || (branchStockFilter.stock === 0);

                if (isSearchingOutOfStock) {
                    andConditions.push({
                        OR: [
                            { branchStocks: { some: { branchId: branchId, stock: 0 } } },
                            { branchStocks: { none: { branchId: branchId } } }
                        ]
                    });
                } else {
                    andConditions.push({
                        branchStocks: {
                            some: {
                                branchId: branchId,
                                ...branchStockFilter
                            }
                        }
                    });
                }
            }
            // If NOT filtering by stock, we don't add any branchStocks condition.
            // This makes the product visible in all branches even if no stock record exists yet.
        } else {
            // Default stock filtering (Central Warehouse)
            if (stockStatus) {
                const stockStatusLower = stockStatus.toLowerCase().trim();
                if (stockStatusLower === 'stokda var' || stockStatusLower === 'in stock') {
                    andConditions.push({ stock: { gt: 10 } });
                } else if (stockStatusLower === 'az stok' || stockStatusLower === 'low stock') {
                    andConditions.push({ stock: { gte: 1, lte: 10 } });
                } else if (stockStatusLower === 'stokda yoxdur' || stockStatusLower === 'out of stock') {
                    andConditions.push({ stock: 0 });
                }
            } else if (minStock !== undefined || maxStock !== undefined) {
                const stockFilter = {};
                if (minStock !== undefined) stockFilter.gte = parseInt(minStock);
                if (maxStock !== undefined) stockFilter.lte = parseInt(maxStock);
                andConditions.push({ stock: stockFilter });
            }
        }

        // Has image filter
        if (hasImage === 'true') andConditions.push({ imageUrl: { not: null } });
        else if (hasImage === 'false') andConditions.push({ imageUrl: null });

        // Status filter
        if (isActive !== undefined) {
            andConditions.push({ isActive: isActive === 'true' || isActive === true });
        }

        // Official status filter
        if (isOfficial !== undefined) {
            const isOfficialValue = isOfficial.toLowerCase().trim();
            if (isOfficialValue === 'rəsmi' || isOfficialValue === 'official' || isOfficialValue === 'true') {
                andConditions.push({ isOfficial: true });
            } else if (isOfficialValue === 'qeyri-rəsmi' || isOfficialValue === 'unofficial' || isOfficialValue === 'false') {
                andConditions.push({ isOfficial: false });
            }
        }

        // Price range filters
        if (minPurchasePrice !== undefined || maxPurchasePrice !== undefined) {
            const purchaseFilter = {};
            if (minPurchasePrice !== undefined) purchaseFilter.gte = new Prisma.Decimal(minPurchasePrice);
            if (maxPurchasePrice !== undefined) purchaseFilter.lte = new Prisma.Decimal(maxPurchasePrice);
            andConditions.push({ purchasePrice: purchaseFilter });
        }

        if (minSalePrice !== undefined || maxSalePrice !== undefined) {
            const saleFilter = {};
            if (minSalePrice !== undefined) saleFilter.gte = new Prisma.Decimal(minSalePrice);
            if (maxSalePrice !== undefined) saleFilter.lte = new Prisma.Decimal(maxSalePrice);
            andConditions.push({ salePrice: saleFilter });
        }

        // Search
        if (search && search.trim()) {
            const searchTerm = search.trim();
            const searchConditions = [
                { name: { contains: searchTerm } },
                { invoiceName: { contains: searchTerm } },
                { barcode: { contains: searchTerm } },
                {
                    AND: [
                        { description: { not: null } },
                        { description: { contains: searchTerm } }
                    ]
                }
            ];

            andConditions.push({ OR: searchConditions });
        }

        const where = andConditions.length > 0 ? { AND: andConditions } : {};

        const products = await prisma.product.findMany({
            where,
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
                },
                branchStocks: branchId && branchId !== 'central' ? {
                    where: { branchId: branchId }
                } : false
            },
            orderBy: {
                createdAt: 'desc',
            }
        });

        // Format the response to include category name in the product title
        const formattedProducts = products.map(product => {
            let stock = product.stock;
            let fullBoxes = product.fullBoxes;
            let openedBoxQuantity = product.openedBoxQuantity;

            if (branchId && branchId !== 'central') {
                if (product.branchStocks && product.branchStocks.length > 0) {
                    const bStock = product.branchStocks[0];
                    stock = bStock.stock;
                    fullBoxes = bStock.fullBoxes;
                    openedBoxQuantity = bStock.openedBoxQuantity;
                } else {
                    // Branch isolation: if no branch stock record exists, stock is 0
                    stock = 0;
                    fullBoxes = 0;
                    openedBoxQuantity = 0;
                }
            }

            return {
                ...product,
                stock,
                fullBoxes,
                openedBoxQuantity,
                titleWithCategory: product.name,
                categoryName: product.category?.name || '',
                subCategoryName: product.subCategory?.name || '',
                branchStocks: undefined // Don't leak raw branchStocks array
            };
        });

        return res.status(200).json({
            success: true,
            date: formattedProducts,
        });
    } catch (error) {
        console.error("getAllProducts error", error);
        console.error("Error details:", {
            message: error.message,
            stack: error.stack,
            query: req.query
        });
        return res.status(500).json({
            success: false,
            message: "Məhsul siyahısı alınarkən xəta baş verdi",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

export const getProductById = async (req, res) => {
    try {
        const { id } = req.params;
        const { branchId } = req.query;
        const product = await prisma.product.findUnique({
            where: { id },
            include: {
                category: true,
                subCategory: true,
                branchStocks: branchId && branchId !== 'central' ? {
                    where: { branchId: branchId }
                } : false
            }
        });

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Məhsul tapılmadı",
            });
        }

        if (branchId && branchId !== 'central') {
            if (product.branchStocks && product.branchStocks.length > 0) {
                const bStock = product.branchStocks[0];
                product.stock = bStock.stock;
                product.fullBoxes = bStock.fullBoxes;
                product.openedBoxQuantity = bStock.openedBoxQuantity;
            } else {
                // Branch isolation: if no branch stock record exists, stock is 0
                product.stock = 0;
                product.fullBoxes = 0;
                product.openedBoxQuantity = 0;
            }
        }

        return res.json({
            success: true,
            date: product,
        });
    } catch (error) {
        console.error("getProductById error", error);
        return res.status(500).json({
            success: false,
            message: "Məhsul tapılarkən xəta baş verdi",
        });
    }
};

export const createProduct = async (req, res) => {
    try {
        const {
            name,
            invoiceName,
            description,
            imageUrl,
            purchasePrice,
            salePrice,
            hasDiscount,
            discountPrice,
            discountPercent,
            barcode,
            stock,
            isActive,
            isOfficial,
            categoryId,
            subCategoryId,
            unitType,
            piecesPerBox,
            openedBoxQuantity,
            boxPrice,
            fullBoxes,
            branchId
        } = req.body;
        if (!name || !purchasePrice || !salePrice) {
            return res.status(400).json({
                success: false,
                message: "Ad, alış qiyməti və satış qiyməti tələb olunur",
            });
        }

        // Decimal field-ləri Prisma Decimal-ə çevir
        const purchasePriceDecimal = new Prisma.Decimal(purchasePrice);
        const salePriceDecimal = new Prisma.Decimal(salePrice);
        const discountPriceDecimal = discountPrice ? new Prisma.Decimal(discountPrice) : null;

        // Endirim məntiqini yoxla
        let finalHasDiscount = hasDiscount || false;
        let finalDiscountPrice = discountPriceDecimal;
        let finalDiscountPercent = discountPercent || null;

        if (finalHasDiscount && !finalDiscountPrice && !finalDiscountPercent) {
            return res.status(400).json({
                success: false,
                message: "Endirim aktivdirsə, endirim qiyməti və ya endirim faizi tələb olunur",
            });
        }

        // Əgər endirim faizi verilibsə, endirim qiymətini maya dəyərinə əsasən hesabla
        // discountPrice = purchasePrice / (1 + discountPercent / 100)
        if (finalHasDiscount && finalDiscountPercent && !finalDiscountPrice) {
            const divisor = new Prisma.Decimal(1).add(new Prisma.Decimal(finalDiscountPercent).div(100));
            finalDiscountPrice = purchasePriceDecimal.div(divisor);
        }

        // Əgər endirim qiyməti verilibsə, endirim faizini hesabla
        // discountPercent = ((purchasePrice / discountPrice) - 1) * 100
        if (finalHasDiscount && finalDiscountPrice && !finalDiscountPercent) {
            const ratio = purchasePriceDecimal.div(finalDiscountPrice);
            finalDiscountPercent = Math.round(ratio.sub(1).mul(100).toNumber());
        }

        // UnitType və qutu məlumatlarını yoxla
        const finalUnitType = unitType || 'PIECE';
        const finalPiecesPerBox = piecesPerBox !== undefined ? parseInt(piecesPerBox) : null;
        const finalOpenedBoxQuantity = openedBoxQuantity !== undefined ? parseInt(openedBoxQuantity) : 0;
        const finalFullBoxes = fullBoxes !== undefined ? parseInt(fullBoxes) : 0;
        const finalBoxPrice = boxPrice ? new Prisma.Decimal(boxPrice) : null;

        // Validation: Əgər BOX, LITER, METER və ya KILOGRAM-dırsa, piecesPerBox mütləq olmalıdır
        if (['BOX', 'LITER', 'METER', 'KILOGRAM'].includes(finalUnitType) && (!finalPiecesPerBox || finalPiecesPerBox <= 0)) {
            return res.status(400).json({
                success: false,
                message: `${finalUnitType} tipi üçün hər qutu/paketdəki miqdar (piecesPerBox) tələb olunur`,
            });
        }

        // Stock hesablaması
        let calculatedStock = stock !== undefined ? parseInt(stock) : 0;
        let calculatedFullBoxes = finalFullBoxes;
        let calculatedOpenedBoxQuantity = finalOpenedBoxQuantity;

        console.log('=== CREATE PRODUCT STOCK DEBUG ===');
        console.log('Input stock:', stock);
        console.log('Input fullBoxes:', fullBoxes);
        console.log('Input openedBoxQuantity:', openedBoxQuantity);
        console.log('piecesPerBox:', finalPiecesPerBox);
        console.log('calculatedStock (initial):', calculatedStock);

        // Əgər qutu tipindədirsə və tam stok verilibsə, fullBoxes və openedBoxQuantity-ni hesabla
        if (finalPiecesPerBox && finalPiecesPerBox > 0 && stock !== undefined) {
            calculatedFullBoxes = Math.floor(calculatedStock / finalPiecesPerBox);
            calculatedOpenedBoxQuantity = calculatedStock % finalPiecesPerBox;
            console.log('Calculated from stock - fullBoxes:', calculatedFullBoxes, 'openedBoxQuantity:', calculatedOpenedBoxQuantity);
        } else if (finalPiecesPerBox && finalPiecesPerBox > 0 && fullBoxes !== undefined) {
            // Əgər fullBoxes verilibsə, stock hesabla
            calculatedStock = (calculatedFullBoxes * finalPiecesPerBox) + calculatedOpenedBoxQuantity;
            console.log('Calculated from boxes - stock:', calculatedStock);
        }

        console.log('Final calculatedStock:', calculatedStock);
        console.log('Final calculatedFullBoxes:', calculatedFullBoxes);
        console.log('Final calculatedOpenedBoxQuantity:', calculatedOpenedBoxQuantity);
        console.log('=== END DEBUG ===');


        const newProduct = await prisma.product.create({
            data: {
                name: name.trim(),
                invoiceName: invoiceName?.trim() || null,
                description: description?.trim() || null,
                imageUrl: imageUrl?.trim() || null,
                purchasePrice: purchasePriceDecimal,
                salePrice: salePriceDecimal,
                hasDiscount: finalHasDiscount,
                discountPrice: finalDiscountPrice,
                discountPercent: finalDiscountPercent,
                barcode: barcode?.trim() || null,
                unitType: finalUnitType,
                piecesPerBox: finalPiecesPerBox,
                openedBoxQuantity: branchId && branchId !== 'central' ? 0 : finalOpenedBoxQuantity,
                boxPrice: finalBoxPrice,
                fullBoxes: branchId && branchId !== 'central' ? 0 : calculatedFullBoxes,
                stock: branchId && branchId !== 'central' ? 0 : calculatedStock,
                isActive: typeof isActive === "boolean" ? isActive : true,
                isOfficial: typeof isOfficial === "boolean" ? isOfficial : false,
                categoryId: categoryId || null,
                subCategoryId: subCategoryId || null,
            }
        });

        // Əgər konkret filial seçilibsə, yalnız həmin filial üçün BranchStock qeydi yaradılır.
        // Artıq bütün filiallar üçün avtomatik 0-stoklu qeydlər yaradılmır.
        if (branchId && branchId !== 'central') {
            try {
                await prisma.branchstock.create({
                    data: {
                        branchId: branchId,
                        productId: newProduct.id,
                        stock: calculatedStock,
                        fullBoxes: calculatedFullBoxes,
                        openedBoxQuantity: calculatedOpenedBoxQuantity
                    }
                });
            } catch (branchStockError) {
                console.error("Filial stoku yaradılarkən xəta:", branchStockError);
            }
        }

        // Activity log yarat
        try {
            await createActivityLog({
                staffId: req.staffId || null,
                entityType: "Product",
                entityId: newProduct.id,
                action: "CREATE",
                // Daha aydın Azərbaycan dilində və məhsul adını önə çıxararaq
                description: `Yeni məhsul yaradıldı. Məhsulun adı: ${newProduct.name}`,
                changes: {
                    name: newProduct.name,
                    purchasePrice: newProduct.purchasePrice.toString(),
                    salePrice: newProduct.salePrice.toString(),
                    stock: newProduct.stock,
                    isActive: newProduct.isActive
                }
            });
        } catch (logError) {
            console.error("Activity log yaradılarkən xəta:", logError);
        }

        return res.status(200).json({
            success: true,
            message: "Məhsul yaradıldı",
            data: newProduct,
            date: newProduct
        });
    } catch (error) {
        console.error("createProduct error", error);

        // Unique constraint error (barcode)
        if (error.code === 'P2002') {
            return res.status(400).json({
                success: false,
                message: "Bu barcode artıq istifadə olunur",
            });
        }

        return res.status(500).json({
            success: false,
            message: "Məhsul yaradılarkən xəta baş verdi",
        });
    }
};

export const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            name,
            description,
            imageUrl,
            purchasePrice,
            salePrice,
            hasDiscount,
            discountPrice,
            discountPercent,
            barcode,
            stock,
            isActive,
            isOfficial,
            categoryId,
            subCategoryId,
            deleteType,
            invoiceName,
            unitType,
            piecesPerBox,
            openedBoxQuantity,
            boxPrice,
            fullBoxes
        } = req.body;

        const existingProduct = await prisma.product.findUnique({
            where: { id }
        });

        if (!existingProduct) {
            return res.status(404).json({
                success: false,
                message: "Məhsul tapılmadı",
            });
        }

        // Decimal field-ləri hazırla
        let purchasePriceDecimal = existingProduct.purchasePrice;
        let salePriceDecimal = existingProduct.salePrice;
        let discountPriceDecimal = existingProduct.discountPrice;

        if (purchasePrice !== undefined) {
            purchasePriceDecimal = new Prisma.Decimal(purchasePrice);
        }
        if (salePrice !== undefined) {
            salePriceDecimal = new Prisma.Decimal(salePrice);
        }
        if (discountPrice !== undefined) {
            discountPriceDecimal = discountPrice ? new Prisma.Decimal(discountPrice) : null;
        }

        // Endirim məntiqini yoxla
        let finalHasDiscount = hasDiscount !== undefined ? hasDiscount : existingProduct.hasDiscount;
        let finalDiscountPrice = discountPriceDecimal;
        let finalDiscountPercent = discountPercent !== undefined ? discountPercent : existingProduct.discountPercent;

        if (finalHasDiscount && !finalDiscountPrice && !finalDiscountPercent) {
            return res.status(400).json({
                success: false,
                message: "Endirim aktivdirsə, endirim qiyməti və ya endirim faizi tələb olunur",
            });
        }

        // Əgər endirim faizi verilibsə, endirim qiymətini maya dəyərinə əsasən hesabla
        // discountPrice = purchasePrice / (1 + discountPercent / 100)
        if (finalHasDiscount && finalDiscountPercent && !finalDiscountPrice) {
            const divisor = new Prisma.Decimal(1).add(new Prisma.Decimal(finalDiscountPercent).div(100));
            finalDiscountPrice = purchasePriceDecimal.div(divisor);
        }

        // Əgər endirim qiyməti verilibsə, endirim faizini hesabla
        // discountPercent = ((purchasePrice / discountPrice) - 1) * 100
        if (finalHasDiscount && finalDiscountPrice && !finalDiscountPercent) {
            const ratio = purchasePriceDecimal.div(finalDiscountPrice);
            finalDiscountPercent = Math.round(ratio.sub(1).mul(100).toNumber());
        }

        // UnitType və qutu məlumatlarını hazırla
        const finalUnitType = unitType !== undefined ? unitType : existingProduct.unitType;
        let finalPiecesPerBox = piecesPerBox !== undefined ? (piecesPerBox ? parseInt(piecesPerBox) : null) : existingProduct.piecesPerBox;
        let finalOpenedBoxQuantity = openedBoxQuantity !== undefined ? parseInt(openedBoxQuantity) : existingProduct.openedBoxQuantity;
        let finalFullBoxes = fullBoxes !== undefined ? parseInt(fullBoxes) : existingProduct.fullBoxes;
        let finalBoxPrice = boxPrice !== undefined ? (boxPrice ? new Prisma.Decimal(boxPrice) : null) : existingProduct.boxPrice;

        // Validation: Əgər BOX, LITER, METER və ya KILOGRAM-dırsa, piecesPerBox mütləq olmalıdır
        if (['BOX', 'LITER', 'METER', 'KILOGRAM'].includes(finalUnitType) && (!finalPiecesPerBox || finalPiecesPerBox <= 0)) {
            return res.status(400).json({
                success: false,
                message: `${finalUnitType} tipi üçün hər qutu/paketdəki miqdar (piecesPerBox) tələb olunur`,
            });
        }

        // Stock hesablaması
        let calculatedStock = stock !== undefined ? parseInt(stock) : existingProduct.stock;
        let calculatedFullBoxes = finalFullBoxes;
        let calculatedOpenedBoxQuantity = finalOpenedBoxQuantity;

        // Əgər qutu tipindədirsə və stock yenilənibsə, fullBoxes və openedBoxQuantity-ni yenilə
        if (finalPiecesPerBox && finalPiecesPerBox > 0) {
            if (stock !== undefined) {
                // Stock verilibsə, fullBoxes və openedBoxQuantity hesabla
                calculatedFullBoxes = Math.floor(calculatedStock / finalPiecesPerBox);
                calculatedOpenedBoxQuantity = calculatedStock % finalPiecesPerBox;
            } else if (fullBoxes !== undefined || openedBoxQuantity !== undefined) {
                // fullBoxes və ya openedBoxQuantity verilibsə, stock hesabla
                calculatedStock = (calculatedFullBoxes * finalPiecesPerBox) + calculatedOpenedBoxQuantity;
            }
        }

        // Əvvəlki stok dəyərlərini hesabla
        const previousStock = calculateProductStock(existingProduct);
        const newStock = calculatedStock;
        const stockChanged = (stock !== undefined || fullBoxes !== undefined || openedBoxQuantity !== undefined) && previousStock !== newStock;

        const updated = await prisma.product.update({
            where: { id },
            data: {
                name: name !== undefined ? (name?.trim() || null) : undefined,
                description: description !== undefined ? (description?.trim() || null) : undefined,
                imageUrl: imageUrl !== undefined ? (imageUrl?.trim() || null) : undefined,
                invoiceName: invoiceName !== undefined ? (invoiceName?.trim() || null) : undefined,

                purchasePrice: purchasePriceDecimal,
                salePrice: salePriceDecimal,

                hasDiscount: finalHasDiscount,
                discountPrice: finalDiscountPrice,
                discountPercent: finalDiscountPercent,

                unitType: finalUnitType,
                piecesPerBox: finalPiecesPerBox !== undefined ? finalPiecesPerBox : undefined,
                openedBoxQuantity: calculatedOpenedBoxQuantity,
                boxPrice: finalBoxPrice !== undefined ? finalBoxPrice : undefined,
                fullBoxes: calculatedFullBoxes,

                barcode: barcode !== undefined ? (barcode?.trim() || null) : undefined,
                stock: calculatedStock,
                isActive: typeof isActive === "boolean" ? isActive : undefined,
                isOfficial: typeof isOfficial === "boolean" ? isOfficial : undefined,
                deleteType: deleteType !== undefined ? deleteType.toUpperCase() : undefined,

                category: categoryId
                    ? { connect: { id: categoryId } }
                    : categoryId === null
                        ? { disconnect: true }
                        : undefined,

                subCategory: subCategoryId
                    ? { connect: { id: subCategoryId } }
                    : subCategoryId === null
                        ? { disconnect: true }
                        : undefined,
            },
            include: {
                category: true,
                subCategory: true
            }
        });

        // Activity log yarat
        try {
            const changes = {};
            if (name !== undefined && name !== existingProduct.name) changes.name = { old: existingProduct.name, new: updated.name };
            if (description !== undefined && description !== existingProduct.description) changes.description = { old: existingProduct.description, new: updated.description };
            if (purchasePrice !== undefined && purchasePriceDecimal.toString() !== existingProduct.purchasePrice.toString()) changes.purchasePrice = { old: existingProduct.purchasePrice.toString(), new: updated.purchasePrice.toString() };
            if (salePrice !== undefined && salePriceDecimal.toString() !== existingProduct.salePrice.toString()) changes.salePrice = { old: existingProduct.salePrice.toString(), new: updated.salePrice.toString() };
            if (stock !== undefined && parseInt(stock) !== existingProduct.stock) changes.stock = { old: existingProduct.stock, new: updated.stock };
            if (isActive !== undefined && isActive !== existingProduct.isActive) changes.isActive = { old: existingProduct.isActive, new: updated.isActive };
            if (hasDiscount !== undefined && finalHasDiscount !== existingProduct.hasDiscount) changes.hasDiscount = { old: existingProduct.hasDiscount, new: updated.hasDiscount };
            if (deleteType !== undefined && deleteType.toUpperCase() !== existingProduct.deleteType) changes.deleteType = { old: existingProduct.deleteType, new: updated.deleteType };
            if (categoryId !== undefined && categoryId !== existingProduct.categoryId) changes.categoryId = { old: existingProduct.categoryId, new: updated.categoryId };
            if (subCategoryId !== undefined && subCategoryId !== existingProduct.subCategoryId) changes.subCategoryId = { old: existingProduct.subCategoryId, new: updated.subCategoryId };

            const changedFields = Object.keys(changes);

            // Azərbaycan dilində sahə adları
            const fieldLabels = {
                name: "Məhsulun adı",
                description: "Təsvir",
                purchasePrice: "Alış qiyməti",
                salePrice: "Satış qiyməti",
                stock: "Stok",
                isActive: "Aktivlik statusu",
                hasDiscount: "Endirim statusu",
                deleteType: "Silinmə tipi",
                categoryId: "Kateqoriya",
                subCategoryId: "Alt kateqoriya"
            };

            const formatValue = (val) => {
                if (val === null || val === undefined) return "boş";
                if (typeof val === "boolean") return val ? "bəli" : "xeyr";
                return String(val);
            };

            const changedDetails = changedFields.map((key) => {
                const label = fieldLabels[key] || key;
                const oldVal = formatValue(changes[key].old);
                const newVal = formatValue(changes[key].new);
                return `${label}: "${oldVal}" → "${newVal}"`;
            });

            const descriptionParts = [
                `Məhsul yeniləndi. Məhsulun adı: ${updated.name}`
            ];

            if (changedDetails.length > 0) {
                descriptionParts.push(`Dəyişən sahələr: ${changedDetails.join(" | ")}`);
            } else {
                descriptionParts.push("Dəyişiklik qeydə alınmadı");
            }

            await createActivityLog({
                staffId: req.staffId || null,
                entityType: "Product",
                entityId: updated.id,
                action: "UPDATE",
                description: descriptionParts.join(" - "),
                changes: changedFields.length > 0 ? changes : null
            });
        } catch (logError) {
            console.error("Activity log yaradılarkən xəta:", logError);
        }
        return res.status(200).json({
            success: true,
            message: "Məhsul yeniləndi",
            data: updated,
            date: updated
        });
    } catch (error) {
        console.error("updateProduct error", error);

        // Unique constraint error (barcode)
        if (error.code === 'P2002') {
            return res.status(400).json({
                success: false,
                message: "Bu barcode artıq istifadə olunur",
            });
        }

        return res.status(500).json({
            success: false,
            message: "Məhsul yenilənirkən xəta baş verdi",
        });
    }
};

// Update product stock only (creates stock movement)
export const updateStock = async (req, res) => {
    try {
        const { id } = req.params;
        const { stock, fullBoxes, openedBoxQuantity, note, branchId } = req.body;

        const existingProduct = await prisma.product.findUnique({
            where: { id }
        });

        if (!existingProduct) {
            return res.status(404).json({
                success: false,
                message: "Məhsul tapılmadı",
            });
        }

        // Get current stock (central or branch)
        let previousStockData = existingProduct;
        if (branchId && branchId !== 'central') {
            const bStock = await prisma.branchstock.findFirst({
                where: {
                    branchId: branchId,
                    productId: id
                }
            });
            if (bStock) {
                previousStockData = { ...existingProduct, ...bStock };
            } else {
                // If doesn't exist, treat as 0 stock
                previousStockData = { ...existingProduct, stock: 0, fullBoxes: 0, openedBoxQuantity: 0 };
            }
        }

        const piecesPerBox = existingProduct.piecesPerBox;
        const unitType = existingProduct.unitType || 'PIECE';

        // Calculate new stock values
        let calculatedStock = stock !== undefined ? parseInt(stock) : previousStockData.stock;
        let calculatedFullBoxes = fullBoxes !== undefined ? parseInt(fullBoxes) : previousStockData.fullBoxes;
        let calculatedOpenedBoxQuantity = openedBoxQuantity !== undefined ? parseInt(openedBoxQuantity) : previousStockData.openedBoxQuantity;

        // If box-type product, calculate based on boxes/pieces
        if (unitType !== 'PIECE' && piecesPerBox && piecesPerBox > 0) {
            if (stock !== undefined) {
                calculatedFullBoxes = Math.floor(calculatedStock / piecesPerBox);
                calculatedOpenedBoxQuantity = calculatedStock % piecesPerBox;
            } else if (fullBoxes !== undefined || openedBoxQuantity !== undefined) {
                calculatedStock = (calculatedFullBoxes * piecesPerBox) + calculatedOpenedBoxQuantity;
            }
        }

        // Calculate previous and new stock
        const previousStock = calculateProductStock(previousStockData);
        const newStock = calculatedStock;
        const stockDifference = newStock - previousStock;

        // Only create movement if stock changed
        if (stockDifference === 0 &&
            calculatedFullBoxes === previousStockData.fullBoxes &&
            calculatedOpenedBoxQuantity === previousStockData.openedBoxQuantity) {
            return res.status(200).json({
                success: true,
                message: "Stok dəyişməyib",
                data: previousStockData
            });
        }

        // Update product stock (central or branch)
        let updated;
        if (branchId && branchId !== 'central') {
            const existingBs = await prisma.branchstock.findFirst({
                where: { branchId: branchId, productId: id }
            });
            if (existingBs) {
                updated = await prisma.branchstock.update({
                    where: { id: existingBs.id },
                    data: {
                        stock: calculatedStock,
                        fullBoxes: calculatedFullBoxes,
                        openedBoxQuantity: calculatedOpenedBoxQuantity
                    }
                });
            } else {
                updated = await prisma.branchstock.create({
                    data: {
                        branchId: branchId,
                        productId: id,
                        stock: calculatedStock,
                        fullBoxes: calculatedFullBoxes,
                        openedBoxQuantity: calculatedOpenedBoxQuantity
                    }
                });
            }
        } else {
            updated = await prisma.product.update({
                where: { id },
                data: {
                    stock: calculatedStock,
                    fullBoxes: calculatedFullBoxes,
                    openedBoxQuantity: calculatedOpenedBoxQuantity
                }
            });
        }

        // Create stock movement
        try {
            await prisma.stockmovement.create({
                data: {
                    productId: id,
                    type: 'ADJUSTMENT',
                    quantity: stockDifference,
                    previousStock: previousStock,
                    newStock: newStock,
                    previousFullBoxes: previousStockData.fullBoxes || null,
                    newFullBoxes: calculatedFullBoxes || null,
                    previousOpenedBoxQuantity: previousStockData.openedBoxQuantity || null,
                    newOpenedBoxQuantity: calculatedOpenedBoxQuantity || null,
                    note: note?.trim() || 'Məhsul formundan stok yeniləməsi',
                    staffId: req.staffId || null,
                    branchId: (branchId && branchId !== 'central') ? branchId : null
                }
            });
        } catch (movementError) {
            console.error("Stock movement yaradılarkən xəta:", movementError);
        }

        return res.status(200).json({
            success: true,
            message: "Stok uğurla yeniləndi",
            data: updated
        });
    } catch (error) {
        console.error("updateStock error", error);
        return res.status(500).json({
            success: false,
            message: "Stok yenilənirkən xəta baş verdi",
        });
    }
};

export const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const branchId = req.query.branchId || req.body.branchId;
        const { deleteType = 'SOFT' } = req.body; // Default: SOFT delete

        // Ensure deleteType is valid
        const validDeleteType = (deleteType && typeof deleteType === 'string' && deleteType.toUpperCase() === 'HARD') ? 'HARD' : 'SOFT';

        const existingProduct = await prisma.product.findUnique({
            where: { id },
            include: {
                branchDeletedProducts: branchId ? { where: { branchId } } : false,
                _count: {
                    select: {
                        saleItems: true,
                        returnItems: true,
                        finalDeliveryItems: true,
                        transferItems: true,
                        stockMovements: true,
                    }
                }
            }
        });

        if (!existingProduct) {
            return res.status(404).json({
                success: false,
                message: "Məhsul tapılmadı",
            });
        }

        // Branch-specific soft delete
        if (validDeleteType === 'SOFT' && branchId && branchId !== 'central') {
            await prisma.branchDeletedProduct.upsert({
                where: {
                    branchId_productId: {
                        branchId,
                        productId: id
                    }
                },
                create: {
                    branchId,
                    productId: id
                },
                update: {
                    deletedAt: new Date()
                }
            });

            // Log activity
            try {
                await createActivityLog({
                    staffId: req.staffId || null,
                    branchId: branchId,
                    entityType: "Product",
                    entityId: id,
                    action: "SOFT_DELETE",
                    description: `Məhsul filiala görə silindi (soft delete): ${existingProduct.name}`,
                });
            } catch (err) {}

            return res.json({ success: true, message: "Məhsul filialdan silindi" });
        }

        // DeleteType-a görə silmə
        if (validDeleteType === 'HARD') {
            // Hard delete - Bütün əlaqəli cədvəllərdən məlumatları təmizlə və məhsulu sil

            // 1. Bu məhsulun olduğu bütün satış ID-lərini tap
            const relatedSaleItems = await prisma.saleitem.findMany({
                where: { productId: id },
                select: { saleId: true }
            });
            const saleIds = [...new Set(relatedSaleItems.map(item => item.saleId))];

            await prisma.$transaction([
                // 1. Geri qaytarma maddələrini və sənədlərini sil
                prisma.salereturnitem.deleteMany({ where: { productId: id } }),
                prisma.salereturn.deleteMany({ where: { saleId: { in: saleIds } } }),

                // 2. Satış maddələrini və satışları sil
                prisma.saleitem.deleteMany({ where: { productId: id } }),
                prisma.receipt.deleteMany({ where: { saleId: { in: saleIds } } }),
                prisma.creditpayment.deleteMany({ where: { saleId: { in: saleIds } } }),
                prisma.notification.deleteMany({ where: { saleId: { in: saleIds } } }),
                prisma.sale.deleteMany({ where: { id: { in: saleIds } } }),

                // 3. Yekun təslimat və transfer maddələrini sil
                prisma.finaldeliveryitem.deleteMany({ where: { productId: id } }),
                prisma.stocktransferitem.deleteMany({ where: { productId: id } }),
                
                // All branch deletes and stocks
                prisma.branchDeletedProduct.deleteMany({ where: { productId: id } }),
                prisma.branchstock.deleteMany({ where: { productId: id } }),

                // 4. Məhsulun özünü sil
                prisma.product.delete({ where: { id } })
            ]);
        } else {
            // Soft delete - Məhsulu və əlaqəli SATIŞLARI soft delete et

            // 1. Bu məhsulun olduğu bütün satış ID-lərini tap
            const relatedSaleItems = await prisma.saleitem.findMany({
                where: { productId: id },
                select: { saleId: true }
            });
            const saleIds = [...new Set(relatedSaleItems.map(item => item.saleId))];

            await prisma.$transaction([
                // Əlaqəli satışları soft delete et (statistikada görünməməsi üçün)
                prisma.sale.updateMany({
                    where: { id: { in: saleIds } },
                    data: { deleteType: 'SOFT' }
                }),
                // Məhsulu soft delete et
                prisma.product.update({
                    where: { id },
                    data: {
                        deleteType: 'SOFT',
                        isActive: false
                    }
                }),
                // Optionally clear branch-specific soft deletes if globally soft-deleted
                prisma.branchDeletedProduct.deleteMany({
                    where: { productId: id }
                })
            ]);
        }

        // Activity log yarat
        try {
            const actionType = validDeleteType === 'HARD' ? "HARD_DELETE" : "SOFT_DELETE";
            await createActivityLog({
                staffId: req.staffId || null,
                entityType: "Product",
                entityId: existingProduct.id,
                action: actionType,
                description: `Məhsul ${validDeleteType === 'HARD' ? 'tamamilə silindi' : 'soft delete edildi'}: ${existingProduct.name}`,
                changes: {
                    name: existingProduct.name,
                    purchasePrice: existingProduct.purchasePrice.toString(),
                    salePrice: existingProduct.salePrice.toString(),
                    stock: existingProduct.stock,
                    deleteType: validDeleteType
                }
            });
        } catch (logError) {
            console.error("Activity log yaradılarkən xəta:", logError);
        }

        return res.json({
            success: true,
            message: "Məhsul silindi",
            date: existingProduct,
            data: existingProduct,
        });
    } catch (error) {
        console.error("deleteProduct error", error);

        // Foreign key constraint error
        if (error.code === 'P2003') {
            return res.status(400).json({
                success: false,
                message: "Bu məhsul tamamilə silinə bilməz, çünki əlaqəli satış və ya başqa qeydlər mövcuddur. Zəhmət olmasa arxivləşdirmə (soft delete) istifadə edin.",
            });
        }

        return res.status(500).json({
            success: false,
            message: "Məhsul silinirkən xəta baş verdi",
        });
    }
};

export const importProductsFromExcel = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Excel faylı yüklənmədi",
            });
        }

        const filePath = req.file.path;
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Get raw data to see actual column names
        const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
        if (rawData.length === 0) {
            fs.unlinkSync(filePath);
            return res.status(400).json({
                success: false,
                message: "Excel faylı boşdur və ya məlumat yoxdur",
            });
        }

        // Get header row (first row)
        const headerRow = rawData[0];

        // Create column mapping - normalize Azerbaijani and English column names
        const columnMap = {};
        headerRow.forEach((header, index) => {
            if (!header) return;
            const normalized = String(header).toLowerCase().trim();

            // Map to standard column names - check for Azerbaijani first
            // Name
            if ((normalized === 'ad' || normalized.startsWith('ad')) && !normalized.includes('qiymət') && !normalized.includes('qiymat') && !normalized.includes('qaimə') && !normalized.includes('qayime')) {
                if (!columnMap['name']) columnMap['name'] = index;
            }
            // Invoice Name (Qaimə Adı)
            else if ((normalized.includes('qaimə') || normalized.includes('qayime') || normalized.includes('invoice')) && (normalized.includes('ad') || normalized.includes('name'))) {
                if (!columnMap['invoice_name']) columnMap['invoice_name'] = index;
            }
            // Purchase Price - check if contains "alış" and "qiymət"
            else if (normalized.includes('alış') && (normalized.includes('qiymət') || normalized.includes('qiymat'))) {
                if (!columnMap['purchase_price']) columnMap['purchase_price'] = index;
            }
            // Sale Price - check if contains "satış" and "qiymət"
            else if (normalized.includes('satış') && (normalized.includes('qiymət') || normalized.includes('qiymat'))) {
                if (!columnMap['sale_price']) columnMap['sale_price'] = index;
            }
            // If header contains both "alış" and "satış", it might be a combined column
            // In that case, we need to check the next column or split
            else if (normalized.includes('alış') && normalized.includes('satış')) {
                // This is a combined column, we'll try to split or use next column
                // For now, treat first part as purchase_price
                if (!columnMap['purchase_price']) columnMap['purchase_price'] = index;
                // Check if next column exists and might be sale_price
                if (index + 1 < headerRow.length) {
                    const nextHeader = String(headerRow[index + 1] || '').toLowerCase().trim();
                    if (nextHeader.includes('qiymət') || nextHeader === 'qiymət' || nextHeader === 'qiymat') {
                        if (!columnMap['sale_price']) columnMap['sale_price'] = index + 1;
                    }
                }
            }
            // Stock
            else if (normalized === 'stok' || (normalized.includes('stok') && !normalized.includes('qiymət'))) {
                if (!columnMap['stock']) columnMap['stock'] = index;
            }
            // Barcode
            else if (normalized === 'barcode' || normalized === 'barkod') {
                if (!columnMap['barcode']) columnMap['barcode'] = index;
            }
            // Description
            else if (normalized === 'təsvir' || normalized === 'tesvir' || normalized === 'description') {
                if (!columnMap['description']) columnMap['description'] = index;
            }
            // Category
            else if ((normalized === 'kateqoriya' || normalized === 'kategoriya' || normalized === 'category') && !normalized.includes('alt')) {
                if (!columnMap['category']) columnMap['category'] = index;
            }
            // Subcategory
            else if (normalized.includes('alt') && (normalized.includes('kateqoriya') || normalized.includes('kategoriya'))) {
                if (!columnMap['subcategory']) columnMap['subcategory'] = index;
            }
            // Active
            else if (normalized === 'aktiv' || normalized === 'is_active' || normalized === 'isactive') {
                if (!columnMap['is_active']) columnMap['is_active'] = index;
            }
            // Official
            else if (normalized.includes('rəsmi') || normalized.includes('resmi') || normalized.includes('official')) {
                if (!columnMap['is_official']) columnMap['is_official'] = index;
            }
            // English column names
            else if (normalized === 'name') {
                if (!columnMap['name']) columnMap['name'] = index;
            } else if (normalized === 'invoice_name' || normalized === 'invoicename') {
                if (!columnMap['invoice_name']) columnMap['invoice_name'] = index;
            } else if (normalized === 'purchase_price' || normalized === 'purchaseprice') {
                if (!columnMap['purchase_price']) columnMap['purchase_price'] = index;
            } else if (normalized === 'sale_price' || normalized === 'saleprice') {
                if (!columnMap['sale_price']) columnMap['sale_price'] = index;
            } else if (normalized === 'stock') {
                if (!columnMap['stock']) columnMap['stock'] = index;
            }
        });

        // Convert to JSON with normalized column names
        const data = [];
        for (let i = 1; i < rawData.length; i++) {
            const row = rawData[i];
            if (!row || row.length === 0) continue;

            const normalizedRow = {};
            Object.keys(columnMap).forEach(key => {
                const colIndex = columnMap[key];
                normalizedRow[key] = row[colIndex] !== undefined && row[colIndex] !== '' ? row[colIndex] : null;
            });
            data.push(normalizedRow);
        }

        if (!data || data.length === 0) {
            // Clean up file
            fs.unlinkSync(filePath);
            return res.status(400).json({
                success: false,
                message: "Excel faylı boşdur və ya məlumat yoxdur",
            });
        }

        const imported = [];
        const errors = [];
        let successCount = 0;
        let errorCount = 0;

        // Fetch all categories and subcategories for mapping
        const categories = await prisma.category.findMany();
        const subCategories = await prisma.subcategory.findMany();

        const categoryMap = new Map(categories.map(cat => [cat.name.toLowerCase().trim(), cat.id]));
        const subCategoryMap = new Map(subCategories.map(sub => [sub.name.toLowerCase().trim(), sub.id]));

        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            const rowNumber = i + 2; // +2 because Excel starts at row 1 and we have header

            try {
                // Get values from normalized row
                const name = row.name ? String(row.name).trim() : '';
                const invoiceName = row.invoice_name || row.invoiceName ? String(row.invoice_name || row.invoiceName).trim() : null;
                const purchasePriceStr = row.purchase_price !== null && row.purchase_price !== undefined && row.purchase_price !== '' ? String(row.purchase_price) : '';
                const salePriceStr = row.sale_price !== null && row.sale_price !== undefined && row.sale_price !== '' ? String(row.sale_price) : '';
                const stockStr = row.stock !== null && row.stock !== undefined && row.stock !== '' ? String(row.stock) : '';

                // Validate required fields
                if (!name || !purchasePriceStr || !salePriceStr || !stockStr) {
                    errors.push({
                        row: rowNumber,
                        error: "Ad, Alış Qiyməti, Satış Qiyməti və Stok mütləqdir"
                    });
                    errorCount++;
                    continue;
                }

                // Parse values
                const purchasePrice = parseFloat(purchasePriceStr);
                const salePrice = parseFloat(salePriceStr);
                const stock = parseInt(stockStr);
                const barcode = row.barcode ? String(row.barcode).trim() : null;
                const description = row.description ? String(row.description).trim() : null;

                // Category mapping
                let categoryId = null;
                if (row.category) {
                    const categoryName = String(row.category).toLowerCase().trim();
                    categoryId = categoryMap.get(categoryName) || null;
                }

                // SubCategory mapping
                let subCategoryId = null;
                if (row.subcategory) {
                    const subCategoryName = String(row.subcategory).toLowerCase().trim();
                    subCategoryId = subCategoryMap.get(subCategoryName) || null;
                }

                // Parse boolean fields
                let isActive = true;
                if (row.is_active !== null && row.is_active !== undefined && row.is_active !== '') {
                    const activeStr = String(row.is_active).toLowerCase().trim();
                    isActive = activeStr === 'true' || activeStr === '1' || activeStr === 'yes' || activeStr === 'bəli' || activeStr === 'beli';
                }

                let isOfficial = false;
                if (row.is_official !== null && row.is_official !== undefined && row.is_official !== '') {
                    const officialStr = String(row.is_official).toLowerCase().trim();
                    isOfficial = officialStr === 'true' || officialStr === '1' || officialStr === 'yes' || officialStr === 'bəli' || officialStr === 'beli';
                }

                // Validate prices
                if (purchasePrice <= 0 || salePrice <= 0) {
                    errors.push({
                        row: rowNumber,
                        error: "Alış və Satış qiymətləri 0-dan böyük olmalıdır"
                    });
                    errorCount++;
                    continue;
                }

                if (salePrice < purchasePrice) {
                    errors.push({
                        row: rowNumber,
                        error: "Satış qiyməti alış qiymətindən kiçik ola bilməz"
                    });
                    errorCount++;
                    continue;
                }

                // Check if barcode already exists
                if (barcode) {
                    const existingProduct = await prisma.product.findFirst({
                        where: { barcode: barcode }
                    });
                    if (existingProduct) {
                        errors.push({
                            row: rowNumber,
                            error: `Barcode "${barcode}" artıq istifadə olunur`
                        });
                        errorCount++;
                        continue;
                    }
                }

                // Create product
                const product = await prisma.product.create({
                    data: {
                        name: name,
                        invoiceName: invoiceName || null,
                        description: description,
                        purchasePrice: new Prisma.Decimal(purchasePrice),
                        salePrice: new Prisma.Decimal(salePrice),
                        hasDiscount: false,
                        discountPrice: null,
                        discountPercent: null,
                        barcode: barcode,
                        stock: stock,
                        isActive: isActive,
                        isOfficial: isOfficial,
                        categoryId: categoryId,
                        subCategoryId: subCategoryId,
                        imageUrl: null
                    }
                });

                imported.push(product);
                successCount++;

                // Məhsul yalnız mərkəzi anbarda yaradılır (heç bir filiala avtomatik bağlanmır)

                // Activity log
                try {
                    await createActivityLog({
                        staffId: req.staffId || null,
                        entityType: "Product",
                        entityId: product.id,
                        action: "CREATE",
                        description: `Məhsul Excel-dən idxal edildi: ${product.name}`,
                        changes: {
                            name: product.name,
                            purchasePrice: product.purchasePrice.toString(),
                            salePrice: product.salePrice.toString(),
                            stock: product.stock
                        }
                    });
                } catch (logError) {
                    console.error("Activity log yaradılarkən xəta:", logError);
                }

            } catch (error) {
                console.error(`Row ${rowNumber} error:`, error);
                errors.push({
                    row: rowNumber,
                    error: error.message || "Naməlum xəta"
                });
                errorCount++;
            }
        }

        // Clean up file
        try {
            fs.unlinkSync(filePath);
        } catch (cleanupError) {
            console.error("File cleanup error:", cleanupError);
        }

        return res.status(200).json({
            success: true,
            message: `${successCount} məhsul uğurla idxal edildi${errorCount > 0 ? `, ${errorCount} xəta` : ''}`,
            data: {
                imported: successCount,
                errors: errorCount,
                total: data.length,
                errorDetails: errors.length > 0 ? errors : undefined
            }
        });

    } catch (error) {
        console.error("importProductsFromExcel error", error);

        // Clean up file if exists
        if (req.file && req.file.path) {
            try {
                fs.unlinkSync(req.file.path);
            } catch (cleanupError) {
                console.error("File cleanup error:", cleanupError);
            }
        }

        return res.status(500).json({
            success: false,
            message: "Excel faylı idxal edilərkən xəta baş verdi: " + error.message,
        });
    }
};

// Məhsul üçün satış məlumatlarını qaytarır
export const getProductSales = async (req, res) => {
    try {
        const { id: productId } = req.params;

        if (!productId) {
            return res.status(400).json({
                success: false,
                message: "Məhsul ID tələb olunur",
            });
        }

        // Məhsulun satış məlumatlarını al
        const saleItems = await prisma.saleitem.findMany({
            where: {
                productId: productId
            },
            include: {
                sale: {
                    include: {
                        receipts: {
                            take: 1
                        }
                    }
                },
                product: {
                    select: {
                        id: true,
                        name: true,
                        unitType: true,
                        piecesPerBox: true
                    }
                }
            },
            orderBy: {
                sale: {
                    createdAt: 'desc'
                }
            }
        });

        // ActivityLog-dan staff məlumatlarını al və sale-lərə əlavə et
        const saleIds = saleItems.map(item => item.sale.id);
        const activityLogs = await prisma.activitylog.findMany({
            where: {
                entityType: 'Sale',
                entityId: {
                    in: saleIds
                },
                action: 'CREATE'
            },
            include: {
                staff: {
                    select: {
                        id: true,
                        name: true,
                        surName: true
                    }
                }
            }
        });

        // Sale-lərə staff məlumatını əlavə et
        const staffMap = {};
        activityLogs.forEach(log => {
            if (log.entityId && log.staff) {
                staffMap[log.entityId] = log.staff;
            }
        });

        saleItems.forEach(item => {
            if (staffMap[item.sale.id]) {
                item.sale.staff = staffMap[item.sale.id];
            }
        });

        return res.json({
            success: true,
            date: saleItems,
        });
    } catch (error) {
        console.error("getProductSales error", error);
        return res.status(500).json({
            success: false,
            message: "Satış məlumatları alınarkən xəta baş verdi",
        });
    }
};

// Məhsul üçün qaytarma məlumatlarını qaytarır
export const getProductReturns = async (req, res) => {
    try {
        const { id: productId } = req.params;

        if (!productId) {
            return res.status(400).json({
                success: false,
                message: "Məhsul ID tələb olunur",
            });
        }

        // Məhsulun qaytarma məlumatlarını al
        const returnItems = await prisma.salereturnitem.findMany({
            where: {
                productId: productId
            },
            include: {
                return: true,
                product: {
                    select: {
                        id: true,
                        name: true,
                        unitType: true,
                        piecesPerBox: true
                    }
                }
            },
            orderBy: {
                return: {
                    createdAt: 'desc'
                }
            }
        });

        return res.json({
            success: true,
            date: returnItems,
        });
    } catch (error) {
        console.error("getProductReturns error", error);
        return res.status(500).json({
            success: false,
            message: "Qaytarma məlumatları alınarkən xəta baş verdi",
        });
    }
};

