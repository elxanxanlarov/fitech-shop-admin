import express from 'express';
import {
    getOverallStatistics,
    getStatisticsByDateRange,
    getDailyStatistics,
    getTopSellingProducts,
    getStatisticsByPaymentType,
    getCustomerStatistics
} from '../controllers/statisticsController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Bütün statistika route-ları auth middleware ilə qorunur
router.use(authenticateToken);

// Ümumi statistika (Dashboard)
router.get('/overall', getOverallStatistics);

// Tarix aralığına görə statistika
router.get('/date-range', getStatisticsByDateRange);

// Günlük statistika
router.get('/daily', getDailyStatistics);

// Ən çox satılan məhsullar
router.get('/top-products', getTopSellingProducts);

// Ödəniş növünə görə statistika
router.get('/payment-type', getStatisticsByPaymentType);

// Müştəri statistikası
router.get('/customers', getCustomerStatistics);

export default router;

