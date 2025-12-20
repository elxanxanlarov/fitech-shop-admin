import prisma from "../lib/prisma.js";
import { createActivityLog } from "./activityLogController.js";

export const getAllRoles = async (req, res) => {
    try {
        const { deleteType, includeDeleted } = req.query;
        
        const where = {};
        
        // DeleteType filter - default olaraq yalnız silinməyən rolları göstər
        if (includeDeleted === 'true') {
            // Bütün rolları göstər (silinmişlər də daxil)
        } else if (deleteType) {
            where.deleteType = deleteType.toUpperCase();
        } else {
            // Default: yalnız silinməyən rolları göstər
            where.deleteType = 'NONE';
        }
        
        const roles = await prisma.role.findMany({
            where,
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
        const { name, isCore, deleteType } = req.body;
        
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
            deleteType: deleteType !== undefined ? deleteType.toUpperCase() : existingRole.deleteType,
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
        const { deleteType = 'SOFT' } = req.body; // Default: SOFT delete
        
        // Ensure deleteType is valid
        const validDeleteType = (deleteType && typeof deleteType === 'string' && deleteType.toUpperCase() === 'HARD') ? 'HARD' : 'SOFT';
        
        const existingRole = await prisma.role.findUnique({
            where: { id },
            include: {
                staff: true
            }
        });
        
        if (!existingRole) {
            return res.status(404).json({
                success: false,
                message: "Role tapılmadı",
            });
        }
        
        // DeleteType-a görə silmə
        if (validDeleteType === 'HARD') {
            // Hard delete - əvvəlcə yoxla ki, staff var
            if (existingRole.staff && existingRole.staff.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: "Bu rol istifadəçilərə təyin edilib. Əvvəlcə istifadəçilərdən rolunu dəyişdirin"
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
                    action: "HARD_DELETE",
                    description: `Rol tamamilə silindi: ${existingRole.name}`,
                    changes: {
                        name: existingRole.name,
                        isCore: existingRole.isCore
                    }
                });
            } catch (logError) {
                console.error("Activity log yaradılarkən xəta:", logError);
            }
        } else {
            // Soft delete - deleteType-u dəyiş
            await prisma.role.update({
                where: { id },
                data: {
                    deleteType: 'SOFT'
                }
            });

            // Activity log yarat
            try {
                await createActivityLog({
                    staffId: req.staffId || null,
                    entityType: "Role",
                    entityId: existingRole.id,
                    action: "SOFT_DELETE",
                    description: `Rol soft delete edildi: ${existingRole.name}`,
                    changes: {
                        name: existingRole.name,
                        isCore: existingRole.isCore,
                        deleteType: 'SOFT'
                    }
                });
            } catch (logError) {
                console.error("Activity log yaradılarkən xəta:", logError);
            }
        }

        return res.json({
            success: true,
            message: validDeleteType === 'HARD' ? "Rol tamamilə silindi" : "Rol soft delete edildi",
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

