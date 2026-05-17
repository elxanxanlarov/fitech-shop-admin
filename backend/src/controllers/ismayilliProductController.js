import prisma from "../lib/prisma.js";
import xlsx from "xlsx";

// ==========================================
// === KATEQORİYA CONTROLLER METODLARI ===
// ==========================================

export const getAllCategories = async (req, res) => {
  try {
    const categories = await prisma.ismayilliShopCategory.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { products: true }
        }
      }
    });
    return res.status(200).json({ success: true, data: categories });
  } catch (error) {
    console.error("getAllCategories error", error);
    return res.status(500).json({ success: false, message: "Kateqoriyalar alınarkən xəta baş verdi" });
  }
};

export const createCategory = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: "Kateqoriya adı tələb olunur" });
    }
    const newCategory = await prisma.ismayilliShopCategory.create({
      data: { name: name.trim() }
    });
    return res.status(201).json({ success: true, data: newCategory });
  } catch (error) {
    console.error("createCategory error", error);
    return res.status(500).json({ success: false, message: "Kateqoriya yaradılarkən xəta baş verdi" });
  }
};

export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, isActive } = req.body;
    const updated = await prisma.ismayilliShopCategory.update({
      where: { id },
      data: {
        name: name !== undefined ? name.trim() : undefined,
        isActive: isActive !== undefined ? isActive : undefined
      }
    });
    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    console.error("updateCategory error", error);
    return res.status(500).json({ success: false, message: "Kateqoriya yenilənərkən xəta baş verdi" });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.ismayilliShopCategory.delete({ where: { id } });
    return res.status(200).json({ success: true, message: "Kateqoriya silindi" });
  } catch (error) {
    console.error("deleteCategory error", error);
    return res.status(500).json({ success: false, message: "Kateqoriya silinərkən xəta baş verdi" });
  }
};

// ==========================================
// === MƏHSUL CONTROLLER METODLARI ===
// ==========================================

export const getAllProducts = async (req, res) => {
  try {
    const { categoryId, search } = req.query;
    const where = { deleteType: 'NONE' };
    if (categoryId) {
      where.categoryId = categoryId;
    }
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { barcode: { contains: search } }
      ];
    }
    const products = await prisma.ismayilliMagazaProduct.findMany({
      where,
      include: { category: true },
      orderBy: { createdAt: "desc" }
    });
    return res.status(200).json({ success: true, data: products });
  } catch (error) {
    console.error("getAllProducts error", error);
    return res.status(500).json({ success: false, message: "Məhsullar alınarkən xəta baş verdi" });
  }
};

export const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await prisma.ismayilliMagazaProduct.findUnique({
      where: { id },
      include: { category: true }
    });
    if (!product) {
      return res.status(404).json({ success: false, message: "Məhsul tapılmadı" });
    }
    return res.status(200).json({ success: true, data: product });
  } catch (error) {
    console.error("getProductById error", error);
    return res.status(500).json({ success: false, message: "Məhsul axtarılarkən xəta baş verdi" });
  }
};

export const createProduct = async (req, res) => {
  try {
    const { name, barcode, quantity, unitPricePurchase, unitPriceSale, categoryId, excelId } = req.body;
    if (!name || !categoryId) {
      return res.status(400).json({ success: false, message: "Ad və kateqoriya tələb olunur" });
    }

    const qty = quantity !== undefined ? parseFloat(quantity) : 0;
    const pPrice = unitPricePurchase !== undefined ? parseFloat(unitPricePurchase) : 0;
    const sPrice = unitPriceSale !== undefined ? parseFloat(unitPriceSale) : 0;

    const newProduct = await prisma.ismayilliMagazaProduct.create({
      data: {
        name: name.trim(),
        barcode: barcode ? barcode.trim() : null,
        quantity: qty,
        unitPricePurchase: pPrice,
        unitPriceSale: sPrice,
        totalPurchasePrice: qty * pPrice,
        totalSalePrice: qty * sPrice,
        categoryId,
        excelId: excelId ? parseInt(excelId) : null
      },
      include: { category: true }
    });
    return res.status(201).json({ success: true, data: newProduct });
  } catch (error) {
    console.error("createProduct error", error);
    return res.status(500).json({ success: false, message: "Məhsul yaradılarkən xəta baş verdi" });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, barcode, quantity, unitPricePurchase, unitPriceSale, categoryId, excelId } = req.body;

    const existing = await prisma.ismayilliMagazaProduct.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: "Məhsul tapılmadı" });
    }

    const qty = quantity !== undefined ? parseFloat(quantity) : parseFloat(existing.quantity);
    const pPrice = unitPricePurchase !== undefined ? parseFloat(unitPricePurchase) : parseFloat(existing.unitPricePurchase);
    const sPrice = unitPriceSale !== undefined ? parseFloat(unitPriceSale) : parseFloat(existing.unitPriceSale);

    const updated = await prisma.ismayilliMagazaProduct.update({
      where: { id },
      data: {
        name: name !== undefined ? name.trim() : undefined,
        barcode: barcode !== undefined ? (barcode ? barcode.trim() : null) : undefined,
        quantity: qty,
        unitPricePurchase: pPrice,
        unitPriceSale: sPrice,
        totalPurchasePrice: qty * pPrice,
        totalSalePrice: qty * sPrice,
        categoryId: categoryId !== undefined ? categoryId : undefined,
        excelId: excelId !== undefined ? (excelId ? parseInt(excelId) : null) : undefined
      },
      include: { category: true }
    });

    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    console.error("updateProduct error", error);
    return res.status(500).json({ success: false, message: "Məhsul yenilənərkən xəta baş verdi" });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.ismayilliMagazaProduct.update({
      where: { id },
      data: { deleteType: 'SOFT' }
    });
    return res.status(200).json({ success: true, message: "Məhsul silindi" });
  } catch (error) {
    console.error("deleteProduct error", error);
    return res.status(500).json({ success: false, message: "Məhsul silinərkən xəta baş verdi" });
  }
};

export const bulkDeleteProducts = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: "Silinəcək məhsullar seçilməyib" });
    }

    await prisma.ismayilliMagazaProduct.updateMany({
      where: {
        id: { in: ids }
      },
      data: {
        deleteType: 'SOFT'
      }
    });

    return res.status(200).json({ success: true, message: `${ids.length} məhsul uğurla silindi!` });
  } catch (error) {
    console.error("bulkDeleteProducts error", error);
    return res.status(500).json({ success: false, message: "Məhsullar silinərkən xəta baş verdi" });
  }
};

export const importExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Excel faylı yüklənməyib" });
    }

    const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
    let importedCount = 0;
    let categoryMap = new Map(); // name -> id cache to avoid redundant database calls

    // Helper to search row fields
    const getFieldValue = (row, keys) => {
      // First try exact match
      for (const key of keys) {
        const matchedKey = Object.keys(row).find(k => k.toLowerCase().replace(/\s+/g, '') === key.toLowerCase().replace(/\s+/g, ''));
        if (matchedKey && row[matchedKey] !== undefined && row[matchedKey] !== null) {
          return row[matchedKey];
        }
      }
      // Fallback: try substring match (useful for merged two-row headers like 'Anbar - Miqdar')
      for (const key of keys) {
        const matchedKey = Object.keys(row).find(k => k.toLowerCase().replace(/\s+/g, '').includes(key.toLowerCase().replace(/\s+/g, '')));
        if (matchedKey && row[matchedKey] !== undefined && row[matchedKey] !== null) {
          return row[matchedKey];
        }
      }
      return null;
    };

    // Helper to extract purchase/sale prices with smart unit/total matching
    const getPriceFieldValue = (row, type) => {
      const keys = Object.keys(row);
      
      // Try to find unit price first (containing both price keyword and "ədəd" / "eded" / "ədədinə" / "eden")
      for (const k of keys) {
        const normalized = k.toLowerCase().replace(/\s+/g, '').replace(/"/g, '');
        if (type === 'purchase') {
          if ((normalized.includes('alış') || normalized.includes('alis') || normalized.includes('mədaxil') || normalized.includes('medaxil')) && 
              (normalized.includes('eded') || normalized.includes('ədəd') || normalized.includes('vahid') || normalized.includes('ədədinə') || normalized.includes('eden'))) {
            return row[k];
          }
        } else {
          const isSaleWord = normalized.includes('satış') || normalized.includes('satis');
          const isQiymetWord = (normalized.includes('qiymət') || normalized.includes('qiymet')) && 
                               !(normalized.includes('alış') || normalized.includes('alis') || normalized.includes('mədaxil') || normalized.includes('medaxil'));
          if ((isSaleWord || isQiymetWord) && 
              (normalized.includes('eded') || normalized.includes('ədəd') || normalized.includes('vahid') || normalized.includes('ədədinə') || normalized.includes('eden'))) {
            return row[k];
          }
        }
      }
      
      // Fallback 1: Try to find any price column that is NOT total (does not contain "görə", "gore", "cəmi", "cemi", "toplam", "total")
      for (const k of keys) {
        const normalized = k.toLowerCase().replace(/\s+/g, '').replace(/"/g, '');
        const isTotal = normalized.includes('görə') || normalized.includes('gore') || normalized.includes('cəmi') || normalized.includes('cemi') || normalized.includes('toplam') || normalized.includes('total');
        if (isTotal) continue;
        
        if (type === 'purchase') {
          if (normalized.includes('alış') || normalized.includes('alis') || normalized.includes('purchase') || normalized.includes('mədaxil') || normalized.includes('medaxil')) {
            return row[k];
          }
        } else {
          if (normalized.includes('satış') || normalized.includes('satis') || normalized.includes('sale') || normalized.includes('qiymət') || normalized.includes('qiymet')) {
            return row[k];
          }
        }
      }
      
      // Fallback 2: Try to find using standard keys list
      const standardKeys = type === 'purchase' 
        ? ['alis', 'alış', 'alisqiymeti', 'alışqiyməti', 'purchaseprice', 'purchase', 'alisqiymet', 'alışqiymət', 'mədaxil', 'medaxil']
        : ['satis', 'satış', 'satisqiymeti', 'satışqiyməti', 'saleprice', 'sale', 'satisqiymet', 'satışqiymət', 'qiymet', 'qiymət', 'mədaxilqiyməti'];
        
      for (const key of standardKeys) {
        const matchedKey = keys.find(k => k.toLowerCase().replace(/\s+/g, '').replace(/"/g, '') === key.toLowerCase().replace(/\s+/g, ''));
        if (matchedKey && row[matchedKey] !== undefined && row[matchedKey] !== null) {
          return row[matchedKey];
        }
      }
      
      return null;
    };

    // Helper to clean and parse Azerbaijani decimal values
    const cleanNumber = (val) => {
      if (val === null || val === undefined || val === '') return 0;
      if (typeof val === 'number') return val;
      
      let str = String(val).trim().toUpperCase();
      str = str.replace(/[A-Z\s$₼]/g, ''); // Remove AZN, ₼, $, and spaces
      
      if (str.includes(',') && !str.includes('.')) {
        str = str.replace(',', '.');
      } else if (str.includes(',') && str.includes('.')) {
        if (str.indexOf('.') < str.indexOf(',')) {
          str = str.replace(/\./g, '').replace(',', '.');
        } else {
          str = str.replace(/,/g, '');
        }
      }
      
      const parsed = parseFloat(str);
      return isNaN(parsed) ? 0 : parsed;
    };

    // Helper to find or create category
    const getCategory = async (catName) => {
      const trimmed = catName.trim();
      if (categoryMap.has(trimmed)) {
        return categoryMap.get(trimmed);
      }
      let dbCat = await prisma.ismayilliShopCategory.findUnique({ where: { name: trimmed } });
      if (!dbCat) {
        dbCat = await prisma.ismayilliShopCategory.create({ data: { name: trimmed } });
      }
      categoryMap.set(trimmed, dbCat.id);
      return dbCat.id;
    };

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const rawRows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null });
      
      console.log(`Excel sheet "${sheetName}" has ${rawRows.length} raw rows.`);

      // Let's find which row is the header row
      let headerRowIndex = -1;
      let headers = [];

      const headerKeywords = ['mal', 'ad', 'mehsul', 'məhsul', 'strih', 'strix', 'ştrih', 'barcode', 'barkod', 'kod', 'miqdar', 'alis', 'alış', 'satis', 'satış', 'no', 'sira', 'sıra', 'anbar'];
      let firstHeaderIndex = -1;
      let secondHeaderIndex = -1;

      for (let i = 0; i < rawRows.length; i++) {
        const row = rawRows[i];
        if (!row || !Array.isArray(row)) continue;
        
        // Count how many keywords are matched in this row
        const matchCount = row.filter(cell => {
          if (cell === null || cell === undefined) return false;
          const str = String(cell).toLowerCase().replace(/\s+/g, '');
          return headerKeywords.some(kw => str.includes(kw));
        }).length;

        // If at least 2 headers or 1 strong header matches, we treat it as header row
        if (matchCount >= 2 || (matchCount >= 1 && row.some(cell => {
          if (!cell) return false;
          const str = String(cell).toLowerCase().trim();
          return ['mal', 'ad', 'mehsul', 'məhsul', 'barkod', 'ştrihkod', 'strixkod'].includes(str);
        }))) {
          firstHeaderIndex = i;
          
          // Check if the next row is also part of a two-row header
          if (i + 1 < rawRows.length) {
            const nextRow = rawRows[i + 1];
            const nextMatchCount = nextRow.filter(cell => {
              if (cell === null || cell === undefined) return false;
              const str = String(cell).toLowerCase().replace(/\s+/g, '');
              return ['miqdar', 'alis', 'alış', 'satis', 'satış', 'eded', 'ədəd', 'görə', 'gore'].some(kw => str.includes(kw));
            }).length;
            if (nextMatchCount >= 2) {
              secondHeaderIndex = i + 1;
            }
          }
          break;
        }
      }

      // If no header row was found, default to treating the first non-empty row as header
      if (firstHeaderIndex === -1) {
        for (let i = 0; i < rawRows.length; i++) {
          if (rawRows[i] && rawRows[i].some(c => c !== null && c !== undefined && c !== '')) {
            firstHeaderIndex = i;
            break;
          }
        }
      }

      // If we still have no headers, skip this sheet
      if (firstHeaderIndex === -1) {
        console.log(`Skipping sheet ${sheetName} because no headers were found`);
        continue;
      }

      // Construct headers
      if (secondHeaderIndex !== -1) {
        const row1 = rawRows[firstHeaderIndex];
        const row2 = rawRows[secondHeaderIndex];
        const maxLen = Math.max(row1.length, row2.length);
        
        for (let j = 0; j < maxLen; j++) {
          const val1 = row1[j] !== null && row1[j] !== undefined ? String(row1[j]).trim() : '';
          const val2 = row2[j] !== null && row2[j] !== undefined ? String(row2[j]).trim() : '';
          
          if (val1 && val2) {
            headers.push(`${val1} - ${val2}`);
          } else if (val1) {
            headers.push(val1);
          } else if (val2) {
            headers.push(val2);
          } else {
            headers.push('');
          }
        }
        headerRowIndex = secondHeaderIndex;
      } else {
        headers = rawRows[firstHeaderIndex].map(h => h !== null && h !== undefined ? String(h).trim() : '');
        headerRowIndex = firstHeaderIndex;
      }

      console.log(`Using headers for sheet ${sheetName}:`, headers);

      // Convert rows after the header row into objects
      const rows = [];
      for (let i = headerRowIndex + 1; i < rawRows.length; i++) {
        const rawRow = rawRows[i];
        if (!rawRow || rawRow.every(c => c === null || c === undefined || c === '')) {
          continue; // Skip empty rows
        }
        
        const rowObj = {};
        for (let j = 0; j < headers.length; j++) {
          if (headers[j]) {
            rowObj[headers[j]] = rawRow[j] !== undefined ? rawRow[j] : null;
          }
        }
        rows.push(rowObj);
      }

      console.log(`Parsed ${rows.length} rows for sheet ${sheetName}`);

      // Determine default category for this sheet
      let defaultCatName = "Digər";
      if (!sheetName.toLowerCase().startsWith("sheet")) {
        defaultCatName = sheetName;
      }
      
      let currentCategoryName = defaultCatName;

      for (const row of rows) {
        // 1. Check if it's a category header row (only one string column)
        const rowKeys = Object.keys(row).filter(k => row[k] !== null && row[k] !== undefined && row[k] !== '');
        if (rowKeys.length === 1) {
          const val = row[rowKeys[0]];
          if (typeof val === 'string' && val.length > 2 && isNaN(Number(val))) {
            currentCategoryName = val.trim();
            continue; // Go to next row, since this is just a header row
          }
        }

        // 2. Extract fields
        const nameValRaw = getFieldValue(row, ['mal', 'ad', 'mehsul', 'məhsul', 'name', 'product']);
        if (nameValRaw === null || nameValRaw === undefined) {
          continue; // Skip if no name
        }
        const nameVal = String(nameValRaw).trim();
        if (!nameVal) {
          continue; // Skip if empty name
        }

        // Skip total row (Cəmi)
        const nameValLower = nameVal.toLowerCase();
        if (nameValLower === 'cəmi' || nameValLower === 'cemi' || nameValLower === 'total' || nameValLower.startsWith('cəmi ') || nameValLower.startsWith('cemi ')) {
          console.log(`Skipping total row: "${nameVal}"`);
          continue;
        }

        const excelIdVal = getFieldValue(row, ['no', 'sira', 'sıra', 'id']);
        const barcodeVal = getFieldValue(row, ['ştrixkod', 'ştrihkod', 'strixkod', 'strihkod', 'barcode', 'barkod', 'kod', 'barcod']);
        const qtyVal = getFieldValue(row, ['miqdar', 'miqdari', 'miqdarı', 'eded', 'ədəd', 'quantity', 'qty', 'say', 'sayi', 'sayı', 'count']);
        const pPriceVal = getPriceFieldValue(row, 'purchase');
        const sPriceVal = getPriceFieldValue(row, 'sale');
        const catColumnVal = getFieldValue(row, ['kateqoriya', 'category']);

        const excelId = excelIdVal ? parseInt(excelIdVal) : null;
        
        let barcode = null;
        if (barcodeVal !== null && barcodeVal !== undefined && barcodeVal !== '') {
          barcode = String(barcodeVal).trim();
          if (barcode.includes('e') || barcode.includes('E') || !isNaN(Number(barcode))) {
            const num = Number(barcodeVal);
            if (!isNaN(num)) {
              barcode = num.toLocaleString('fullwide', { useGrouping: false });
            }
          }
        }
        const qty = cleanNumber(qtyVal);
        const purchasePrice = cleanNumber(pPriceVal);
        const salePrice = cleanNumber(sPriceVal);

        // 3. Determine category
        const catName = catColumnVal ? String(catColumnVal).trim() : currentCategoryName;
        const categoryId = await getCategory(catName);

        // 4. Save product (upsert based on barcode if exists, otherwise create)
        let existing = null;
        if (barcode) {
          existing = await prisma.ismayilliMagazaProduct.findUnique({ where: { barcode } });
        }

        if (existing) {
          // Update and restore if soft-deleted
          await prisma.ismayilliMagazaProduct.update({
            where: { id: existing.id },
            data: {
              name: nameVal.trim(),
              quantity: qty,
              unitPricePurchase: purchasePrice,
              unitPriceSale: salePrice,
              totalPurchasePrice: qty * purchasePrice,
              totalSalePrice: qty * salePrice,
              categoryId,
              excelId,
              deleteType: 'NONE' // Restore to active visible state
            }
          });
        } else {
          // Create
          await prisma.ismayilliMagazaProduct.create({
            data: {
              name: nameVal.trim(),
              barcode,
              quantity: qty,
              unitPricePurchase: purchasePrice,
              unitPriceSale: salePrice,
              totalPurchasePrice: qty * purchasePrice,
              totalSalePrice: qty * salePrice,
              categoryId,
              excelId,
              deleteType: 'NONE'
            }
          });
        }
        importedCount++;
      }
    }

    return res.status(200).json({ success: true, message: `${importedCount} məhsul uğurla idxal edildi!` });
  } catch (error) {
    console.error("importExcel error", error);
    return res.status(500).json({ success: false, message: "Excel idxalı zamanı xəta baş verdi" });
  }
};
