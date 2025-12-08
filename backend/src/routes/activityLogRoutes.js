import express from 'express';
import {
    getAllActivityLogs,
    getActivityLogById,
    getActivityLogsByStaff,
    deleteActivityLog
} from '../controllers/activityLogController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Bütün route-lar auth middleware ilə qorunur
router.use(authenticateToken);

// Bütün activity log-ları gətir
router.get('/', getAllActivityLogs);

// ID-yə görə activity log gətir
router.get('/:id', getActivityLogById);

// Staff-a görə activity log-ları gətir
router.get('/staff/:staffId', getActivityLogsByStaff);

// Activity log sil
router.delete('/:id', deleteActivityLog);

export default router;

