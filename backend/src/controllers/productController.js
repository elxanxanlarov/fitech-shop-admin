import prisma from "../lib/prisma.js";
import { Prisma } from "@prisma/client";
import { createActivityLog } from "./activityLogController.js";
import XLSX from "xlsx";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

export const getAllProducts = async (req, res) => {
    try {
        const products = await prisma.product.findMany({
            include: {
                category: true,
                subCategory: true
            },
            orderBy: {
                createdAt: 'desc',
            }
        });

        return res.status(200).json({
            success: true,
            date: products,
        });
    } catch (error) {
        console.error("getAllProducts error", error);
        return res.status(500).json({
            success: false,
            message: "Məhsul siyahısı alınarkən xəta baş verdi"
        });
    }
};

export const getProductById = async (req, res) => {
    try {
        const { id } = req.params;
        const product = await prisma.product.findUnique({
            where: { id },
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
            isOfficial
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

        return res.status(201).json({
            success: true,
            message: "Məhsul yaradıldı",
            date: newProduct,
            data: newProduct,
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
            subCategoryId
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
                name: name !== undefined ? (name?.trim() || null) : existingProduct.name,
                description: description !== undefined ? (description?.trim() || null) : existingProduct.description,
                imageUrl: imageUrl !== undefined ? (imageUrl?.trim() || null) : existingProduct.imageUrl,
                purchasePrice: purchasePriceDecimal,
                salePrice: salePriceDecimal,
                hasDiscount: finalHasDiscount,
                discountPrice: finalDiscountPrice,
                discountPercent: finalDiscountPercent,
                barcode: barcode !== undefined ? (barcode?.trim() || null) : existingProduct.barcode,
                stock: stock !== undefined ? parseInt(stock) : existingProduct.stock,
                isActive: typeof isActive === "boolean" ? isActive : existingProduct.isActive,
                isOfficial: typeof isOfficial === "boolean" ? isOfficial : existingProduct.isOfficial,
                categoryId: categoryId !== undefined ? (categoryId || null) : existingProduct.categoryId,
                subCategoryId: subCategoryId !== undefined ? (subCategoryId || null) : existingProduct.subCategoryId,
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
            date: updated,
            data: updated,
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
        const existingProduct = await prisma.product.findUnique({
            where: { id }
        });

        if (!existingProduct) {
            return res.status(404).json({
                success: false,
                message: "Məhsul tapılmadı",
            });
        }

        await prisma.product.delete({
            where: { id }
        });

        // Activity log yarat
        try {
            await createActivityLog({
                staffId: req.staffId || null,
                entityType: "Product",
                entityId: existingProduct.id,
                action: "DELETE",
                description: `Məhsul silindi: ${existingProduct.name}`,
                changes: {
                    name: existingProduct.name,
                    purchasePrice: existingProduct.purchasePrice.toString(),
                    salePrice: existingProduct.salePrice.toString(),
                    stock: existingProduct.stock
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
            if ((normalized === 'ad' || normalized.startsWith('ad')) && !normalized.includes('qiymət') && !normalized.includes('qiymat')) {
                if (!columnMap['name']) columnMap['name'] = index;
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

