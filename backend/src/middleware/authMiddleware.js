import jwt from "jsonwebtoken";

export const authenticateToken = (req, res, next) => {
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

