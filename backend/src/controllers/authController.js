import prisma from "../lib/prisma.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createActivityLog } from "./activityLogController.js";

const generateToken = (staffId) => {
  return jwt.sign({ staffId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};


export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email və şifrə tələb olunur",
      });
    }

    const foundStaff = await prisma.staff.findFirst({
      where: { email: email.trim().toLowerCase() },
      include: {
        role: true,
      },
    });

    if (!foundStaff) {
      return res.status(401).json({
        success: false,
        message: "Email və ya şifrə yanlışdır",
      });
    }

    if (!foundStaff.isActive) {
      return res.status(401).json({
        success: false,
        message: "Hesabınız deaktivdir",
      });
    }

    // Password yoxdursa login edə bilməz
    if (!foundStaff.password) {
      return res.status(401).json({
        success: false,
        message: "Bu hesab üçün şifrə təyin edilməyib",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, foundStaff.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Email və ya şifrə yanlışdır",
      });
    }

    // Giriş saatı yoxlanışı (Superadmin, Baş Admin, Satıcı və İsmayıllı rollarına aid deyil)
    const currentHour = new Date().getHours();
    const roleName = foundStaff.role?.name?.toLowerCase();
    const WORK_HOURS_EXEMPT_ROLES = new Set([
      "superadmin",
      "seller",
      "ismayilliadmin",
      "ismayilliseller",
    ]);
    const isPrivileged =
      WORK_HOURS_EXEMPT_ROLES.has(roleName) ||
      (roleName === "admin" && foundStaff.isBoss);

    if (!isPrivileged) {
      const start = foundStaff.allowedStartHour ?? 9;
      const end = foundStaff.allowedEndHour ?? 21;

      if (currentHour < start || currentHour >= end) {
        return res.status(401).json({
          success: false,
          message: `Sistemə giriş icazəniz yoxdur. Sizin iş saatlarınız: ${start}:00 - ${end}:00`,
        });
      }
    }

    const token = generateToken(foundStaff.id);

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", 
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, 
    });

    const { password: _, ...staffWithoutPassword } = foundStaff;

    // Activity log yarat
    try {
        await createActivityLog({
            staffId: foundStaff.id,
            branchId: foundStaff.branchId || null,
            entityType: "Auth",
            entityId: foundStaff.id,
            action: "LOGIN",
            description: `İşçi sistemə daxil oldu: ${foundStaff.name} ${foundStaff.surName || ''}`,
            changes: {
                email: foundStaff.email,
                role: foundStaff.role?.name || null
            }
        });
    } catch (logError) {
        console.error("Activity log yaradılarkən xəta:", logError);
        // Activity log xətası əsas əməliyyatı dayandırmamalıdır
    }

    return res.status(200).json({
      success: true,
      message: "Giriş uğurla tamamlandı",
      data: staffWithoutPassword,
    });
  } catch (error) {
    console.error("login error", error);
    return res.status(500).json({
      success: false,
      message: "Giriş zamanı xəta baş verdi",
    });
  }
};

export const logout = async (req, res) => {
  try {
    const staffId = req.staffId;
    
    // Activity log yarat (token silinməzdən əvvəl)
    if (staffId) {
      try {
        const staff = await prisma.staff.findUnique({
          where: { id: staffId },
          select: { id: true, name: true, surName: true, email: true, branchId: true }
        });
        
        if (staff) {
          await createActivityLog({
            staffId: staff.id,
            branchId: staff.branchId || null,
            entityType: "Auth",
            entityId: staff.id,
            action: "LOGOUT",
            description: `İşçi sistemdən çıxdı: ${staff.name} ${staff.surName || ''}`,
            changes: {
              email: staff.email
            }
          });
        }
      } catch (logError) {
        console.error("Activity log yaradılarkən xəta:", logError);
      }
    }

    res.cookie("token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 0, 
    });

    return res.status(200).json({
      success: true,
      message: "Çıxış uğurla tamamlandı",
    });
  } catch (error) {
    console.error("logout error", error);
    return res.status(500).json({
      success: false,
      message: "Çıxış zamanı xəta baş verdi",
    });
  }
};

export const getMe = async (req, res) => {
  try {
    const staffId = req.staffId;
    const foundStaff = await prisma.staff.findUnique({
      where: { id: staffId },
      include: {
        role: true,
      },
    });

    if (!foundStaff) {
      return res.status(404).json({
        success: false,
        message: "Staff tapılmadı",
      });
    }

    const { password: _, ...staffWithoutPassword } = foundStaff;

    return res.status(200).json({
      success: true,
      data: staffWithoutPassword,
    });
  } catch (error) {
    console.error("getMe error", error);
    return res.status(500).json({
      success: false,
      message: "Məlumat alınarkən xəta baş verdi",
    });
  }
};

