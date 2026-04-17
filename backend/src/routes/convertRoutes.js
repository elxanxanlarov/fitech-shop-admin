import express from 'express';
import { getConvertStats, assignToKurdaxani, restoreDeleted, hardDeleteAll } from '../controllers/convertController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticateToken);
router.get('/stats', getConvertStats);
router.post('/assign-kurdaxani', assignToKurdaxani);
router.post('/restore-deleted', restoreDeleted);
router.post('/hard-delete-all', hardDeleteAll);

export default router;
