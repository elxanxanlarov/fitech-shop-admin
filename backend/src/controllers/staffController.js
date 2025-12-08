import prisma from "../lib/prisma.js";
import bcrypt from "bcryptjs";
import { createActivityLog } from "./activityLogController.js";

export const getAllStaff = async (req, res) => {
    try {
      const staffList = await prisma.staff.findMany({
        include: {
          role: true,
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
          },
        });

        if (!staff) {
            return res.status(404).json({
                success: false,
                messagge: "Staff tapılmadı",
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
        const { name, surName, phone, email, password, roleId, isActive } = req.body;
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

        const newStaff = await prisma.staff.create({
          data: {
            name: name.trim(),
            surName: surName.trim(),
            phone: phone ? phone.trim() : null,
            email: email ? email.trim() : null,
            password: hashedPassword,
            roleId: roleId ? roleId.trim() : null,
            isActive: typeof isActive === "boolean" ? isActive : true,
          }
        });

        // Activity log yarat
        try {
            await createActivityLog({
                staffId: req.staffId || null,
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
                    isActive: newStaff.isActive
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
        const { name, surName, phone, email, password, roleId, isActive } = req.body;
        
        const existingStaff = await prisma.staff.findUnique({
          where: { id }
        });
        
        if (!existingStaff) {
            return res.status(404).json({
                success: false,
                message: "Staff tapılmadı",
            });
        }
        
        // Password varsa hash et
        let hashedPassword = existingStaff.password;
        if (password !== undefined) {
          if (password && password.trim()) {
            hashedPassword = await bcrypt.hash(password.trim(), 10);
          } else {
            hashedPassword = null;
          }
        }
        
        const updated = await prisma.staff.update({
          where: { id },
          data: {
            name: name !== undefined ? (name?.trim() || null) : existingStaff.name,
            surName: surName !== undefined ? (surName?.trim() || null) : existingStaff.surName,
            phone: phone !== undefined ? (phone?.trim() || null) : existingStaff.phone,
            email: email !== undefined ? (email?.trim() || null) : existingStaff.email,
            password: hashedPassword,
            roleId: roleId !== undefined ? (roleId?.trim() || null) : existingStaff.roleId,
            isActive: typeof isActive === "boolean" ? isActive : existingStaff.isActive,
          }
        });

        // Activity log yarat
        try {
            const changes = {};
            if (name !== undefined && name !== existingStaff.name) changes.name = { old: existingStaff.name, new: updated.name };
            if (surName !== undefined && surName !== existingStaff.surName) changes.surName = { old: existingStaff.surName, new: updated.surName };
            if (phone !== undefined && phone !== existingStaff.phone) changes.phone = { old: existingStaff.phone, new: updated.phone };
            if (email !== undefined && email !== existingStaff.email) changes.email = { old: existingStaff.email, new: updated.email };
            if (roleId !== undefined && roleId !== existingStaff.roleId) changes.roleId = { old: existingStaff.roleId, new: updated.roleId };
            if (isActive !== undefined && isActive !== existingStaff.isActive) changes.isActive = { old: existingStaff.isActive, new: updated.isActive };
            if (password !== undefined) changes.password = { changed: true };

            await createActivityLog({
                staffId: req.staffId || null,
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
          where: { id }
        });
        
        if (!existingStaff) {
            return res.status(404).json({
                success: false,
                message: "Staff tapılmadı",
            });
        }
        
        await prisma.staff.delete({
          where: { id }
        });

        // Activity log yarat
        try {
            await createActivityLog({
                staffId: req.staffId || null,
                entityType: "Staff",
                entityId: existingStaff.id,
                action: "DELETE",
                description: `İşçi silindi: ${existingStaff.name} ${existingStaff.surName || ''}`,
                changes: {
                    name: existingStaff.name,
                    surName: existingStaff.surName,
                    email: existingStaff.email,
                    phone: existingStaff.phone
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