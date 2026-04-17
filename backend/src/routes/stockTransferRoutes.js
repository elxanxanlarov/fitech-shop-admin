import express from "express";
import { authenticateToken } from "../middleware/authMiddleware.js";
import {
    getAllTransfers,
    createTransfer,
    updateTransferStatus,
    createFilialProductTransferComplete
} from "../controllers/stockTransferController.js";

const router = express.Router();

router.get("/", getAllTransfers);
router.post("/", createTransfer);
router.post("/filial-complete", authenticateToken, createFilialProductTransferComplete);
router.put("/:id/status", updateTransferStatus);

export default router;
