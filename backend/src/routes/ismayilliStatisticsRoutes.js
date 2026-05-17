import express from "express";
import {
  getIsmayilliStats
} from "../controllers/ismayilliStatisticsController.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// Bütün route-lar auth middleware ilə qorunur
router.use(authenticateToken);

router.get("/", getIsmayilliStats);

export default router;
