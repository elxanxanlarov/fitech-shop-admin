import express from 'express';
import { 
    getConvertStats, 
    assignToBranch, 
    restoreDeleted, 
    hardDeleteAll,
    getDeletedProducts
} from '../controllers/convertController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticateToken);
router.get('/stats', getConvertStats);
router.get('/deleted-products', getDeletedProducts);
router.post('/assign-to-branch', assignToBranch);
router.post('/restore-deleted', restoreDeleted);
router.post('/hard-delete-all', hardDeleteAll);

export default router;
