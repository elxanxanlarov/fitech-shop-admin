import express from "express";
import multer from "multer";
import {
  getAllFirmas,
  getFirmaById,
  createFirma,
  updateFirma,
  deleteFirma,
  addTransaction,
  deleteTransaction,
  importFirmaProductsExcel,
} from "../controllers/ismayilliFirmaController.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(authenticateToken);

router.get("/", getAllFirmas);
router.post("/", createFirma);
router.post("/import-products-excel", upload.single("file"), importFirmaProductsExcel);
router.get("/:id", getFirmaById);
router.put("/:id", updateFirma);
router.delete("/:id", deleteFirma);

router.post("/:id/transaction", addTransaction);
router.delete("/:firmaId/transaction/:transactionId", deleteTransaction);

export default router;
