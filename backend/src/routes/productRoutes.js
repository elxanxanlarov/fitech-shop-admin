import express from "express";
import {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  importProductsFromExcel,
} from "../controllers/productController.js";
import { authenticateToken } from "../middleware/authMiddleware.js";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const router = express.Router();

// Bütün route-lar auth middleware ilə qorunur
router.use(authenticateToken);

// Excel upload configuration
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, '../../uploads/excel');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

const excelStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `excel-${uniqueSuffix}${ext}`);
    }
});

const excelUpload = multer({
    storage: excelStorage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /xlsx|xls|csv/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        if (extname) {
            cb(null, true);
        } else {
            cb(new Error('Yalnız Excel faylları (.xlsx, .xls, .csv) yüklənə bilər'), false);
        }
    }
});

router.get("/", getAllProducts);        
router.get("/:id", getProductById);    
router.post("/", createProduct);
router.post("/import", excelUpload.single('file'), importProductsFromExcel);
router.put("/:id", updateProduct);      
router.delete("/:id", deleteProduct);  

export default router;

