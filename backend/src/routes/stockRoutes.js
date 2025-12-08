import express from "express";
import {
  getAllStockMovements,
  getStockMovementById,
  createStockMovement,
  deleteStockMovement,
} from "../controllers/stockController.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// Bütün route-lar auth middleware ilə qorunur
router.use(authenticateToken);

router.get("/", getAllStockMovements);
router.get("/:id", getStockMovementById);
router.post("/", createStockMovement);
router.delete("/:id", deleteStockMovement);

export default router;

