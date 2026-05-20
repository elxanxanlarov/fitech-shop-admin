import prisma from "../lib/prisma.js";
import { createActivityLog } from "./activityLogController.js";
import { getStoreFilter } from "../utils/storeHelper.js";
export const getAllBranchStocks = async (req, res) => {
    try {
        const storeFilter = getStoreFilter(req);
        const stocks = await prisma.branchstock.findMany({
            include: {
                branch: {
                    select: { id: true, name: true, isActive: true }
                },
                product: {
                    select: { id: true, name: true, barcode: true, unitType: true, piecesPerBox: true }
                }
            },
            where: {
                branch: { deleteType: 'NONE' },
                stock: { gt: 0 },
                ...storeFilter
            }
        });

        // Məhsul ID-sinə görə qruplaşdır
        const grouped = {};
        for (const s of stocks) {
            const pid = s.productId;
            if (!grouped[pid]) grouped[pid] = [];
            grouped[pid].push({
                branchId: s.branchId,
                branchName: s.branch.name,
                branchActive: s.branch.isActive,
                stock: s.stock,
                fullBoxes: s.fullBoxes,
                openedBoxQuantity: s.openedBoxQuantity
            });
        }

        return res.status(200).json({ success: true, data: grouped });
    } catch (error) {
        console.error("getAllBranchStocks error", error);
        return res.status(500).json({ success: false, message: "Branch stokları alınarkən xəta baş verdi", error: error.message });
    }
};

// Bütün filialları gətir
export const getAllBranches = async (req, res) => {
    try {
        const branches = await prisma.branch.findMany({
            where: {
                deleteType: 'NONE'
            },
            include: {
                _count: {
                    select: { stocks: true }
                }
            },
            orderBy: {
                name: 'asc'
            }
        });

        return res.status(200).json({
            success: true,
            data: branches
        });
    } catch (error) {
        console.error("getAllBranches error", error);
        return res.status(500).json({
            success: false,
            message: "Filiallar alınarkən xəta baş verdi",
            error: error.message
        });
    }
};

// Filialı ID ilə gətir
export const getBranchById = async (req, res) => {
    try {
        const { id } = req.params;
        const branch = await prisma.branch.findUnique({
            where: { id }
        });

        if (!branch) {
            return res.status(404).json({
                success: false,
                message: "Filial tapılmadı"
            });
        }

        return res.status(200).json({
            success: true,
            data: branch
        });
    } catch (error) {
        console.error("getBranchById error", error);
        return res.status(500).json({
            success: false,
            message: "Filial məlumatı alınarkən xəta baş verdi",
            error: error.message
        });
    }
};

// Yeni filial yarat
export const createBranch = async (req, res) => {
    try {
        const { name, address, phone, showPurchasePrice, isShowIsmayilli, isShowDiscountPrice } = req.body;

        if (!name) {
            return res.status(400).json({
                success: false,
                message: "Filial adı tələb olunur"
            });
        }

        const existing = await prisma.branch.findFirst({
            where: { name }
        });

        if (existing) {
            return res.status(400).json({
                success: false,
                message: "Bu adda filial artıq mövcuddur"
            });
        }

        const branch = await prisma.branch.create({
            data: {
                name,
                address,
                phone,
                showPurchasePrice: showPurchasePrice !== undefined ? showPurchasePrice : true,
                isShowIsmayilli: isShowIsmayilli !== undefined ? isShowIsmayilli : false,
                isShowDiscountPrice: isShowDiscountPrice !== undefined ? isShowDiscountPrice : true
            }
        });

        // Yeni filial boş stokla yaradılır - məhsullar ayrıca əlavə ediləcək

        await createActivityLog({
            staffId: req.staff?.id,
            entityType: 'Branch',
            entityId: branch.id,
            action: 'CREATE',
            description: `Yeni filial yaradıldı: ${name}`
        });

        return res.status(201).json({
            success: true,
            data: branch
        });
    } catch (error) {
        console.error("createBranch error", error);
        return res.status(500).json({
            success: false,
            message: "Filial yaradılarkən xəta baş verdi",
            error: error.message
        });
    }
};

// Filialı yenilə
export const updateBranch = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, address, phone, isActive, showPurchasePrice, isShowIsmayilli, isShowDiscountPrice } = req.body;

        const branch = await prisma.branch.findUnique({
            where: { id }
        });

        if (!branch) {
            return res.status(404).json({
                success: false,
                message: "Filial tapılmadı"
            });
        }

        const updated = await prisma.branch.update({
            where: { id },
            data: {
                name: name || branch.name,
                address: address !== undefined ? address : branch.address,
                phone: phone !== undefined ? phone : branch.phone,
                isActive: isActive !== undefined ? isActive : branch.isActive,
                showPurchasePrice: showPurchasePrice !== undefined ? showPurchasePrice : branch.showPurchasePrice,
                isShowIsmayilli: isShowIsmayilli !== undefined ? isShowIsmayilli : branch.isShowIsmayilli,
                isShowDiscountPrice: isShowDiscountPrice !== undefined ? isShowDiscountPrice : branch.isShowDiscountPrice
            }
        });

        await createActivityLog({
            staffId: req.staff?.id,
            entityType: 'Branch',
            entityId: id,
            action: 'UPDATE',
            description: `Filial məlumatları yeniləndi: ${updated.name}`
        });

        return res.status(200).json({
            success: true,
            data: updated
        });
    } catch (error) {
        console.error("updateBranch error", error);
        return res.status(500).json({
            success: false,
            message: "Filial yenilənərkən xəta baş verdi",
            error: error.message
        });
    }
};

// Filialın stoklarını gətir
export const getBranchStocks = async (req, res) => {
    try {
        const { id } = req.params;
        const storeFilter = getStoreFilter(req);
        const stocks = await prisma.branchstock.findMany({
            where: {
                branchId: id,
                stock: { gt: 0 },   // yalnız stoku > 0 olan məhsulları qaytart
                ...storeFilter
            },
            include: {
                product: {
                    select: {
                        id: true,
                        name: true,
                        barcode: true,
                        unitType: true,
                        piecesPerBox: true,
                        category: {
                            select: { id: true, name: true }
                        }
                    }
                }
            }
        });

        return res.status(200).json({
            success: true,
            data: stocks
        });
    } catch (error) {
        console.error("getBranchStocks error", error);
        return res.status(500).json({
            success: false,
            message: "Filial stokları alınarkən xəta baş verdi",
            error: error.message
        });
    }
};
// Filialı mərkəz bazası ilə sinxronizasiya et (bütün məhsulları bura yüklə)
export const syncBranchWithCentral = async (req, res) => {
    try {
        const { id } = req.params;
        const staffId = req.staffId;

        // İcarə yoxlanışı - yalnız Superadmin edə bilər
        const staff = await prisma.staff.findUnique({
            where: { id: staffId },
            include: { role: true }
        });

        if (!staff || staff.role?.name?.toUpperCase() !== 'SUPERADMIN') {
            return res.status(403).json({
                success: false,
                message: "Bu əməliyyat üçün icazəniz yoxdur. Yalnız Superadmin sinxronizasiya edə bilər."
            });
        }

        // Filialı yoxla
        const branch = await prisma.branch.findUnique({
            where: { id }
        });

        if (!branch) {
            return res.status(404).json({
                success: false,
                message: "Filial tapılmadı"
            });
        }

        // Bütün aktiv məhsulları gətir
        const products = await prisma.product.findMany({
            where: {
                deleteType: 'NONE'
            }
        });

        console.log(`Sinxronizasiya başlayır: ${branch.name}, ${products.length} məhsul`);

        // Hər bir məhsulu branchStock-a əlavə et və ya yenilə
        // QEYD: Böyük bazalarda bu batch şəklində edilməlidir, amma indiki halda 14-50 məhsul üçün normaldır
        let syncedCount = 0;
        
        for (const product of products) {
            const existingBs = await prisma.branchstock.findFirst({
                where: { branchId: id, productId: product.id }
            });
            if (existingBs) {
                await prisma.branchstock.update({
                    where: { id: existingBs.id },
                    data: {
                        stock: product.stock,
                        fullBoxes: product.fullBoxes,
                        openedBoxQuantity: product.openedBoxQuantity
                    }
                });
            } else {
                await prisma.branchstock.create({
                    data: {
                        branchId: id,
                        productId: product.id,
                        stock: product.stock,
                        fullBoxes: product.fullBoxes,
                        openedBoxQuantity: product.openedBoxQuantity
                    }
                });
            }
            syncedCount++;
        }

        await createActivityLog({
            staffId: req.staff?.id,
            entityType: 'Branch',
            entityId: id,
            action: 'UPDATE',
            description: `Filial mərkəz bazası ilə sinxronizasiya edildi: ${branch.name}. ${syncedCount} məhsul yeniləndi.`
        });

        return res.status(200).json({
            success: true,
            message: `${syncedCount} məhsul uğurla sinxronizasiya edildi`,
            syncedCount
        });
    } catch (error) {
        console.error("syncBranchWithCentral error", error);
        return res.status(500).json({
            success: false,
            message: "Sinxronizasiya zamanı xəta baş verdi",
            error: error.message
        });
    }
};


// Filialı sil (Soft delete)
export const deleteBranch = async (req, res) => {
    try {
        const { id } = req.params;

        const branch = await prisma.branch.findUnique({
            where: { id }
        });

        if (!branch) {
            return res.status(404).json({
                success: false,
                message: "Filial tapılmadı"
            });
        }

        // Mərkəzi anbarı silmək olmaz (əgər belə bir məntiq varsa)
        if (branch.name === 'Mərkəzi Anbar') {
            return res.status(400).json({
                success: false,
                message: "Mərkəzi anbarı silmək olmaz"
            });
        }

        await prisma.branch.update({
            where: { id },
            data: {
                deleteType: 'HARD', // Və ya 'SOFT' - sistemin qalan hissəsinə uyğun
                isActive: false
            }
        });

        await createActivityLog({
            staffId: req.staff?.id,
            entityType: 'Branch',
            entityId: id,
            action: 'DELETE',
            description: `Filial silindi: ${branch.name}`
        });

        return res.status(200).json({
            success: true,
            message: "Filial uğurla silindi"
        });
    } catch (error) {
        console.error("deleteBranch error", error);
        return res.status(500).json({
            success: false,
            message: "Filial silinərkən xəta baş verdi",
            error: error.message
        });
    }
};
