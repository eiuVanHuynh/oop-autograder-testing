const jwt = require("jsonwebtoken");

// Cửa 1 của chuỗi: xác thực JWT rồi gắn req.user = { id, role }.
// Gate 1 of the chain: verify the JWT, then attach req.user = { id, role }.
//
// Cần làm / To do:
// - Đọc header `Authorization: Bearer <token>`; thiếu hoặc sai → 401.
// - Token hợp lệ nhưng tài khoản đang bị khóa → 423 (xem api-endpoints.md mục 0).
// - Chỉ gắn id và role vào req.user, đừng gắn cả bản ghi user.
module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: {
        code: "UNAUTHORIZED",
        message: "Missing or malformed authorization token",
      },
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const secret = process.env.JWT_SECRET || "your_jwt_secret_key";
    const decoded = jwt.verify(token, secret);

    // Kiểm tra nếu tài khoản đang bị khóa (status/isLocked)
    if (
      decoded.isLocked ||
      decoded.status === "locked" ||
      decoded.status === "suspended"
    ) {
      return res.status(423).json({
        error: {
          code: "ACCOUNT_LOCKED",
          message: "User account is locked",
        },
      });
    }

    // Chỉ gắn id và role vào req.user theo đúng yêu cầu
    req.user = {
      id: decoded.id || decoded.user_id,
      role: decoded.role || decoded.user_role,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      error: {
        code: "INVALID_TOKEN",
        message: "Token is invalid or expired",
      },
    });
  }
};
