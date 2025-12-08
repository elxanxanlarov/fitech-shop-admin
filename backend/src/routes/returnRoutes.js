import express from "express";
import {
  getAllReturns,
  getReturnById,
  getReturnsBySaleId,
  createReturn,
  updateReturn,
  deleteReturn,
} from "../controllers/returnController.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// Bütün route-lar auth middleware ilə qorunur
router.use(authenticateToken);

router.get("/", getAllReturns);
router.get("/sale/:saleId", getReturnsBySaleId);
router.get("/:id", getReturnById);
router.post("/", createReturn);
router.put("/:id", updateReturn);
router.delete("/:id", deleteReturn);

export default router;

