import prisma from "../lib/prisma.js";
import { createActivityLog } from "./activityLogController.js";

export const getAllRoles = async (req, res) => {
    try {
      const roles = await prisma.role.findMany({
        include: {
          staff: {
            select: {
              id: true,
              name: true,
              surName: true,
              email: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc',
        }
      });

      return res.status(200).json({
        success: true,
        date: roles,
      });
    } catch (error) {
        console.error("getAllRoles error", error);
        return res.status(500).json({
            success: false,
            message: "Role siyahısı alınarkən xəta baş verdi"
        })
    }
}

export const getRoleById = async (req, res) => {
    try {
        const { id } = req.params;
        const role = await prisma.role.findUnique({
          where: { id },
        });

        if (!role) {
            return res.status(404).json({
                success: false,
                message: "Role tapılmadı",
            });
        }

        return res.json({
            success: true,
            date: role,
        })
    } catch (error) {
        console.error("getRoleById error", error);
        return res.status(500).json({
            success: false,
            message: "Role tapılarkən xəta baş verdi",
        });
    }
}

export const createRole = async (req, res) => {
    try {
        const { name, isCore } = req.body;
        if (!name) {
            return res.status(400).json({
                success: false,
                message: "Role adı tələb olunur",
            });
        }

        const newRole = await prisma.role.create({
          data: {
            name: name.trim(),
            isCore: typeof isCore === "boolean" ? isCore : false,
          }
        });

        // Activity log yarat
        try {
            await createActivityLog({
                staffId: req.staffId || null,
                entityType: "Role",
                entityId: newRole.id,
                action: "CREATE",
                description: `Yeni rol yaradıldı: ${newRole.name}`,
                changes: {
                    name: newRole.name,
                    isCore: newRole.isCore
                }
            });
        } catch (logError) {
            console.error("Activity log yaradılarkən xəta:", logError);
        }

        return res.status(201).json({
            success: true,
            message: "Role yaradıldı",
            date: newRole,
            data: newRole,
        });
    } catch (error) {
        console.error("createRole error", error);
        return res.status(500).json({
            success: false,
            message: "Role yaradılarkən xəta baş verdi",
        });
    }
}

export const updateRole = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, isCore } = req.body;
        
        const existingRole = await prisma.role.findUnique({
          where: { id }
        });
        
        if (!existingRole) {
            return res.status(404).json({
                success: false,
                message: "Role tapılmadı",
            });
        }
        
        const updated = await prisma.role.update({
          where: { id },
          data: {
            name: name !== undefined ? (name?.trim() || null) : existingRole.name,
            isCore: typeof isCore === "boolean" ? isCore : existingRole.isCore,
          }
        });

        // Activity log yarat
        try {
            const changes = {};
            if (name !== undefined && name !== existingRole.name) changes.name = { old: existingRole.name, new: updated.name };
            if (isCore !== undefined && isCore !== existingRole.isCore) changes.isCore = { old: existingRole.isCore, new: updated.isCore };

            await createActivityLog({
                staffId: req.staffId || null,
                entityType: "Role",
                entityId: updated.id,
                action: "UPDATE",
                description: `Rol yeniləndi: ${updated.name}`,
                changes: Object.keys(changes).length > 0 ? changes : null
            });
        } catch (logError) {
            console.error("Activity log yaradılarkən xəta:", logError);
        }

        return res.status(200).json({
            success: true,
            message: "Role yeniləndi",
            date: updated,
            data: updated,
        });
    } catch (error){
        console.error("updateRole error", error);
        return res.status(500).json({
            success: false,
            message: "Role yenilənirkən xəta baş verdi",
        });
    }
}

export const deleteRole = async (req, res) => {
    try {
        const { id } = req.params;
        const existingRole = await prisma.role.findUnique({
          where: { id }
        });
        
        if (!existingRole) {
            return res.status(404).json({
                success: false,
                message: "Role tapılmadı",
            });
        }
        
        await prisma.role.delete({
          where: { id }
        });

        // Activity log yarat
        try {
            await createActivityLog({
                staffId: req.staffId || null,
                entityType: "Role",
                entityId: existingRole.id,
                action: "DELETE",
                description: `Rol silindi: ${existingRole.name}`,
                changes: {
                    name: existingRole.name,
                    isCore: existingRole.isCore
                }
            });
        } catch (logError) {
            console.error("Activity log yaradılarkən xəta:", logError);
        }

        return res.json({
            success: true,
            message: "Role silindi",
            date: existingRole,
            data: existingRole,
        });
    } catch (error) {
        console.error("deleteRole error", error);
        return res.status(500).json({
            success: false,
            message: "Role silinirkən xəta baş verdi",
        });
    }
}

