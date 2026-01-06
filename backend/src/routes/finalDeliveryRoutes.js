import express from 'express';
import {
    getAllFinalDeliveries,
    getFinalDeliveryById,
    createFinalDelivery,
    updateFinalDelivery,
    deleteFinalDelivery,
    previewFinalDelivery,
    updateFinalDeliveryItem,
    addFinalDeliveryItem,
    deleteFinalDeliveryItem
} from '../controllers/finalDeliveryController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Bütün yekun təslimatları gətir
router.get('/', authenticateToken, getAllFinalDeliveries);

// Preview - Tarix aralığına görə məhsulları gətir
router.get('/preview', authenticateToken, previewFinalDelivery);

// ID-yə görə yekun təslimat gətir
router.get('/:id', authenticateToken, getFinalDeliveryById);

// Yekun təslimat yarat
router.post('/', authenticateToken, createFinalDelivery);

// Yekun təslimatı yenilə
router.put('/:id', authenticateToken, updateFinalDelivery);

// Yekun təslimatı sil
router.delete('/:id', authenticateToken, deleteFinalDelivery);

// FinalDeliveryItem əməliyyatları
// Məhsul əlavə et
router.post('/:deliveryId/items', authenticateToken, addFinalDeliveryItem);

// Məhsul yenilə
router.put('/items/:itemId', authenticateToken, updateFinalDeliveryItem);

// Məhsul sil
router.delete('/items/:itemId', authenticateToken, deleteFinalDeliveryItem);

export default router;

