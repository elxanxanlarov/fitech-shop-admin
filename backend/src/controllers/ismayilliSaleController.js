import prisma from "../lib/prisma.js";

export const getAllSales = async (req, res) => {
  try {
    const sales = await prisma.ismayilliSale.findMany({
      include: {
        items: {
          include: {
            product: true
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
            product: true
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

    if (!isHeadAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: "Bu əməliyyat üçün icazəniz yoxdur. Yalnız Baş Admin satış tarixçəsini silə bilər." 
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

    if (!isHeadAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: "Bu əməliyyat üçün icazəniz yoxdur. Yalnız Baş Admin bütün satış tarixçəsini silə bilər." 
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
