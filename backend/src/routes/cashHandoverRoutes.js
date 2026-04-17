import express from 'express';
import {
    getAllCashHandovers,
    getCashHandoverById,
    createCashHandover,
    updateCashHandover,
    deleteCashHandover,
    getAvailableRevenueByDate,
    getPayoutPendingDates
} from '../controllers/cashHandoverController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Bütün route-lar üçün authentication tələb olunur
router.use(authenticateToken);

router.get('/', getAllCashHandovers);
router.get('/pending-dates', getPayoutPendingDates);
router.get('/available-revenue', getAvailableRevenueByDate); // Bu route daha spesifikdir, ona görə /id-dən əvvəl olmalıdır
router.get('/:id', getCashHandoverById);
router.post('/', createCashHandover);
router.put('/:id', updateCashHandover);
router.delete('/:id', deleteCashHandover);

export default router;

