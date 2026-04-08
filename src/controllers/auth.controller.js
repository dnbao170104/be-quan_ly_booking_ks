// Import các service xử lý logic database cho auth
const authService = require('../services/auth.service');
// Import tiện ích trả về dữ liệu chuẩn JSON
const { successResponse, errorResponse } = require('../utils/response');
// Import các hàm validate định dạng dữ liệu đầu vào (body, params)
const {
  validateRegister,
  validateLogin,
  validateForgotPasswordRequest,
  validateForgotPasswordReset,
  validateChangePassword
} = require('../validators/auth.validator');

// Hàm xử lý API đăng ký
const register = async (req, res) => {
  try {
    // 1. Kiểm tra tính hợp lệ của dữ liệu gửi lên
    const errors = validateRegister(req.body);
    if (errors.length) {
      return errorResponse(res, 'Dữ liệu không hợp lệ', errors, 400); // 400: Bad Request
    }

    // 2. Gọi logic lưu vào database
    const user = await authService.register(req.body);
    return successResponse(res, 'Đăng ký tài khoản thành công', user, 201); // 201: Created
  } catch (error) {
    return errorResponse(res, error.message || 'Lỗi đăng ký', error.errors || [], error.status || 500); // Báo lỗi nội bộ 500 nếu ko rõ ràng
  }
};

// Hàm xử lý API đăng nhập
const login = async (req, res) => {
  try {
    // 1. Validate dữ liệu đầu vào (username, password)
    const errors = validateLogin(req.body);
    if (errors.length) {
      return errorResponse(res, 'Dữ liệu không hợp lệ', errors, 400);
    }

    // 2. Gọi xác thực trên database
    const result = await authService.login(req.body);
    return successResponse(res, 'Đăng nhập thành công', result);
  } catch (error) {
    return errorResponse(res, error.message || 'Lỗi đăng nhập', error.errors || [], error.status || 500);
  }
};

// Hàm xử lý API đăng xuất
const logout = async (req, res) => {
  try {
    const result = await authService.logout();
    return successResponse(res, result.message, null);
  } catch (error) {
    return errorResponse(res, error.message || 'Lỗi đăng xuất', error.errors || [], error.status || 500);
  }
};

// Hàm xử lý API gửi yêu cầu lấy lại mật khẩu (Gửi email/Tạo mã OTP)
const forgotPasswordRequest = async (req, res) => {
  try {
    // Kiểm tra định dạng email
    const errors = validateForgotPasswordRequest(req.body);
    if (errors.length) {
      return errorResponse(res, 'Dữ liệu không hợp lệ', errors, 400);
    }

    const result = await authService.forgotPasswordRequest(req.body);
    return successResponse(res, 'Tạo mã xác nhận thành công', result);
  } catch (error) {
    return errorResponse(res, error.message || 'Lỗi quên mật khẩu', error.errors || [], error.status || 500);
  }
};

// Hàm xử lý API nhập mã OTP để đổi mật khẩu mới (Quên MK)
const forgotPasswordReset = async (req, res) => {
  try {
    const errors = validateForgotPasswordReset(req.body);
    if (errors.length) {
      return errorResponse(res, 'Dữ liệu không hợp lệ', errors, 400);
    }

    const result = await authService.forgotPasswordReset(req.body);
    return successResponse(res, 'Đặt lại mật khẩu thành công', result);
  } catch (error) {
    return errorResponse(res, error.message || 'Lỗi đặt lại mật khẩu', error.errors || [], error.status || 500);
  }
};

// Hàm xử lý API đổi mật khẩu (User đã đăng nhập)
const changePassword = async (req, res) => {
  try {
    const errors = validateChangePassword(req.body);
    if (errors.length) {
      return errorResponse(res, 'Dữ liệu không hợp lệ', errors, 400);
    }

    // Gửi thông tin đổi pass kèm ID lấy từ token đăng nhập (req.user)
    const result = await authService.changePassword({
      userId: req.user.userId,
      oldPassword: req.body.oldPassword,
      newPassword: req.body.newPassword
    });

    return successResponse(res, 'Đổi mật khẩu thành công', result);
  } catch (error) {
    return errorResponse(res, error.message || 'Lỗi đổi mật khẩu', error.errors || [], error.status || 500);
  }
};

// Hàm xử lý API lấy thông tin Profile hiện tại của User đang đăng nhập
const me = async (req, res) => {
  try {
    // req.user được gán bởi authMiddleware từ token đẩy lên
    const user = await authService.getUserById(req.user.userId);
    return successResponse(res, 'Lấy thông tin người dùng thành công', user);
  } catch (error) {
    return errorResponse(res, error.message || 'Lỗi lấy thông tin người dùng', error.errors || [], error.status || 500);
  }
};

// Hàm xử lý API cập nhật thông tin cá nhân (Profile)
const updateProfile = async (req, res) => {
  try {
    const user = await authService.updateProfile(req.user.userId, req.body);
    return successResponse(res, 'Cập nhật thông tin thành công', user);
  } catch (error) {
    return errorResponse(res, error.message || 'Lỗi cập nhật', error.errors || [], error.status || 500);
  }
};

// Xuất các hàm ra ngoài
module.exports = {
  register,
  login,
  logout,
  forgotPasswordRequest,
  forgotPasswordReset,
  changePassword,
  updateProfile,
  me
};