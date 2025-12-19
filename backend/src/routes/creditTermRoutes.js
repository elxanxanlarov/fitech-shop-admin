import express from "express";
import {
  getAllCreditTerms,
  createCreditTerm,
  updateCreditTerm,
  deleteCreditTerm,
} from "../controllers/creditTermController.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// Bütün route-lar auth middleware ilə qorunur
router.use(authenticateToken);

router.get("/", getAllCreditTerms);
router.post("/", createCreditTerm);
router.put("/:id", updateCreditTerm);
router.delete("/:id", deleteCreditTerm);

export default router;

