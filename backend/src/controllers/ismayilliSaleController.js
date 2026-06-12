import prisma from "../lib/prisma.js";
import xlsx from "xlsx";

/**
 * POST /ismayilli/sale/import-excel
 * Excel-dən kütləvi satış yaradır.
 *
 * Excel format (header SƏTRİ olmaya da bilər):
 *   Column A: Məhsul adı (mövcud DB-yə uyğun arxa plan üçün)
 *   Column B: Barkod (mütləq)
 *   Column C: Ədəd (mütləq, müsbət ədəd)
 *
 * Hər row → bir satış yaradılır (ayrı çek nömrəsi ilə).
 * Tapılmayan barkodlar siyahıda qaytarılır.
 */
export const importSalesFromExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Excel faylı yüklənmədi" });
    }

    // updateStock: 'true' (default) → satış stoku azaldır, qaytarma stoku artırır.
    //              'false' → stok ümumiyyətlə dəyişmir (yalnız sənəd yaradılır).
    const updateStock = String(req.body?.updateStock ?? 'true').toLowerCase() !== 'false';

    // priceSource: 'db' (default) — vahid satış qiyməti bazadan götürülür
    //              'excel' — vahid qiymət Excel-dəki cəmi məbləğdən hesablanır (D sütunu ÷ miqdar).
    //                        Bu, 1C-dəki faktiki satış qiymətinə uyğun gəlmək üçün lazımdır
    //                        (endirim/güzəştli qiymət hallarında).
    const priceSource = String(req.body?.priceSource || '').toLowerCase() === 'excel' ? 'excel' : 'db';

    const wb = xlsx.read(req.file.buffer, { type: "buffer" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: false });

    if (!rows || rows.length === 0) {
      return res.status(400).json({ success: false, message: "Excel faylı boşdur" });
    }

    // Heuristik: birinci sətr header-dirmi? Əgər B sütunu rəqəm-rəqəm formatda deyilsə header sayılır.
    const firstBarcode = rows[0]?.[1] ? String(rows[0][1]).trim() : "";
    const startIdx = /^\d{6,}$/.test(firstBarcode) ? 0 : 1;

    const cleanNumber = (val) => {
      if (val === null || val === undefined || val === "") return 0;
      if (typeof val === "number" && Number.isFinite(val)) return val;
      let s = String(val).trim().replace(/[^\d.,\-]/g, "");
      const hasComma = s.includes(",");
      const hasDot = s.includes(".");
      if (hasComma && hasDot) {
        if (s.lastIndexOf(",") > s.lastIndexOf(".")) s = s.replace(/\./g, "").replace(",", ".");
        else s = s.replace(/,/g, "");
      } else if (hasComma) s = s.replace(",", ".");
      const n = parseFloat(s);
      return Number.isFinite(n) ? n : 0;
    };

    const notFound = [];
    const insufficientStock = [];
    const created = [];
    const returnedItems = [];
    const skipped = [];

    // Hər row → ayrı satış (Prisma transaction)
    for (let i = startIdx; i < rows.length; i++) {
      const row = rows[i];
      if (!row) continue;

      const excelName = row[0] ? String(row[0]).trim() : "";
      const barcode = row[1] ? String(row[1]).trim() : "";
      const rawC = row[2];
      const qtyRaw = cleanNumber(rawC);

      if (!barcode || !/^\d{6,}$/.test(barcode)) {
        skipped.push({ row: i + 1, reason: "Barkod yoxdur və ya səhvdir", excelName });
        continue;
      }

      // Qaytarma aşkarlanması:
      //   1) C sütunu boşdur (rawC = null/undefined/'')
      //   2) Miqdar 0 və ya mənfidir
      const isCEmpty = rawC === null || rawC === undefined || String(rawC).trim() === '';
      const isReturn = isCEmpty || qtyRaw <= 0;
      // Qaytarma miqdarı: boşdursa default 1, mənfi olarsa Math.abs.
      const qty = isReturn ? (isCEmpty ? 1 : Math.abs(qtyRaw)) : qtyRaw;

      const product = await prisma.ismayilliMagazaProduct.findUnique({ where: { barcode } });
      if (!product) {
        notFound.push({ row: i + 1, barcode, qty, excelName, isReturn });
        continue;
      }

      // Stok yoxlaması: yalnız satışda və `updateStock=true` halında lazımdır.
      // Qaytarmada stok azalmır, deməli yoxlamağa ehtiyac yoxdur.
      const currentStock = parseFloat(product.quantity);
      if (!isReturn && updateStock && currentStock < qty) {
        insufficientStock.push({
          row: i + 1, barcode, qty, available: currentStock, productName: product.name
        });
        continue;
      }

      try {
        // Excel-dəki cəmi məbləğ — D sütunu (indeks 3).
        // priceSource='excel' halında vahid qiymət = D ÷ qty (1C ilə eyni nəticə üçün).
        const excelTotalRaw = cleanNumber(row[3]);

        const result = await prisma.$transaction(async (tx) => {
          const unitPricePurchase = parseFloat(product.unitPricePurchase);
          let unitPriceSale = parseFloat(product.unitPriceSale);

          if (priceSource === 'excel' && excelTotalRaw > 0 && qty > 0) {
            unitPriceSale = Math.round((excelTotalRaw / qty) * 10000) / 10000;
          }
          const totalPrice = qty * unitPriceSale;

          // Çek nömrəsi (həm satış, həm qaytarma üçün ayrıca yaradılır)
          const maxCheck = await tx.ismayilliSale.aggregate({ _max: { checkNumber: true } });
          const checkNumber = (maxCheck._max.checkNumber ?? 0) + 1;

          if (isReturn) {
            // 1) Əvvəlcə "uydurma" satış yarat — qaytarmanın bağlanması üçün lazımdır.
            const sale = await tx.ismayilliSale.create({
              data: {
                checkNumber,
                totalAmount: totalPrice,
                paidAmount: totalPrice,
                note: "Excel idxalı (qaytarma)",
                items: {
                  create: [{
                    productId: product.id,
                    quantity: qty,
                    pricePerItem: unitPriceSale,
                    totalPrice,
                    purchasePrice: unitPricePurchase,
                  }],
                },
              },
              include: { items: true },
            });

            const saleItem = sale.items[0];

            // 2) Dərhal qaytarma yarat (eyni miqdarda)
            await tx.ismayilliSaleReturn.create({
              data: {
                saleId: sale.id,
                totalAmount: totalPrice,
                returnedAmount: totalPrice,
                reason: "Excel idxalından qaytarma",
                note: `Sətir ${i + 1}: ${excelName || product.name}`,
                items: {
                  create: [{
                    saleItemId: saleItem.id,
                    productId: product.id,
                    quantity: qty,
                    pricePerItem: unitPriceSale,
                    totalPrice,
                    purchasePrice: unitPricePurchase,
                    loss: 0,
                  }],
                },
              },
            });

            // 3) Satışı tam qaytarılmış kimi işarələ
            await tx.ismayilliSale.update({
              where: { id: sale.id },
              data: { isRefunded: true },
            });

            // Net stok dəyişikliyi: satış (-qty) + qaytarma (+qty) = 0.
            // Yəni updateStock=true olsa belə qaytarma cəbri sıfır olur, məhsul anbarda qalır.
            return {
              type: 'return',
              saleId: sale.id,
              checkNumber,
              totalPrice,
              productName: product.name,
              qty,
            };
          }

          // === Adi satış ===
          if (updateStock) {
            const nextQty = currentStock - qty;
            await tx.ismayilliMagazaProduct.update({
              where: { id: product.id },
              data: {
                quantity: nextQty,
                totalPurchasePrice: nextQty * unitPricePurchase,
                totalSalePrice: nextQty * unitPriceSale,
              },
            });
          }

          const sale = await tx.ismayilliSale.create({
            data: {
              checkNumber,
              totalAmount: totalPrice,
              paidAmount: totalPrice,
              note: updateStock ? "Excel idxalı" : "Excel idxalı (stok dəyişdirilmədi)",
              items: {
                create: [{
                  productId: product.id,
                  quantity: qty,
                  pricePerItem: unitPriceSale,
                  totalPrice,
                  purchasePrice: unitPricePurchase,
                }],
              },
            },
          });
          return {
            type: 'sale',
            saleId: sale.id,
            checkNumber,
            totalPrice,
            productName: product.name,
            qty,
          };
        });

        if (result.type === 'return') returnedItems.push(result);
        else created.push(result);
      } catch (txErr) {
        console.error(`Excel sale tx error (row ${i + 1}):`, txErr);
        skipped.push({ row: i + 1, reason: txErr.message, barcode, qty });
      }
    }

    const totalAmount = created.reduce((s, x) => s + x.totalPrice, 0);
    const totalQty = created.reduce((s, x) => s + x.qty, 0);
    const totalReturnAmount = returnedItems.reduce((s, x) => s + x.totalPrice, 0);
    const totalReturnQty = returnedItems.reduce((s, x) => s + x.qty, 0);

    return res.status(200).json({
      success: true,
      message: `${created.length} satış, ${returnedItems.length} qaytarma yaradıldı`,
      data: {
        updateStock,
        createdCount: created.length,
        returnedCount: returnedItems.length,
        notFoundCount: notFound.length,
        insufficientStockCount: insufficientStock.length,
        skippedCount: skipped.length,
        totalAmount,
        totalQty,
        totalReturnAmount,
        totalReturnQty,
        created,
        returnedItems,
        notFound,
        insufficientStock,
        skipped,
      },
    });
  } catch (error) {
    console.error("importSalesFromExcel error", error);
    return res.status(500).json({ success: false, message: error.message || "Excel-dən satış idxalı zamanı xəta baş verdi" });
  }
};

export const getAllSales = async (req, res) => {
  try {
    const sales = await prisma.ismayilliSale.findMany({
      include: {
        items: {
          include: {
            product: true,
            returnItems: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });
    return res.status(200).json({ success: true, data: sales });
  } catch (error) {
    console.error("getAllSales error", error);
    return res.status(500).json({ success: false, message: "Satışlar alınarkən xəta baş verdi" });
  }
};

export const getSaleById = async (req, res) => {
  try {
    const { id } = req.params;
    const sale = await prisma.ismayilliSale.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true,
            returnItems: true
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
    return res.status(500).json({ success: false, message: "Satış axtarılarkən xəta baş verdi" });
  }
};

export const createSale = async (req, res) => {
  try {
    const { items, paidAmount, note } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: "Satış üçün məhsullar tələb olunur" });
    }

    // Prisma Transaction
    const result = await prisma.$transaction(async (tx) => {
      let totalAmount = 0;
      const saleItemsToCreate = [];

      for (const item of items) {
        const { productId, quantity } = item;
        const qty = parseFloat(quantity);
        if (!productId || isNaN(qty) || qty <= 0) {
          throw new Error("Düzgün məhsul ID və ya miqdarı daxil edilməyib");
        }

        const product = await tx.ismayilliMagazaProduct.findUnique({
          where: { id: productId }
        });

        if (!product) {
          throw new Error(`Məhsul tapılmadı: ID ${productId}`);
        }

        const currentStock = parseFloat(product.quantity);
        if (currentStock < qty) {
          throw new Error(`"${product.name}" məhsulu üçün kifayət qədər stok yoxdur. Mövcud stok: ${currentStock}`);
        }

        const unitPricePurchase = parseFloat(product.unitPricePurchase);
        const unitPriceSale = parseFloat(product.unitPriceSale);
        const totalPrice = qty * unitPriceSale;

        totalAmount += totalPrice;

        saleItemsToCreate.push({
          productId,
          quantity: qty,
          pricePerItem: unitPriceSale,
          totalPrice,
          purchasePrice: unitPricePurchase
        });

        // Stokdan çıx və total qiymətləri yenilə
        const nextQty = currentStock - qty;
        await tx.ismayilliMagazaProduct.update({
          where: { id: productId },
          data: {
            quantity: nextQty,
            totalPurchasePrice: nextQty * unitPricePurchase,
            totalSalePrice: nextQty * unitPriceSale
          }
        });
      }

      const paid = paidAmount !== undefined ? parseFloat(paidAmount) : totalAmount;

      const maxCheck = await tx.ismayilliSale.aggregate({
        _max: { checkNumber: true }
      });
      const checkNumber = (maxCheck._max.checkNumber ?? 0) + 1;

      const newSale = await tx.ismayilliSale.create({
        data: {
          checkNumber,
          totalAmount,
          paidAmount: paid,
          note: note ? note.trim() : null,
          items: {
            create: saleItemsToCreate
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

      return newSale;
    });

    return res.status(201).json({ success: true, data: result });
  } catch (error) {
    console.error("createSale error", error);
    return res.status(500).json({ success: false, message: error.message || "Satış yaradılarkən xəta baş verdi" });
  }
};

export const deleteSale = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Role validation
    const staff = await prisma.staff.findUnique({
      where: { id: req.staffId },
      include: { role: true }
    });

    if (!staff) {
      return res.status(401).json({ success: false, message: "İstifadəçi tapılmadı" });
    }

    const roleName = staff.role?.name?.toLowerCase();
    const isHeadAdmin = roleName === "superadmin" || (roleName === "admin" && staff.isBoss);
    const isSeller = roleName === "satici" || roleName === "seller";

    if (!isHeadAdmin && !isSeller) {
      return res.status(403).json({ 
        success: false, 
        message: "Bu əməliyyat üçün icazəniz yoxdur." 
      });
    }

    // 2. Fetch the sale with items
    const sale = await prisma.ismayilliSale.findUnique({
      where: { id },
      include: { items: true }
    });

    if (!sale) {
      return res.status(404).json({ success: false, message: "Satış tapılmadı" });
    }

    // 3. Prisma Transaction to restore stock and delete sale
    await prisma.$transaction(async (tx) => {
      for (const item of sale.items) {
        const product = await tx.ismayilliMagazaProduct.findUnique({
          where: { id: item.productId }
        });

        if (product) {
          const nextQty = parseFloat(product.quantity) + parseFloat(item.quantity);
          const unitPricePurchase = parseFloat(product.unitPricePurchase);
          const unitPriceSale = parseFloat(product.unitPriceSale);

          await tx.ismayilliMagazaProduct.update({
            where: { id: item.productId },
            data: {
              quantity: nextQty,
              totalPurchasePrice: nextQty * unitPricePurchase,
              totalSalePrice: nextQty * unitPriceSale
            }
          });
        }
      }

      // Delete items and the sale itself
      await tx.ismayilliSaleItem.deleteMany({
        where: { saleId: id }
      });

      await tx.ismayilliSale.delete({
        where: { id }
      });
    });

    return res.status(200).json({ success: true, message: "Satış tarixçəsi uğurla silindi və stok bərpa olundu" });
  } catch (error) {
    console.error("deleteSale error", error);
    return res.status(500).json({ success: false, message: "Satış silinərkən xəta baş verdi" });
  }
};

export const deleteAllSales = async (req, res) => {
  try {
    // 1. Role validation
    const staff = await prisma.staff.findUnique({
      where: { id: req.staffId },
      include: { role: true }
    });

    if (!staff) {
      return res.status(401).json({ success: false, message: "İstifadəçi tapılmadı" });
    }

    const roleName = staff.role?.name?.toLowerCase();
    const isHeadAdmin = roleName === "superadmin" || (roleName === "admin" && staff.isBoss);
    const isSeller = roleName === "satici" || roleName === "seller";

    if (!isHeadAdmin && !isSeller) {
      return res.status(403).json({ 
        success: false, 
        message: "Bu əməliyyat üçün icazəniz yoxdur." 
      });
    }

    // 2. Fetch all sales with items
    const sales = await prisma.ismayilliSale.findMany({
      include: { items: true }
    });

    // 3. Prisma Transaction to restore stock and delete all sales
    await prisma.$transaction(async (tx) => {
      for (const sale of sales) {
        for (const item of sale.items) {
          const product = await tx.ismayilliMagazaProduct.findUnique({
            where: { id: item.productId }
          });

          if (product) {
            const nextQty = parseFloat(product.quantity) + parseFloat(item.quantity);
            const unitPricePurchase = parseFloat(product.unitPricePurchase);
            const unitPriceSale = parseFloat(product.unitPriceSale);

            await tx.ismayilliMagazaProduct.update({
              where: { id: item.productId },
              data: {
                quantity: nextQty,
                totalPurchasePrice: nextQty * unitPricePurchase,
                totalSalePrice: nextQty * unitPriceSale
              }
            });
          }
        }
      }

      // Delete all sale items
      await tx.ismayilliSaleItem.deleteMany({});
      // Delete all sales
      await tx.ismayilliSale.deleteMany({});
    });

    return res.status(200).json({ success: true, message: "Bütün satışax tarixçəsi uğurla silindi və stoklar bərpa olundu" });
  } catch (error) {
    console.error("deleteAllSales error", error);
    return res.status(500).json({ success: false, message: "Bütün satışlar silinərkən xəta baş verdi" });
  }
};

/**
 * POST /ismayilli/sale/bulk-delete
 * body: { ids: [string, ...] }
 * Seçilmiş İsmayıllı satışlarını silir və stokları bərpa edir.
 */
export const bulkDeleteSales = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: "Silinəcək satış ID-ləri tələb olunur" });
    }

    const staff = await prisma.staff.findUnique({
      where: { id: req.staffId },
      include: { role: true },
    });
    if (!staff) return res.status(401).json({ success: false, message: "İstifadəçi tapılmadı" });

    const roleName = staff.role?.name?.toLowerCase();
    const isHeadAdmin = roleName === "superadmin" || (roleName === "admin" && staff.isBoss);
    const isSeller = roleName === "satici" || roleName === "seller";
    if (!isHeadAdmin && !isSeller) {
      return res.status(403).json({ success: false, message: "Bu əməliyyat üçün icazəniz yoxdur." });
    }

    const sales = await prisma.ismayilliSale.findMany({
      where: { id: { in: ids } },
      include: { items: true },
    });

    if (sales.length === 0) {
      return res.status(404).json({ success: false, message: "Heç bir satış tapılmadı" });
    }

    await prisma.$transaction(async (tx) => {
      for (const sale of sales) {
        for (const item of sale.items) {
          const product = await tx.ismayilliMagazaProduct.findUnique({
            where: { id: item.productId },
          });
          if (product) {
            const nextQty = parseFloat(product.quantity) + parseFloat(item.quantity);
            const unitPricePurchase = parseFloat(product.unitPricePurchase);
            const unitPriceSale = parseFloat(product.unitPriceSale);
            await tx.ismayilliMagazaProduct.update({
              where: { id: item.productId },
              data: {
                quantity: nextQty,
                totalPurchasePrice: nextQty * unitPricePurchase,
                totalSalePrice: nextQty * unitPriceSale,
              },
            });
          }
        }
      }
      await tx.ismayilliSaleItem.deleteMany({ where: { saleId: { in: ids } } });
      await tx.ismayilliSale.deleteMany({ where: { id: { in: ids } } });
    });

    return res.status(200).json({
      success: true,
      message: `${sales.length} satış silindi və stoklar bərpa olundu`,
      data: { deletedCount: sales.length },
    });
  } catch (error) {
    console.error("bulkDeleteSales error", error);
    return res.status(500).json({ success: false, message: "Satışlar silinərkən xəta baş verdi" });
  }
};
