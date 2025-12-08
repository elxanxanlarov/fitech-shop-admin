import prisma from '../lib/prisma.js';

// Bütün activity log-ları gətir
export const getAllActivityLogs = async (req, res) => {
    try {
        const { staffId, entityType, action, startDate, endDate, limit = 100, page = 1 } = req.query;
        
        const where = {};
        
        if (staffId) {
            where.staffId = staffId;
        }
        
        if (entityType) {
            where.entityType = entityType;
        }
        
        if (action) {
            where.action = action;
        }
        
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) {
                where.createdAt.gte = new Date(startDate);
            }
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                where.createdAt.lte = end;
            }
        }
        
        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        const [logs, total] = await Promise.all([
            prisma.activityLog.findMany({
                where,
                include: {
                    staff: {
                        select: {
                            id: true,
                            name: true,
                            surName: true,
                            email: true,
                            role: {
                                select: {
                                    name: true
                                }
                            }
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                },
                skip,
                take: parseInt(limit)
            }),
            prisma.activityLog.count({ where })
        ]);
        
        res.json({
            success: true,
            data: logs,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Error fetching activity logs:', error);
        res.status(500).json({
            success: false,
            message: 'Activity log-lar alınarkən xəta baş verdi',
            error: error.message
        });
    }
};

// ID-yə görə activity log gətir
export const getActivityLogById = async (req, res) => {
    try {
        const { id } = req.params;
        
        const log = await prisma.activityLog.findUnique({
            where: { id },
            include: {
                staff: {
                    select: {
                        id: true,
                        name: true,
                        surName: true,
                        email: true,
                        role: {
                            select: {
                                name: true
                            }
                        }
                    }
                }
            }
        });
        
        if (!log) {
            return res.status(404).json({
                success: false,
                message: 'Activity log tapılmadı'
            });
        }
        
        res.json({
            success: true,
            data: log
        });
    } catch (error) {
        console.error('Error fetching activity log:', error);
        res.status(500).json({
            success: false,
            message: 'Activity log alınarkən xəta baş verdi',
            error: error.message
        });
    }
};

// Staff-a görə activity log-ları gətir
export const getActivityLogsByStaff = async (req, res) => {
    try {
        const { staffId } = req.params;
        const { limit = 50, page = 1 } = req.query;
        
        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        const [logs, total] = await Promise.all([
            prisma.activityLog.findMany({
                where: { staffId },
                include: {
                    staff: {
                        select: {
                            id: true,
                            name: true,
                            surName: true,
                            email: true,
                            role: {
                                select: {
                                    name: true
                                }
                            }
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                },
                skip,
                take: parseInt(limit)
            }),
            prisma.activityLog.count({ where: { staffId } })
        ]);
        
        res.json({
            success: true,
            data: logs,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Error fetching activity logs by staff:', error);
        res.status(500).json({
            success: false,
            message: 'Staff activity log-ları alınarkən xəta baş verdi',
            error: error.message
        });
    }
};

// Activity log yarat (helper funksiya kimi istifadə olunur)
export const createActivityLog = async (data) => {
    try {
        const { staffId, entityType, entityId, action, description, changes } = data;
        
        const log = await prisma.activityLog.create({
            data: {
                staffId: staffId || null,
                entityType,
                entityId,
                action,
                description: description || null,
                changes: changes || null
            },
            include: {
                staff: {
                    select: {
                        id: true,
                        name: true,
                        surName: true,
                        email: true
                    }
                }
            }
        });
        
        return log;
    } catch (error) {
        console.error('Error creating activity log:', error);
        throw error;
    }
};

// Activity log sil
export const deleteActivityLog = async (req, res) => {
    try {
        const { id } = req.params;
        
        const log = await prisma.activityLog.findUnique({
            where: { id }
        });
        
        if (!log) {
            return res.status(404).json({
                success: false,
                message: 'Activity log tapılmadı'
            });
        }
        
        await prisma.activityLog.delete({
            where: { id }
        });
        
        res.json({
            success: true,
            message: 'Activity log silindi'
        });
    } catch (error) {
        console.error('Error deleting activity log:', error);
        res.status(500).json({
            success: false,
            message: 'Activity log silinərkən xəta baş verdi',
            error: error.message
        });
    }
};

