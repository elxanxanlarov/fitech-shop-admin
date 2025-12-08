import express from "express";
import {
  getAllStaff,
  getStaffById,
  createStaff,
  updateStaff,
  deleteStaff,
} from "../controllers/staffController.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// Bütün route-lar auth middleware ilə qorunur
router.use(authenticateToken);

router.get("/", getAllStaff);        
router.get("/:id", getStaffById);    
router.post("/", createStaff);       
router.put("/:id", updateStaff);     
router.delete("/:id", deleteStaff);  

export default router;
