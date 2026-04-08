const { errorResponse } = require("../utils/response");
const { verifyAccessToken } = require("../utils/jwt");

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return errorResponse(
      res,
      "Bạn chưa đăng nhập",
      ["Missing access token"],
      401,
    );
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = verifyAccessToken(token);
    req.user = {
      ...decoded,
      userId: decoded.userId || decoded.user_id,
      roleId: decoded.roleId || decoded.role_id,
    };
    next();
  } catch (error) {
    return errorResponse(
      res,
      "Token không hợp lệ hoặc đã hết hạn",
      [error.message],
      401,
    );
  }
};

module.exports = authMiddleware;
