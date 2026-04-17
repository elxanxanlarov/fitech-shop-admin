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
import creditTermRoutes from "./src/routes/creditTermRoutes.js";
import creditPaymentRoutes from "./src/routes/creditPaymentRoutes.js";
import notificationRoutes from "./src/routes/notificationRoutes.js";
import finalDeliveryRoutes from "./src/routes/finalDeliveryRoutes.js";
import dailySummaryRoutes from "./src/routes/dailySummaryRoutes.js";
import branchRoutes from "./src/routes/branchRoutes.js";
import stockTransferRoutes from "./src/routes/stockTransferRoutes.js";
import convertRoutes from "./src/routes/convertRoutes.js";
import { seedData } from "./src/seed/seedData.js";
import { checkCreditPaymentDue } from "./src/controllers/notificationController.js";
import { generateDailySummaryForDate } from "./src/controllers/dailySummaryController.js";
import path from "path";
import { fileURLToPath } from "url";
dotenv.config();
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
app.use("/api/credit-term", creditTermRoutes);
app.use("/api/credit-payment", creditPaymentRoutes);
app.use("/api/notification", notificationRoutes);
app.use("/api/final-delivery", finalDeliveryRoutes);
app.use("/api/daily-summary", dailySummaryRoutes);
app.use("/api/branch", branchRoutes);
app.use("/api/stock-transfer", stockTransferRoutes);
app.use("/api/convert", convertRoutes);

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Backend API is running ✅",
    timestamp: new Date().toISOString(),
  });
});
// Kredit ödəniş bildirişləri üçün scheduler (hər gün səhər 9:00-da)
const scheduleCreditNotifications = () => {
  const now = new Date();
  const nextCheck = new Date();
  nextCheck.setHours(9, 0, 0, 0); // Səhər 9:00
  
  // Əgər 9:00 keçibsə, növbəti günə təyin et
  if (now > nextCheck) {
    nextCheck.setDate(nextCheck.getDate() + 1);
  }
  
  const msUntilNextCheck = nextCheck.getTime() - now.getTime();
  
  setTimeout(() => {
    checkCreditPaymentDue();
    // Hər gün təkrarla
    setInterval(() => {
      checkCreditPaymentDue();
    }, 24 * 60 * 60 * 1000); // 24 saat
  }, msUntilNextCheck);
  
  console.log(`📅 Kredit bildiriş scheduler aktivləşdirildi. Növbəti yoxlama: ${nextCheck.toLocaleString('az-AZ')}`);
};

// Hər gün 23:55-də avtomatik günlük yekun yaratmaq üçün scheduler
const scheduleDailySummary = () => {
  const now = new Date();
  const nextRun = new Date();
  nextRun.setHours(23, 55, 0, 0); // Axşam 23:55

  // Əgər bu gün 23:55 keçibsə, növbəti gün üçün təyin et
  if (now > nextRun) {
    nextRun.setDate(nextRun.getDate() + 1);
  }

  const msUntilNextRun = nextRun.getTime() - now.getTime();

  setTimeout(() => {
    const today = new Date();
    const dateStr = today.toISOString().split("T")[0];

    generateDailySummaryForDate({ date: dateStr, note: "[AUTO]", staffId: null })
      .then(({ summary, hasSales }) => {
        console.log(
          `📊 Günlük yekun avtomatik yaradıldı (${dateStr}). Satış var idimi? ${hasSales ? "Bəli" : "Xeyr"}`
        );
      })
      .catch((err) => {
        console.error("❌ Avtomatik günlük yekun yaradılarkən xəta:", err);
      });

    // Sonrakı günlər üçün hər 24 saatdan bir təkrarla
    setInterval(() => {
      const d = new Date();
      const ds = d.toISOString().split("T")[0];
      generateDailySummaryForDate({ date: ds, note: "[AUTO]", staffId: null })
        .then(({ summary, hasSales }) => {
          console.log(
            `📊 Günlük yekun avtomatik yaradıldı (${ds}). Satış var idimi? ${
              hasSales ? "Bəli" : "Xeyr"
            }`
          );
        })
        .catch((err) => {
          console.error("❌ Avtomatik günlük yekun yaradılarkən xəta:", err);
        });
    }, 24 * 60 * 60 * 1000);
  }, msUntilNextRun);

  console.log(
    `⏰ Günlük yekun scheduler aktivdir. Növbəti avtomatik yaradılma: ${nextRun.toLocaleString(
      "az-AZ"
    )}`
  );
};

// Scheduler-ları başlat
scheduleCreditNotifications();
scheduleDailySummary();

app.listen(PORT, () => {
  console.log(`✅ Server is running on http://localhost:${PORT}`);
});
