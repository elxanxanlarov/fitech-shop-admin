import express from "express";
import {
  getAllReturns,
  getReturnsBySaleId,
  createReturn,
} from "../controllers/ismayilliReturnController.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(authenticateToken);

router.get("/", getAllReturns);
router.get("/sale/:saleId", getReturnsBySaleId);
router.post("/", createReturn);

export default router;
