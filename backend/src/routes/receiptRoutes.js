import express from 'express';
import {
    getReceiptById,
    getReceiptBySaleId
} from '../controllers/receiptController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Bütün route-lar auth middleware ilə qorunur
router.use(authenticateToken);

// ID-yə görə qəbz gətir
router.get('/:id', getReceiptById);

// Satış ID-yə görə qəbz gətir
router.get('/sale/:saleId', getReceiptBySaleId);

export default router;

