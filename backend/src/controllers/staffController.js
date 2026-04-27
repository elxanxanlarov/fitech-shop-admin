import prisma from "../lib/prisma.js";
import bcrypt from "bcryptjs";
import { createActivityLog } from "./activityLogController.js";
import { migrateStaffToBranch, ensureBranch } from "../utils/branchHelper.js";

/** Superadmin və baş admin (admin + isBoss) heç vaxt filiala bağlı olmamalıdır */
const privilegedNoBranchWhere = {
    OR: [
        { role: { name: "superadmin" } },
        { AND: [{ role: { name: "admin" } }, { isBoss: true }] },
    ],
};

async function stripBranchFromPrivilegedStaff() {
    await prisma.staff.updateMany({
        where: {
            branchId: { not: null },
            ...privilegedNoBranchWhere,
        },
        data: { branchId: null },
    });
}

function isPrivilegedStaff(roleName, isBoss) {
    const rn = (roleName || "").toLowerCase();
    return rn === "superadmin" || (rn === "admin" && isBoss);
}

/** Superadmin və Baş Admin başqa filial təyin edə bilər; filial admin / reception yalnız öz filialı */
function requesterCanPickAnyBranch(requester) {
    const r = requester?.role?.name?.toLowerCase();
    return r === "superadmin" || (r === "admin" && requester?.isBoss === true);
}

export const getAllStaff = async (req, res) => {
    try {
      const { branchId } = req.query;
      const where = {};

      // Filiallar artıq avtomatik sığortalanmır və işçilər köçürülmür.

      await stripBranchFromPrivilegedStaff();

      const requester = await prisma.staff.findUnique({
          where: { id: req.staffId },
          include: { role: true },
      });

      const canSeeAll = requesterCanPickAnyBranch(requester);

      if (!canSeeAll) {
          // Admin deyilsə, yalnız öz filialını və imtiyazlı istifadəçiləri görür
          const effectiveBranchId = requester?.branchId;
          if (effectiveBranchId) {
              where.OR = [
                  { branchId: effectiveBranchId },
                  ...privilegedNoBranchWhere.OR,
              ];
          }
      } else {
          // Superadmin/Head Admin üçün bütün işçiləri qaytar (filial filtrini görməzliyi gəl)
          // Bu, komandanı tam görməyə imkan verir
      }

      const staffList = await prisma.staff.findMany({
        where,
        include: {
          role: true,
          branch: true,
        },
        orderBy: {
          createdAt: 'desc',
        }
      });

      return res.status(200).json({
        success: true,
        date: staffList,
      });
    } catch (error) {
        console.error("getAllStaff error", error);
        return res.status(500).json({
            success: false,
            message: "Staff siyahısı alınarkən xəta baş verdi"
        })
    }
}

export const getStaffById = async (req, res) => {
    try {
        const { id } = req.params;
        const staff = await prisma.staff.findUnique({
          where: { id },
          include: {
            role: true,
            branch: true,
          },
        });

        if (!staff) {
            return res.status(404).json({
                success: false,
                messagge: "Staff tapılmadı",
            });
        }

        const requester = await prisma.staff.findUnique({
            where: { id: req.staffId },
            include: { role: true },
        });
        const requesterRole = requester?.role?.name?.toLowerCase();
        const viewingOther = staff.id !== req.staffId;
        if (
            viewingOther &&
            isPrivilegedStaff(staff.role?.name, staff.isBoss) &&
            requesterRole !== "superadmin"
        ) {
            return res.status(403).json({
                success: false,
                message: "Superadmin və Baş Admin məlumatlarına yalnız Superadmin baxa bilər",
            });
        }

        return res.json({
            success: true,
            date: staff,
        })
    } catch (error) {
        console.error("getStaffById error", error);
        return res.status(500).json({
            success: false,
            message: "Staff tapılarkən xəta baş verdi",
        });
    }
}

export const createStaff = async (req, res) => {
    try {
        const { 
            name, surName, phone, email, password, roleId, branchId, isActive, isBoss,
            allowedStartHour, allowedEndHour 
        } = req.body;
        if (!name || !surName) {
            return res.status(400).json({
                success: false,
                message: "Ad və soyad tələb olunur",
            });
        }

        // Password varsa hash et
        let hashedPassword = null;
        if (password && password.trim()) {
          hashedPassword = await bcrypt.hash(password.trim(), 10);
        }

        const bossFlag = typeof isBoss === "boolean" ? isBoss : false;
        const roleRec = roleId
            ? await prisma.role.findUnique({ where: { id: roleId.trim() } })
            : null;

        const requester = await prisma.staff.findUnique({
            where: { id: req.staffId },
            include: { role: true },
        });
        const requesterRole = requester?.role?.name?.toLowerCase();
        if (isPrivilegedStaff(roleRec?.name, bossFlag) && requesterRole !== "superadmin") {
            return res.status(403).json({
                success: false,
                message: "Superadmin və Baş Admin yalnız Superadmin tərəfindən yaradıla bilər",
            });
        }

        const forceNoBranch = isPrivilegedStaff(roleRec?.name, bossFlag);
        let finalBranchId = forceNoBranch ? null : (branchId ? branchId.trim() : null);
        if (!forceNoBranch && !requesterCanPickAnyBranch(requester) && requester?.branchId) {
            finalBranchId = requester.branchId;
        }

        const newStaff = await prisma.staff.create({
          data: {
            name: name.trim(),
            surName: surName.trim(),
            phone: phone ? phone.trim() : null,
            email: email ? email.trim() : null,
            password: hashedPassword,
            roleId: roleId ? roleId.trim() : null,
            branchId: finalBranchId,
            isActive: typeof isActive === "boolean" ? isActive : true,
            isBoss: bossFlag,
            allowedStartHour: allowedStartHour !== undefined ? parseInt(allowedStartHour) : 9,
            allowedEndHour: allowedEndHour !== undefined ? parseInt(allowedEndHour) : 21,
          }
        });

        // Activity log yarat
        try {
            await createActivityLog({
                staffId: req.staffId || null,
                branchId: newStaff.branchId || null,
                entityType: "Staff",
                entityId: newStaff.id,
                action: "CREATE",
                description: `Yeni işçi yaradıldı: ${newStaff.name} ${newStaff.surName || ''}`,
                changes: {
                    name: newStaff.name,
                    surName: newStaff.surName,
                    email: newStaff.email,
                    phone: newStaff.phone,
                    roleId: newStaff.roleId,
                    branchId: newStaff.branchId,
                    isActive: newStaff.isActive,
                    isBoss: newStaff.isBoss,
                    allowedStartHour: newStaff.allowedStartHour,
                    allowedEndHour: newStaff.allowedEndHour
                }
            });
        } catch (logError) {
            console.error("Activity log yaradılarkən xəta:", logError);
            // Activity log xətası əsas əməliyyatı dayandırmamalıdır
        }

        return res.status(201).json({
            success: true,
            message: "Staff yaradıldı",
            date: newStaff,
            data: newStaff,
        });
    } catch (error) {
        console.error("createStaff error", error);
        return res.status(500).json({
            success: false,
            message: "Staff yaradılarkən xəta baş verdi",
        });
    }
}

export const updateStaff = async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            name, surName, phone, email, password, roleId, branchId, isActive, isBoss,
            allowedStartHour, allowedEndHour 
        } = req.body;
        
        const existingStaff = await prisma.staff.findUnique({
          where: { id },
          include: { role: true }
        });
        
        if (!existingStaff) {
            return res.status(404).json({
                success: false,
                message: "Staff tapılmadı",
            });
        }

        const requester = await prisma.staff.findUnique({
            where: { id: req.staffId },
            include: { role: true }
        });
        
        const requesterRole = requester?.role?.name?.toLowerCase();

        // Password varsa hash et
        let hashedPassword = existingStaff.password;
        if (password !== undefined) {
          if (password && password.trim()) {
            hashedPassword = await bcrypt.hash(password.trim(), 10);
          } else {
            hashedPassword = null;
          }
        }
        
        const effectiveRoleId =
            roleId !== undefined ? (roleId?.trim() || null) : existingStaff.roleId;
        const effectiveIsBoss =
            typeof isBoss === "boolean" ? isBoss : existingStaff.isBoss;

        let roleForBranch = existingStaff.role;
        if (effectiveRoleId && effectiveRoleId !== existingStaff.roleId) {
            roleForBranch = await prisma.role.findUnique({
                where: { id: effectiveRoleId },
            });
        }

        const targetWasPrivileged = isPrivilegedStaff(
            existingStaff.role?.name,
            existingStaff.isBoss
        );
        const targetWillBePrivileged = isPrivilegedStaff(
            roleForBranch?.name,
            effectiveIsBoss
        );
        if (
            (targetWasPrivileged || targetWillBePrivileged) &&
            requesterRole !== "superadmin"
        ) {
            return res.status(403).json({
                success: false,
                message:
                    "Superadmin və Baş Admin üzrə dəyişiklik yalnız Superadmin tərəfindən edilə bilər",
            });
        }

        const forceNoBranch = isPrivilegedStaff(roleForBranch?.name, effectiveIsBoss);

        let nextBranchId;
        if (forceNoBranch) {
            nextBranchId = null;
        } else if (branchId !== undefined) {
            nextBranchId = branchId?.trim() || null;
        } else {
            nextBranchId = existingStaff.branchId;
        }
        if (!forceNoBranch && !requesterCanPickAnyBranch(requester) && requester?.branchId) {
            nextBranchId = requester.branchId;
        }

        const updated = await prisma.staff.update({
          where: { id },
          data: {
            name: name !== undefined ? (name?.trim() || null) : existingStaff.name,
            surName: surName !== undefined ? (surName?.trim() || null) : existingStaff.surName,
            phone: phone !== undefined ? (phone?.trim() || null) : existingStaff.phone,
            email: email !== undefined ? (email?.trim() || null) : existingStaff.email,
            password: hashedPassword,
            roleId: effectiveRoleId,
            branchId: nextBranchId,
            isActive: typeof isActive === "boolean" ? isActive : existingStaff.isActive,
            isBoss: effectiveIsBoss,
            allowedStartHour: allowedStartHour !== undefined ? parseInt(allowedStartHour) : existingStaff.allowedStartHour,
            allowedEndHour: allowedEndHour !== undefined ? parseInt(allowedEndHour) : existingStaff.allowedEndHour,
          }
        });

        // Activity log yarat
        try {
            const changes = {};
            if (name !== undefined && name !== existingStaff.name) changes.name = { old: existingStaff.name, new: updated.name };
            if (surName !== undefined && surName !== existingStaff.surName) changes.surName = { old: existingStaff.surName, new: updated.surName };
            if (phone !== undefined && phone !== existingStaff.phone) changes.phone = { old: existingStaff.phone, new: updated.phone };
            if (email !== undefined && email !== existingStaff.email) changes.email = { old: existingStaff.email, new: updated.email };
            if (effectiveRoleId !== existingStaff.roleId) changes.roleId = { old: existingStaff.roleId, new: effectiveRoleId };
            if (nextBranchId !== existingStaff.branchId) changes.branchId = { old: existingStaff.branchId, new: nextBranchId };
            if (isActive !== undefined && isActive !== existingStaff.isActive) changes.isActive = { old: existingStaff.isActive, new: updated.isActive };
            if (isBoss !== undefined && isBoss !== existingStaff.isBoss) changes.isBoss = { old: existingStaff.isBoss, new: updated.isBoss };
            if (allowedStartHour !== undefined && parseInt(allowedStartHour) !== existingStaff.allowedStartHour) changes.allowedStartHour = { old: existingStaff.allowedStartHour, new: updated.allowedStartHour };
            if (allowedEndHour !== undefined && parseInt(allowedEndHour) !== existingStaff.allowedEndHour) changes.allowedEndHour = { old: existingStaff.allowedEndHour, new: updated.allowedEndHour };
            if (password !== undefined) changes.password = { changed: true };

            await createActivityLog({
                staffId: req.staffId || null,
                branchId: updated.branchId || null,
                entityType: "Staff",
                entityId: updated.id,
                action: "UPDATE",
                description: `İşçi yeniləndi: ${updated.name} ${updated.surName || ''}`,
                changes: Object.keys(changes).length > 0 ? changes : null
            });
        } catch (logError) {
            console.error("Activity log yaradılarkən xəta:", logError);
        }

        return res.status(200).json({
            success: true,
            message: "Staff yeniləndi",
            date: updated,
            data: updated,
        });
    } catch (error){
        console.error("updateStaff error", error);
        return res.status(500).json({
            success: false,
            message: "Staff yenilənirkən xəta baş verdi",
        });
    }
}

export const deleteStaff = async (req, res) => {
    try {
        const { id } = req.params;
        const existingStaff = await prisma.staff.findUnique({
          where: { id },
          include: { role: true }
        });
        
        if (!existingStaff) {
            return res.status(404).json({
                success: false,
                message: "Staff tapılmadı",
            });
        }

        const requester = await prisma.staff.findUnique({
            where: { id: req.staffId },
            include: { role: true }
        });
        
        const requesterRole = requester?.role?.name?.toLowerCase();

        if (
            isPrivilegedStaff(existingStaff.role?.name, existingStaff.isBoss) &&
            requesterRole !== "superadmin"
        ) {
            return res.status(403).json({
                success: false,
                message: "Superadmin və Baş Admin yalnız Superadmin tərəfindən silinə bilər",
            });
        }

        await prisma.staff.delete({
          where: { id }
        });

        // Activity log yarat
        try {
            await createActivityLog({
                staffId: req.staffId || null,
                branchId: existingStaff.branchId || null,
                entityType: "Staff",
                entityId: existingStaff.id,
                action: "DELETE",
                description: `İşçi silindi: ${existingStaff.name} ${existingStaff.surName || ''}`,
                changes: {
                    name: existingStaff.name,
                    surName: existingStaff.surName,
                    email: existingStaff.email,
                    phone: existingStaff.phone,
                    branchId: existingStaff.branchId
                }
            });
        } catch (logError) {
            console.error("Activity log yaradılarkən xəta:", logError);
        }

        return res.json({
            success: true,
            message: "Staff silindi",
            date: existingStaff,
            data: existingStaff,
        });
    } catch (error) {
        console.error("deleteStaff error", error);
        return res.status(500).json({
            success: false,
            message: "Staff silinirkən xəta baş verdi",
        });
    }
}