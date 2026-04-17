import express from 'express';
import {
    getAllCategories,
    getCategoryById,
    createCategory,
    updateCategory,
    deleteCategory,
    makeCategoriesGlobal
} from '../controllers/categoryController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Bütün route-lar üçün authentication tələb olunur
router.use(authenticateToken);

router.get('/', getAllCategories);
router.get('/:id', getCategoryById);
router.post('/', createCategory);
router.post('/make-global', makeCategoriesGlobal);
router.put('/:id', updateCategory);
router.delete('/:id', deleteCategory);

export default router;

