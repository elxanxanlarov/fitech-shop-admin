import express from "express";
import {
  getAllRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
} from "../controllers/roleController.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// Bütün route-lar auth middleware ilə qorunur
router.use(authenticateToken);

router.get("/", getAllRoles);        
router.get("/:id", getRoleById);    
router.post("/", createRole);        
router.put("/:id", updateRole);     
router.delete("/:id", deleteRole);  

export default router;

