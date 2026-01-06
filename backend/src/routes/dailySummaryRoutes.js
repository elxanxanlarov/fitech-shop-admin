import express from "express";
import {
  createDailySummary,
  getDailySummaries,
  getDailySummaryById,
} from "../controllers/dailySummaryController.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// Günlük yekunları siyahı şəklində gətir (statistika üçün)
router.get("/", authenticateToken, getDailySummaries);

// ID-yə görə günlük yekun
router.get("/:id", authenticateToken, getDailySummaryById);

// Günlük yekun yarat / yenilə (bir gün üçün yalnız bir qeyd saxlanılır)
router.post("/", authenticateToken, createDailySummary);

export default router;

