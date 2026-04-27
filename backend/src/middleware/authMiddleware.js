import jwt from "jsonwebtoken";
import prisma from "../lib/prisma.js";

export const authenticateToken = async (req, res, next) => {
  try {
    const token = req.cookies?.token;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Token tapılmadı. Zəhmət olmasa giriş edin.",
      });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.staffId = decoded.staffId;

    // İş saatları yoxlanışı
    const staff = await prisma.staff.findUnique({
      where: { id: req.staffId },
      include: { role: true }
    });

    if (!staff) {
      return res.status(401).json({ success: false, message: "İstifadəçi tapılmadı" });
    }

    if (!staff.isActive) {
      return res.status(401).json({ success: false, message: "Hesabınız deaktiv edilib" });
    }

    // Superadmin və Baş Adminə aid deyil
    const roleName = staff.role?.name?.toLowerCase();
    const isPrivileged = roleName === "superadmin" || (roleName === "admin" && staff.isBoss);

    if (!isPrivileged) {
      const currentHour = new Date().getHours();
      const start = staff.allowedStartHour ?? 9;
      const end = staff.allowedEndHour ?? 21;

      if (currentHour < start || currentHour >= end) {
        return res.status(401).json({
          success: false,
          isLoggedOut: true,
          message: `İş saatınız bitib. Giriş icazəniz: ${start}:00 - ${end}:00`,
        });
      }
    }

    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Etibarsız token",
      });
    }

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token-in müddəti bitib",
      });
    }

    console.error("authenticateToken error", error);
    return res.status(500).json({
      success: false,
      message: "Token yoxlanılarkən xəta baş verdi",
    });
  }
};

