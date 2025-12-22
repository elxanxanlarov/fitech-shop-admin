import prisma from "../lib/prisma.js";
import { Prisma } from "@prisma/client";
import { createActivityLog } from "./activityLogController.js";
import XLSX from "xlsx";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

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
            maxSalePrice
        } = req.query;

        const where = {};

        // DeleteType filter - default olaraq yalnız silinməyən məhsulları göstər
        if (includeDeleted === 'true') {
            // Bütün məhsulları göstər (silinmişlər də daxil)
        } else if (deleteType) {
            where.deleteType = deleteType.toUpperCase();
        } else {
            // Default: yalnız silinməyən məhsulları göstər
            where.deleteType = 'NONE';
        }

        // Category filter by ID (takes precedence over categoryName)
        if (categoryId) {
            where.categoryId = categoryId;
        } else if (categoryName) {
            // Category filter by name (only if categoryId is not provided)
            // First find the category by name (exact match)
            // Note: MySQL default collation is case-insensitive for most setups
            const category = await prisma.category.findFirst({
                where: {
                    name: categoryName
                },
                select: { id: true }
            });
            
            if (category) {
                where.categoryId = category.id;
            } else {
                // If category not found, return empty result
                where.categoryId = 'non-existent-id';
            }
        }

        // Stock status filter (in stock, low stock, out of stock)
        // Note: stockStatus takes precedence over minStock/maxStock
        if (stockStatus) {
            const stockStatusLower = stockStatus.toLowerCase().trim();
            if (stockStatusLower === 'stokda var' || stockStatusLower === 'in stock') {
                where.stock = { gt: 10 };
            } else if (stockStatusLower === 'az stok' || stockStatusLower === 'low stock') {
                where.stock = { gte: 1, lte: 10 };
            } else if (stockStatusLower === 'stokda yoxdur' || stockStatusLower === 'out of stock') {
                where.stock = 0;
            }
        } else {
            // Stock range filter (only if stockStatus is not set)
        if (minStock !== undefined || maxStock !== undefined) {
            where.stock = {};
            if (minStock !== undefined) where.stock.gte = parseInt(minStock);
            if (maxStock !== undefined) where.stock.lte = parseInt(maxStock);
            }
        }

        // Has image filter
        if (hasImage === 'true') where.imageUrl = { not: null };
        else if (hasImage === 'false') where.imageUrl = null;

        // Status filter
        if (isActive !== undefined) {
            where.isActive = isActive === 'true' || isActive === true;
        }

        // Official status filter
        if (isOfficial !== undefined) {
            const isOfficialValue = isOfficial.toLowerCase().trim();
            if (isOfficialValue === 'rəsmi' || isOfficialValue === 'official' || isOfficialValue === 'true') {
                where.isOfficial = true;
            } else if (isOfficialValue === 'qeyri-rəsmi' || isOfficialValue === 'unofficial' || isOfficialValue === 'false') {
                where.isOfficial = false;
            }
        }

        // Price range filters
        if (minPurchasePrice !== undefined || maxPurchasePrice !== undefined) {
            where.purchasePrice = {};
            if (minPurchasePrice !== undefined) {
                where.purchasePrice.gte = new Prisma.Decimal(minPurchasePrice);
            }
            if (maxPurchasePrice !== undefined) {
                where.purchasePrice.lte = new Prisma.Decimal(maxPurchasePrice);
            }
        }

        if (minSalePrice !== undefined || maxSalePrice !== undefined) {
            where.salePrice = {};
            if (minSalePrice !== undefined) {
                where.salePrice.gte = new Prisma.Decimal(minSalePrice);
            }
            if (maxSalePrice !== undefined) {
                where.salePrice.lte = new Prisma.Decimal(maxSalePrice);
            }
        }

        // Search
        // Note: MySQL default collation is case-insensitive, so mode is not needed
        if (search && search.trim()) {
            const searchTerm = search.trim();
            const searchConditions = [
                { name: { contains: searchTerm } },
                { invoiceName: { contains: searchTerm } },
                { barcode: { contains: searchTerm } }
            ];
            
            // Description field null ola bilər, ona görə də null check edirik
            searchConditions.push({
                AND: [
                    { description: { not: null } },
                    { description: { contains: searchTerm } }
                ]
            });
            
            where.OR = searchConditions;
        }

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
                }
            },
            orderBy: {
                createdAt: 'desc',
            }
        });

        // Format the response to include category name in the product title
        const formattedProducts = products.map(product => ({
            ...product,
            titleWithCategory: product.name,
            categoryName: product.category?.name || '',
            subCategoryName: product.subCategory?.name || ''
        }));

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
        const product = await prisma.product.findUnique({
            where: { id },
            include: {
                category: true,
                subCategory: true
            }
        });

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Məhsul tapılmadı",
            });
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
                stock: stock !== undefined ? parseInt(stock) : 0,
                isActive: typeof isActive === "boolean" ? isActive : true,
                isOfficial: typeof isOfficial === "boolean" ? isOfficial : false,
                categoryId: categoryId || null,
                subCategoryId: subCategoryId || null,
            }
        });

        // Activity log yarat
        try {
            await createActivityLog({
                staffId: req.staffId || null,
                entityType: "Product",
                entityId: newProduct.id,
                action: "CREATE",
                description: `Yeni məhsul yaradıldı: ${newProduct.name}`,
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
            message: "Məhsul yeniləndi",
            data: newProduct,
            date:newProduct
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
            invoiceName
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

        const updated = await prisma.product.update({
            where: { id },
            data: {
                name: name !== undefined ? (name?.trim() || null) : undefined,
                description: description !== undefined ? (description?.trim() || null) : undefined,
                imageUrl: imageUrl !== undefined ? (imageUrl?.trim() || null) : undefined,

                purchasePrice: purchasePriceDecimal,
                salePrice: salePriceDecimal,

                hasDiscount: finalHasDiscount,
                discountPrice: finalDiscountPrice,
                discountPercent: finalDiscountPercent,

                barcode: barcode !== undefined ? (barcode?.trim() || null) : undefined,
                stock: stock !== undefined ? parseInt(stock) : undefined,
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

            await createActivityLog({
                staffId: req.staffId || null,
                entityType: "Product",
                entityId: updated.id,
                action: "UPDATE",
                description: `Məhsul yeniləndi: ${updated.name}`,
                changes: Object.keys(changes).length > 0 ? changes : null
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

export const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const { deleteType = 'SOFT' } = req.body; // Default: SOFT delete
        
        // Ensure deleteType is valid
        const validDeleteType = (deleteType && typeof deleteType === 'string' && deleteType.toUpperCase() === 'HARD') ? 'HARD' : 'SOFT';
        
        const existingProduct = await prisma.product.findUnique({
            where: { id }
        });

        if (!existingProduct) {
            return res.status(404).json({
                success: false,
                message: "Məhsul tapılmadı",
            });
        }

        // DeleteType-a görə silmə
        if (validDeleteType === 'HARD') {
            // Hard delete - məhsulu tamamilə sil
            await prisma.product.delete({
                where: { id }
            });
        } else {
            // Soft delete - deleteType-u dəyiş
            await prisma.product.update({
                where: { id },
                data: {
                    deleteType: 'SOFT',
                    isActive: false // Soft delete zamanı isActive də false olsun
                }
            });
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
        const subCategories = await prisma.subCategory.findMany();

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

