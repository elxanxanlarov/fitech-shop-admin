import express from "express";
import multer from "multer";
import {
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  importExcel,
  bulkDeleteProducts,
  adjustStock,
  getStockMovements,
  getSalesHistory
} from "../controllers/ismayilliProductController.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Bütün route-lar auth middleware ilə qorunur
router.use(authenticateToken);

// Kategoriyalar
router.get("/categories", getAllCategories);
router.post("/categories", createCategory);
router.put("/categories/:id", updateCategory);
router.delete("/categories/:id", deleteCategory);

// Mehsullar
router.get("/products", getAllProducts);
router.post("/products/import-excel", upload.single("file"), importExcel);
router.post("/products/bulk-delete", bulkDeleteProducts);
router.get("/products/:id", getProductById);
router.post("/products", createProduct);
router.put("/products/:id", updateProduct);
router.delete("/products/:id", deleteProduct);

// Stok və Tarixçə
router.post("/products/:id/adjust-stock", adjustStock);
router.get("/products/:id/stock-movements", getStockMovements);
router.get("/products/:id/sales-history", getSalesHistory);

export default router;
