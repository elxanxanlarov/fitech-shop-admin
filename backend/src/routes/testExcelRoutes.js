import express from 'express';
import multer from 'multer';
import { parseExcelForPreview } from '../controllers/testExcelController.js';

const router = express.Router();

// Yaddaşda keçici saxlama metodu
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// POST endpointi
router.post('/upload-test-excel', upload.single('excelFile'), parseExcelForPreview);

export default router;