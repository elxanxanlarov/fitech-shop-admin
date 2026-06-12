import express from "express";
import multer from "multer";
import {
  getAllSales,
  getSaleById,
  createSale,
  deleteSale,
  deleteAllSales,
  importSalesFromExcel,
  bulkDeleteSales,
} from "../controllers/ismayilliSaleController.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(authenticateToken);

router.get("/", getAllSales);
router.post("/import-excel", upload.single("file"), importSalesFromExcel);
router.post("/bulk-delete", bulkDeleteSales);
router.get("/:id", getSaleById);
router.post("/", createSale);
router.delete("/:id", deleteSale);
router.delete("/", deleteAllSales);

export default router;
