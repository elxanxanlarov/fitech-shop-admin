import prisma from "../lib/prisma.js";
import { createActivityLog } from "../controllers/activityLogController.js";

/**
 * Müyyən edilmiş adda filialın mövcudluğunu yoxlayır, yoxdursa yaradır.
 * Əgər silinibsə bərpa edir.
 */
export const ensureBranch = async (name, address = "") => {
    let branch = await prisma.branch.findFirst({
        where: { name }
    });

    if (branch) {
        if (branch.deleteType !== 'NONE') {
            branch = await prisma.branch.update({
                where: { id: branch.id },
                data: { deleteType: 'NONE', isActive: true }
            });
            console.log(`✅ Filial bərpa edildi: ${name}`);
        }
        return branch;
    }

    branch = await prisma.branch.create({
        data: {
            name,
            address,
            isActive: true
        }
    });
    console.log(`✅ Yeni filial yaradıldı: ${name}`);

    // Yeni filial üçün stok qeydlərini yarat
    await createDefaultStocksForBranch(branch.id);

    return branch;
};

/**
 * Filial üçün bütün aktiv məhsullar üzrə 0 stok qeydləri yaradır.
 */
export const createDefaultStocksForBranch = async (branchId) => {
    const products = await prisma.product.findMany({
        where: { deleteType: 'NONE' },
        select: { id: true, stock: true, fullBoxes: true, openedBoxQuantity: true }
    });

    if (products.length > 0) {
        const branchStockData = products.map(product => ({
            branchId,
            productId: product.id,
            stock: product.stock || 0,
            fullBoxes: product.fullBoxes || 0,
            openedBoxQuantity: product.openedBoxQuantity || 0
        }));

        await prisma.branchstock.createMany({
            data: branchStockData,
            skipDuplicates: true
        });
        console.log(`📦 Filial (${branchId}) üçün ${products.length} məhsulun stok qeydi yaradıldı.`);
    }
};

/**
 * Heç bir filialı olmayan (null) işçiləri (Admin/Superadmin xaric) müəyyən filiala təyin edir.
 */
export const migrateStaffToBranch = async (branchId) => {
    const staffToMigrate = await prisma.staff.findMany({
        where: {
            branchId: null,
            isBoss: false,
            role: {
                name: {
                    notIn: ['superadmin', 'admin']
                }
            }
        }
    });

    if (staffToMigrate.length > 0) {
        const staffIds = staffToMigrate.map(s => s.id);
        await prisma.staff.updateMany({
            where: {
                id: { in: staffIds }
            },
            data: {
                branchId: branchId
            }
        });
        console.log(`👥 ${staffToMigrate.length} işçi filiala (${branchId}) köçürüldü.`);
        return staffToMigrate.length;
    }
    return 0;
};
