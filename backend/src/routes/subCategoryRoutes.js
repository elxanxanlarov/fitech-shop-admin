import express from 'express';
import {
    getAllSubCategories,
    getSubCategoryById,
    createSubCategory,
    updateSubCategory,
    deleteSubCategory
} from '../controllers/subCategoryController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Bütün route-lar üçün authentication tələb olunur
router.use(authenticateToken);

router.get('/', getAllSubCategories);
router.get('/:id', getSubCategoryById);
router.post('/', createSubCategory);
router.put('/:id', updateSubCategory);
router.delete('/:id', deleteSubCategory);

export default router;

