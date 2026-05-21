import prisma from "../lib/prisma.js";

export const getAllReturns = async (req, res) => {
  try {
    const returns = await prisma.ismayilliSaleReturn.findMany({
      include: {
        sale: true,
        items: {
          include: {
            product: true,
            saleItem: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return res.status(200).json({ success: true, data: returns });
  } catch (error) {
    console.error("ismayilli getAllReturns error", error);
    return res
      .status(500)
      .json({ success: false, message: "Qaytarmalar siyahısı alınarkən xəta baş verdi" });
  }
};

export const getReturnsBySaleId = async (req, res) => {
  try {
    const { saleId } = req.params;
    const returns = await prisma.ismayilliSaleReturn.findMany({
      where: { saleId },
      include: {
        items: {
          include: {
            product: true,
            saleItem: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return res.status(200).json({ success: true, data: returns });
  } catch (error) {
    console.error("ismayilli getReturnsBySaleId error", error);
    return res
      .status(500)
      .json({ success: false, message: "Qaytarmalar alınarkən xəta baş verdi" });
  }
};

export const createReturn = async (req, res) => {
  try {
    const { saleId, items, reason, note } = req.body;

    if (!saleId) {
      return res.status(400).json({ success: false, message: "Satış ID tələb olunur" });
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: "Ən azı bir məhsul seçilməlidir" });
    }

    const result = await prisma.$transaction(async (tx) => {
      const sale = await tx.ismayilliSale.findUnique({
        where: { id: saleId },
        include: {
          items: {
            include: {
              product: true,
              returnItems: true,
            },
          },
        },
      });
      if (!sale) {
        const err = new Error("Satış tapılmadı");
        err.status = 404;
        throw err;
      }

      let totalAmount = 0;
      let returnedAmount = 0;
      const returnItemsToCreate = [];
      const stockUpdates = [];

      for (const item of items) {
        const { saleItemId, quantity } = item;
        const qty = parseFloat(quantity);
        if (!saleItemId || isNaN(qty) || qty <= 0) {
          const err = new Error("Düzgün məhsul və ya miqdar daxil edilməyib");
          err.status = 400;
          throw err;
        }
        const saleItem = sale.items.find((si) => si.id === saleItemId);
        if (!saleItem) {
          const err = new Error(`Satış məhsulu tapılmadı: ${saleItemId}`);
          err.status = 404;
          throw err;
        }
        const alreadyReturned = (saleItem.returnItems || []).reduce(
          (s, ri) => s + parseFloat(ri.quantity || 0),
          0
        );
        const available = parseFloat(saleItem.quantity) - alreadyReturned;
        if (qty > available) {
          const err = new Error(
            `Qaytarma miqdarı çox böyükdür. Mövcud qaytarıla bilən: ${available}`
          );
          err.status = 400;
          throw err;
        }

        const pricePerItem = parseFloat(saleItem.pricePerItem);
        const purchasePrice = parseFloat(saleItem.purchasePrice);
        const totalPrice = qty * pricePerItem;
        const purchaseTotal = qty * purchasePrice;
        const loss = totalPrice - purchaseTotal;

        totalAmount += totalPrice;
        returnedAmount += totalPrice;

        returnItemsToCreate.push({
          saleItemId,
          productId: saleItem.productId,
          quantity: qty,
          pricePerItem,
          totalPrice,
          purchasePrice,
          loss,
        });
        stockUpdates.push({ productId: saleItem.productId, qty });
      }

      const returnRecord = await tx.ismayilliSaleReturn.create({
        data: {
          saleId,
          totalAmount,
          returnedAmount,
          reason: reason?.trim() || null,
          note: note?.trim() || null,
          items: { create: returnItemsToCreate },
        },
        include: {
          sale: true,
          items: {
            include: {
              product: true,
              saleItem: true,
            },
          },
        },
      });

      // Stokları geri qaytar və total qiymətləri yenilə
      for (const { productId, qty } of stockUpdates) {
        const product = await tx.ismayilliMagazaProduct.findUnique({
          where: { id: productId },
        });
        if (!product) continue;
        const newQty = parseFloat(product.quantity) + qty;
        await tx.ismayilliMagazaProduct.update({
          where: { id: productId },
          data: {
            quantity: newQty,
            totalPurchasePrice: newQty * parseFloat(product.unitPricePurchase),
            totalSalePrice: newQty * parseFloat(product.unitPriceSale),
          },
        });
      }

      // Satışı tam qaytarılıb deyə işarələ (əgər qalan qaytarıla bilən yoxdursa)
      const refreshedSale = await tx.ismayilliSale.findUnique({
        where: { id: saleId },
        include: {
          items: {
            include: { returnItems: true },
          },
        },
      });
      const allReturned = refreshedSale.items.every((si) => {
        const ret = (si.returnItems || []).reduce(
          (s, ri) => s + parseFloat(ri.quantity || 0),
          0
        );
        return ret >= parseFloat(si.quantity);
      });
      if (allReturned) {
        await tx.ismayilliSale.update({
          where: { id: saleId },
          data: { isRefunded: true, refundedAt: new Date() },
        });
      }

      return returnRecord;
    });

    return res
      .status(201)
      .json({ success: true, message: "Qaytarma uğurla yaradıldı", data: result });
  } catch (error) {
    console.error("ismayilli createReturn error", error);
    const status = error.status || 500;
    return res
      .status(status)
      .json({ success: false, message: error.message || "Qaytarma yaradılarkən xəta baş verdi" });
  }
};
