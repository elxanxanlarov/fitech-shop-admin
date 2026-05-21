import express from "express";
import {
  getIsmayilliStats,
  getRecentActivities,
} from "../controllers/ismayilliStatisticsController.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(authenticateToken);

router.get("/", getIsmayilliStats);
router.get("/activities", getRecentActivities);

export default router;
