import express from "express";
import {
  getAllSales,
  getSaleById,
  createSale,
  deleteSale,
  deleteAllSales
} from "../controllers/ismayilliSaleController.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// Bütün route-lar auth middleware ilə qorunur
router.use(authenticateToken);

router.get("/", getAllSales);
router.get("/:id", getSaleById);
router.post("/", createSale);
router.delete("/:id", deleteSale);
router.delete("/", deleteAllSales);

export default router;
