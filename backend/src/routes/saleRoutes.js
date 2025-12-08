import express from "express";
import {
  getAllSales,
  getSaleById,
  createSale,
  updateSale,
  deleteSale,
} from "../controllers/saleController.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// Bütün route-lar auth middleware ilə qorunur
router.use(authenticateToken);

router.get("/", getAllSales);
router.get("/:id", getSaleById);
router.post("/", createSale);
router.put("/:id", updateSale);
router.delete("/:id", deleteSale);

export default router;

