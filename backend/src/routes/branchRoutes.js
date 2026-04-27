import express from "express";
import { authenticateToken } from "../middleware/authMiddleware.js";
import { 
    getAllBranches, 
    getBranchById, 
    createBranch, 
    updateBranch,
    getBranchStocks,
    syncBranchWithCentral,
    getAllBranchStocks,
    deleteBranch
} from "../controllers/branchController.js";

const router = express.Router();

router.get("/", getAllBranches);
router.get("/all-stocks", getAllBranchStocks);
router.get("/:id", getBranchById);
router.post("/", createBranch);
router.put("/:id", updateBranch);
router.delete("/:id", authenticateToken, deleteBranch);
router.get("/:id/stocks", getBranchStocks);
router.post("/:id/sync-central", authenticateToken, syncBranchWithCentral);

export default router;
