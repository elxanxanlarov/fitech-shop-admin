import express from 'express';
import {
    getAllCategories,
    getCategoryById,
    createCategory,
    updateCategory,
    deleteCategory
} from '../controllers/categoryController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Bütün route-lar üçün authentication tələb olunur
router.use(authenticateToken);

router.get('/', getAllCategories);
router.get('/:id', getCategoryById);
router.post('/', createCategory);
router.put('/:id', updateCategory);
router.delete('/:id', deleteCategory);

export default router;

