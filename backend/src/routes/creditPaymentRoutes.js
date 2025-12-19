import express from "express";
import {
  makeCreditPayment,
  getSaleCreditPayments,
  getActiveCredits,
} from "../controllers/creditPaymentController.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// Bütün route-lar auth middleware ilə qorunur
router.use(authenticateToken);

router.post("/", makeCreditPayment);
router.get("/sale/:saleId", getSaleCreditPayments);
router.get("/active", getActiveCredits);

export default router;

