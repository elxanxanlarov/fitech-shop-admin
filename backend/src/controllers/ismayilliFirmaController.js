import prisma from "../lib/prisma.js";
import xlsx from "xlsx";

/**
 * İsmayıllı — Firma (B2B partnyor) idarəetməsi.
 * Hər firma üzrə "borc artırma" və "ödəniş" transaksiyaları saxlanılır;
 * totalDebt / paidDebt sahələri transaksiyalarla sinxron yenilənir.
 */

const NOT_DELETED = { deleteType: "NONE" };

export const getAllFirmas = async (req, res) => {
  try {
    const firmas = await prisma.ismayilliFirma.findMany({
      where: NOT_DELETED,
      orderBy: { createdAt: "desc" },
      include: {
        transactions: { orderBy: { createdAt: "desc" }, take: 1 },
        _count: {
          select: {
            transactions: true,
            products: { where: { deleteType: "NONE" } },
          },
        },
      },
    });
    return res.status(200).json({ success: true, data: firmas });
  } catch (error) {
    console.error("getAllFirmas error", error);
    return res.status(500).json({ success: false, message: "Firmalar alınarkən xəta baş verdi" });
  }
};

export const getFirmaById = async (req, res) => {
  try {
    const { id } = req.params;
    const firma = await prisma.ismayilliFirma.findUnique({
      where: { id },
      include: {
        transactions: { orderBy: { createdAt: "desc" } },
        products: {
          where: { deleteType: "NONE" },
          orderBy: { name: "asc" },
          include: { category: { select: { id: true, name: true } } },
        },
      },
    });
    if (!firma) {
      return res.status(404).json({ success: false, message: "Firma tapılmadı" });
    }
    return res.status(200).json({ success: true, data: firma });
  } catch (error) {
    console.error("getFirmaById error", error);
    return res.status(500).json({ success: false, message: "Firma alınarkən xəta baş verdi" });
  }
};

export const createFirma = async (req, res) => {
  try {
    const { name, phone, note, initialDebt } = req.body;
    if (!name || !String(name).trim()) {
      return res.status(400).json({ success: false, message: "Firma adı tələb olunur" });
    }

    const trimmedName = String(name).trim();
    const debt = initialDebt !== undefined && initialDebt !== null && String(initialDebt).trim() !== ""
      ? parseFloat(String(initialDebt).replace(",", "."))
      : 0;
    const initial = Number.isFinite(debt) && debt > 0 ? debt : 0;

    // Eyni adlı firma varsa restore et və ya yeni xəta qaytar
    const existing = await prisma.ismayilliFirma.findUnique({ where: { name: trimmedName } });
    if (existing) {
      if (existing.deleteType !== "NONE") {
        const restored = await prisma.ismayilliFirma.update({
          where: { id: existing.id },
          data: { deleteType: "NONE", phone: phone || existing.phone, note: note || existing.note },
        });
        return res.status(200).json({ success: true, message: "Firma bərpa edildi", data: restored });
      }
      return res.status(400).json({ success: false, message: "Bu adda firma artıq mövcuddur" });
    }

    const created = await prisma.$transaction(async (tx) => {
      const firma = await tx.ismayilliFirma.create({
        data: {
          name: trimmedName,
          phone: phone ? String(phone).trim() : null,
          note: note ? String(note).trim() : null,
          totalDebt: initial,
          paidDebt: 0,
        },
      });

      if (initial > 0) {
        await tx.ismayilliFirmaTransaction.create({
          data: {
            firmaId: firma.id,
            type: "DEBT",
            amount: initial,
            note: "İlkin borc",
          },
        });
      }

      return firma;
    });

    return res.status(201).json({ success: true, data: created });
  } catch (error) {
    console.error("createFirma error", error);
    return res.status(500).json({ success: false, message: "Firma yaradılarkən xəta baş verdi" });
  }
};

export const updateFirma = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, note } = req.body;

    const existing = await prisma.ismayilliFirma.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: "Firma tapılmadı" });
    }

    const data = {};
    if (name !== undefined) data.name = String(name).trim();
    if (phone !== undefined) data.phone = phone ? String(phone).trim() : null;
    if (note !== undefined) data.note = note ? String(note).trim() : null;

    const updated = await prisma.ismayilliFirma.update({ where: { id }, data });
    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    console.error("updateFirma error", error);
    return res.status(500).json({ success: false, message: "Firma yenilənərkən xəta baş verdi" });
  }
};

export const deleteFirma = async (req, res) => {
  try {
    const { id } = req.params;
    const { hard } = req.query;

    const existing = await prisma.ismayilliFirma.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: "Firma tapılmadı" });
    }

    if (hard === "true") {
      await prisma.ismayilliFirma.delete({ where: { id } });
      return res.status(200).json({ success: true, message: "Firma tamamilə silindi" });
    }

    await prisma.ismayilliFirma.update({
      where: { id },
      data: { deleteType: "SOFT" },
    });
    return res.status(200).json({ success: true, message: "Firma silindi" });
  } catch (error) {
    console.error("deleteFirma error", error);
    return res.status(500).json({ success: false, message: "Firma silinərkən xəta baş verdi" });
  }
};

/**
 * POST /ismayilli/firma/:id/transaction
 * body: { type: 'DEBT' | 'PAYMENT', amount: number, note?: string }
 */
export const addTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, amount, note } = req.body;

    const t = String(type || "").toUpperCase();
    if (t !== "DEBT" && t !== "PAYMENT") {
      return res.status(400).json({ success: false, message: "Tip 'DEBT' və ya 'PAYMENT' olmalıdır" });
    }
    const amt = parseFloat(String(amount).replace(",", "."));
    if (!Number.isFinite(amt) || amt <= 0) {
      return res.status(400).json({ success: false, message: "Məbləğ müsbət ədəd olmalıdır" });
    }

    const firma = await prisma.ismayilliFirma.findUnique({ where: { id } });
    if (!firma) {
      return res.status(404).json({ success: false, message: "Firma tapılmadı" });
    }

    const result = await prisma.$transaction(async (tx) => {
      const trans = await tx.ismayilliFirmaTransaction.create({
        data: {
          firmaId: id,
          type: t,
          amount: amt,
          note: note ? String(note).trim() : null,
        },
      });

      const newTotalDebt = t === "DEBT" ? parseFloat(firma.totalDebt) + amt : parseFloat(firma.totalDebt);
      const newPaidDebt = t === "PAYMENT" ? parseFloat(firma.paidDebt) + amt : parseFloat(firma.paidDebt);

      const updated = await tx.ismayilliFirma.update({
        where: { id },
        data: {
          totalDebt: newTotalDebt,
          paidDebt: newPaidDebt,
        },
      });

      return { transaction: trans, firma: updated };
    });

    return res.status(201).json({ success: true, data: result });
  } catch (error) {
    console.error("addTransaction error", error);
    return res.status(500).json({ success: false, message: "Əməliyyat yaradılarkən xəta baş verdi" });
  }
};

/**
 * DELETE /ismayilli/firma/:firmaId/transaction/:transactionId
 * Tək bir əməliyyatı silir və firma cəmlərini yenidən hesablayır.
 */
export const deleteTransaction = async (req, res) => {
  try {
    const { firmaId, transactionId } = req.params;

    const trans = await prisma.ismayilliFirmaTransaction.findUnique({
      where: { id: transactionId },
    });
    if (!trans || trans.firmaId !== firmaId) {
      return res.status(404).json({ success: false, message: "Əməliyyat tapılmadı" });
    }

    await prisma.$transaction(async (tx) => {
      await tx.ismayilliFirmaTransaction.delete({ where: { id: transactionId } });

      // Cəmləri sıfırdan hesabla
      const aggregates = await tx.ismayilliFirmaTransaction.findMany({
        where: { firmaId },
        select: { type: true, amount: true },
      });
      let totalDebt = 0;
      let paidDebt = 0;
      for (const t of aggregates) {
        if (t.type === "DEBT") totalDebt += parseFloat(t.amount);
        else if (t.type === "PAYMENT") paidDebt += parseFloat(t.amount);
      }

      await tx.ismayilliFirma.update({
        where: { id: firmaId },
        data: { totalDebt, paidDebt },
      });
    });

    return res.status(200).json({ success: true, message: "Əməliyyat silindi və balans yeniləndi" });
  } catch (error) {
    console.error("deleteTransaction error", error);
    return res.status(500).json({ success: false, message: "Əməliyyat silinərkən xəta baş verdi" });
  }
};

/**
 * POST /ismayilli/firma/import-products-excel
 * Excel-dən yalnız iki sütun oxuyur: firma adı və ştrixkod.
 *
 * Hər sətr üçün:
 *   1. Firma DB-də varsa istifadə edir, yoxdursa avtomatik yaradır.
 *   2. Barkoda görə mövcud məhsulu tapır və onun `firmaId`-ni yenilədir.
 *   3. Tapılmayan barkodları ayrıca siyahıda qaytarır.
 *
 * Excel başlıq sütunları (case-insensitive, hər hansı dildə):
 *   "firma" / "firması" / "kontragent" / "firma adı" / "firma_name"
 *   "ştrixkod" / "ştrihkod" / "strixkod" / "barkod" / "barcode" / "kod"
 */
export const importFirmaProductsExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Excel faylı yüklənmədi" });
    }

    const wb = xlsx.read(req.file.buffer, { type: "buffer" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rawRows = xlsx.utils.sheet_to_json(sheet, {
      header: 1,
      defval: null,
      raw: false,
    });

    if (!rawRows || rawRows.length === 0) {
      return res.status(400).json({ success: false, message: "Excel faylı boşdur" });
    }

    // ===== Header sütunlarını avtomatik tap =====
    // Boş sətirləri keç. Ən çox dolu hücrəsi olan, və açar sözləri ehtiva edən
    // ilk sətri başlıq sayırıq.
    const norm = (s) =>
      String(s ?? "")
        .toLowerCase()
        .trim()
        .replace(/[\s\-_/"«»]+/g, "")
        .replace(/№/g, "no");

    const firmaKeys = ["firma", "firması", "firmasi", "kontragent", "firmaadı", "firmaadi", "firmaname", "kontragentadı"];
    const barcodeKeys = ["ştrixkod", "ştrihkod", "strixkod", "strihkod", "barcode", "barkod", "kod", "ştrikod", "strikod"];

    let firmaCol = -1;
    let barcodeCol = -1;
    let headerRowIndex = -1;

    // Header detect: ilk 15 sətrdə açar sözlü hücrə axtar
    const maxScan = Math.min(15, rawRows.length);
    for (let i = 0; i < maxScan; i++) {
      const row = rawRows[i];
      if (!row) continue;
      const matchedFirma = row.findIndex((c) => c && firmaKeys.includes(norm(c)));
      const matchedBarcode = row.findIndex((c) => c && barcodeKeys.includes(norm(c)));
      if (matchedFirma !== -1 && matchedBarcode !== -1) {
        firmaCol = matchedFirma;
        barcodeCol = matchedBarcode;
        headerRowIndex = i;
        break;
      }
    }

    // Fallback: heç bir sətir tapılmasa, qonşu hücrələri yoxla — ən az birini tapsa qalanı default
    if (firmaCol === -1 || barcodeCol === -1) {
      for (let i = 0; i < maxScan; i++) {
        const row = rawRows[i];
        if (!row) continue;
        if (firmaCol === -1) {
          const m = row.findIndex((c) => c && firmaKeys.includes(norm(c)));
          if (m !== -1) {
            firmaCol = m;
            headerRowIndex = headerRowIndex === -1 ? i : headerRowIndex;
          }
        }
        if (barcodeCol === -1) {
          const m = row.findIndex((c) => c && barcodeKeys.includes(norm(c)));
          if (m !== -1) {
            barcodeCol = m;
            headerRowIndex = headerRowIndex === -1 ? i : headerRowIndex;
          }
        }
      }
    }

    if (firmaCol === -1 || barcodeCol === -1) {
      return res.status(400).json({
        success: false,
        message: "Excel-də 'firması' və 'Ştrixkod' sütunları tapılmadı",
        debug: { headerRowIndex, scannedFirstRows: rawRows.slice(0, 5) },
      });
    }

    // ===== Mövcud firmalar map =====
    const allFirmas = await prisma.ismayilliFirma.findMany({
      where: { deleteType: "NONE" },
      select: { id: true, name: true },
    });
    const firmasByName = new Map(allFirmas.map((f) => [f.name.trim().toLowerCase(), f]));

    const linked = [];
    const created = [];
    const notFound = [];
    const skipped = [];
    const firmasCreated = [];
    let currentFirmaName = null; // "current category"-də olduğu kimi, üst-üstə düşmüş sətirlər üçün davam etdir

    // İşləməyə başlanğıc sətri: əgər header_row tapıldısa, ondan sonra; yoxsa 0
    const start = headerRowIndex >= 0 ? headerRowIndex + 1 : 0;

    for (let i = start; i < rawRows.length; i++) {
      const row = rawRows[i];
      if (!row) continue;

      const rawFirma = row[firmaCol] ? String(row[firmaCol]).trim() : "";
      const rawBarcode = row[barcodeCol] ? String(row[barcodeCol]).trim() : "";

      // Bəzi Excel-lərdə firma adı yalnız ilk məhsul sətrində yazılır (merged cells),
      // sonra eyni firmanın daha çox məhsulu üçün boş qalır.
      if (rawFirma) currentFirmaName = rawFirma;

      if (!rawBarcode) {
        if (!rawFirma && !currentFirmaName) continue; // tamamilə boş sətir
        skipped.push({ row: i + 1, reason: "Barkod yoxdur", firma: rawFirma || currentFirmaName });
        continue;
      }

      // Barkodu temizlə (rəqəm-rəqəm formatda olduğunu yoxla)
      const cleanBarcode = rawBarcode.replace(/[^\d]/g, "");
      if (!cleanBarcode || cleanBarcode.length < 6) {
        skipped.push({ row: i + 1, reason: "Səhv barkod formatı", firma: currentFirmaName, barcode: rawBarcode });
        continue;
      }

      const firmaName = currentFirmaName;
      if (!firmaName) {
        skipped.push({ row: i + 1, reason: "Firma adı yoxdur (heç bir əvvəlki sətirdə də)", barcode: cleanBarcode });
        continue;
      }

      // Firmanı tap və ya yarat
      let firma = firmasByName.get(firmaName.toLowerCase());
      if (!firma) {
        try {
          const newF = await prisma.ismayilliFirma.create({
            data: { name: firmaName, totalDebt: 0, paidDebt: 0 },
          });
          firma = newF;
          firmasByName.set(firmaName.toLowerCase(), newF);
          firmasCreated.push({ id: newF.id, name: newF.name });
        } catch (err) {
          // unique race condition — yenidən oxu
          const refetched = await prisma.ismayilliFirma.findUnique({ where: { name: firmaName } });
          if (refetched) {
            firma = refetched;
            firmasByName.set(firmaName.toLowerCase(), refetched);
          } else {
            skipped.push({ row: i + 1, reason: `Firma yaradıla bilmədi: ${err.message}`, firma: firmaName, barcode: cleanBarcode });
            continue;
          }
        }
      }

      // Məhsulu tap və firmaya bağla
      const product = await prisma.ismayilliMagazaProduct.findUnique({
        where: { barcode: cleanBarcode },
      });
      if (!product) {
        notFound.push({ row: i + 1, firma: firmaName, barcode: cleanBarcode });
        continue;
      }

      const wasNotLinked = !product.firmaId;
      const wasLinkedDifferent = product.firmaId && product.firmaId !== firma.id;

      await prisma.ismayilliMagazaProduct.update({
        where: { id: product.id },
        data: { firmaId: firma.id },
      });

      const entry = {
        row: i + 1,
        productId: product.id,
        productName: product.name,
        barcode: cleanBarcode,
        firmaId: firma.id,
        firmaName: firma.name,
        status: wasNotLinked ? "linked" : wasLinkedDifferent ? "reassigned" : "unchanged",
      };
      if (wasNotLinked || wasLinkedDifferent) linked.push(entry);
      else created.push(entry);
    }

    return res.status(200).json({
      success: true,
      message: `${linked.length} məhsul bağlandı, ${firmasCreated.length} yeni firma yaradıldı`,
      data: {
        linkedCount: linked.length,
        unchangedCount: created.length,
        notFoundCount: notFound.length,
        skippedCount: skipped.length,
        firmasCreatedCount: firmasCreated.length,
        firmasCreated,
        linked,
        notFound: notFound.slice(0, 50), // çoxdursa ilk 50
        skipped: skipped.slice(0, 50),
        totalNotFound: notFound.length,
        totalSkipped: skipped.length,
        detected: { firmaCol, barcodeCol, headerRowIndex },
      },
    });
  } catch (error) {
    console.error("importFirmaProductsExcel error", error);
    return res.status(500).json({ success: false, message: error.message || "Excel idxalı zamanı xəta baş verdi" });
  }
};
