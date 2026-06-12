import xlsx from 'xlsx';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const parseExcelForPreview = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: "Xahiş olunur fayl seçin." });
        }

        // Excel faylını buffer-dən oxuyuruq
        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // 2D Array formasında datanı götürürük
        const rawRows = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

        const cleanedProducts = [];
        let currentCompany = "Təyin edilməmiş";

        // Bazadakı kateqoriyaları və firmaları öncədən çəkirik ki, adları qarşılaşdıra bilək
        const categories = await prisma.ismayilliShopCategory.findMany({ select: { id: true, name: true } });
        
        // Şəkillərdəki formata uyğun sətirlərin oxunması (B, C, D sütunları)
        for (let i = 0; i < rawRows.length; i++) {
            const row = rawRows[i];
            if (!row || row.length === 0) continue;

            const colB = row[1] ? row[1].toString().trim() : ""; // Firma və ya Kateqoriya
            const colC = row[2] ? row[2].toString().trim() : ""; // Məhsul adı
            const colD = row[3] ? row[3].toString().trim() : ""; // Ştrixkod

            // Başlıq və lazımsız "Cəmi/Anbar" sətirlərini keçirik
            if (colC === "Cəmi" || colC === "Anbar" || colB === "firmasi/kateqoriyasi") {
                continue;
            }

            // QAYDA: Əgər D sütununda ŞTRİXKOD VARSA -> Bu real məhsuldur
            if (colD && colD.match(/^\d+$/)) {
                
                // Əgər B sütununda yeni firma adı yazılıbsa, cari firmanı yeniləyirik
                if (colB && colB !== "GEYİM" && colB !== "GEYIM" && colB !== "ƏTİR" && colB !== "XIRDAVAT") {
                    currentCompany = colB;
                }

                // Sütun indekslərinə əsasən qiymət və stok (L, N, O sütunları)
                const stock = row[11] ? parseFloat(row[11]) : 0;          // L sütunu: Son qalıq miqdar
                const purchasePrice = row[13] ? parseFloat(row[13]) : 0;  // N sütunu: 1 ədəd üçün Alış qiyməti
                const salePrice = row[14] ? parseFloat(row[14]) : 0;      // O sütunu: 1 ədəd üçün Satış qiyməti

                // Fayldakı kateqoriya adını tapmağa çalışırıq (məsələn, əgər yuxarı sətirlərdə qeyd olunubsa)
                // Hələlik dinamik olaraq ilkin kateqoriyanı bağlayırıq, yoxdursa "Ümumi" yazırıq
                const matchedCategory = categories.find(c => c.name.toLowerCase() === colB.toLowerCase());

                cleanedProducts.push({
                    barcode: colD,
                    product_name: colC,
                    company_name: currentCompany,
                    category_name: matchedCategory ? matchedCategory.name : "İsmayıllı Mağaza",
                    stock_quantity: stock,
                    single_purchase_price: purchasePrice, // 1 ədədinin Alış qiyməti
                    single_sale_price: salePrice,         // 1 ədədinin Satış qiyməti
                    total_purchase_amount: +(stock * purchasePrice).toFixed(2), // Ümumi Alış Dəyəri
                    total_sale_amount: +(stock * salePrice).toFixed(2)          // Ümumi Satış Dəyəri
                });
                continue;
            }

            // Ştrixkod yoxdursa amma B sütununda Firma keçidi varsa (məsələn baş sətirlər)
            if (colB && !colD) {
                if (colB !== "GEYİM" && colB !== "GEYIM" && colB !== "ƏTİR" && colB !== "XIRDAVAT") {
                    currentCompany = colB; 
                }
            }
        }

        // JSON formatında birbaşa Front-end-ə göndəririk
        return res.status(200).json({
            success: true,
            message: "Excel uğurla oxundu və cədvəl üçün hazırlandı!",
            total_count: cleanedProducts.length,
            data: cleanedProducts
        });

    } catch (error) {
        console.error("Excel parse error:", error);
        return res.status(500).json({ success: false, message: "Fayl oxunarkən xəta baş verdi." });
    }
};