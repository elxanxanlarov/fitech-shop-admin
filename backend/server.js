import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import staffRoutes from "./src/routes/staffRoutes.js";
import roleRoutes from "./src/routes/roleRoutes.js";
import authRoutes from "./src/routes/authRoutes.js";
import productRoutes from "./src/routes/productRoutes.js";
import uploadRoutes from "./src/routes/uploadRoutes.js";
import saleRoutes from "./src/routes/saleRoutes.js";
import returnRoutes from "./src/routes/returnRoutes.js";
import statisticsRoutes from "./src/routes/statisticsRoutes.js";
import activityLogRoutes from "./src/routes/activityLogRoutes.js";
import receiptRoutes from "./src/routes/receiptRoutes.js";
import categoryRoutes from "./src/routes/categoryRoutes.js";
import subCategoryRoutes from "./src/routes/subCategoryRoutes.js";
import expenseRoutes from "./src/routes/expenseRoutes.js";
import cashHandoverRoutes from "./src/routes/cashHandoverRoutes.js";
import stockRoutes from "./src/routes/stockRoutes.js";
import { seedData } from "./src/seed/seedData.js";
import path from "path";
import { fileURLToPath } from "url";
dotenv.config();

// Seed data işə sal
seedData();

const app = express();
const PORT = process.env.PORT;
const allowedOrigins = process.env.CORS_ORIGIN.split(",");
app.use(
  cors({
    origin: (origin, callback) => {
      // Postman, browserdə birbaşa URL açanda, cron job vs.
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// Static files - uploads folder
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use("/api/auth", authRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/role", roleRoutes);
app.use("/api/product", productRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/sale", saleRoutes);
app.use("/api/return", returnRoutes);
app.use("/api/statistics", statisticsRoutes);
app.use("/api/activity-log", activityLogRoutes);
app.use("/api/receipt", receiptRoutes);
app.use("/api/category", categoryRoutes);
app.use("/api/subcategory", subCategoryRoutes);
app.use("/api/expense", expenseRoutes);
app.use("/api/cash-handover", cashHandoverRoutes);
app.use("/api/stock", stockRoutes);

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Backend API is running ✅",
    timestamp: new Date().toISOString(),
  });
});
app.listen(PORT, () => {
  console.log(`✅ Server is running on http://localhost:${PORT}`);
});
