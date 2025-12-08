import express from 'express';
import {
    getAllExpenses,
    getExpenseById,
    createExpense,
    updateExpense,
    deleteExpense
} from '../controllers/expenseController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Bütün route-lar üçün authentication tələb olunur
router.use(authenticateToken);

router.get('/', getAllExpenses);
router.get('/:id', getExpenseById);
router.post('/', createExpense);
router.put('/:id', updateExpense);
router.delete('/:id', deleteExpense);

export default router;

