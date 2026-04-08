// Import thư viện express
const express = require('express');

// Import controller điều khiển logic cho auth
const authController = require('../controllers/auth.controller');

// Import middleware dùng để xác thực token (bảo vệ các route cần đăng nhập mới vào được)
const authMiddleware = require('../middlewares/auth.middleware');

// Khởi tạo một Router instance của Express
const router = express.Router();

// Định nghĩa các route cơ bản không yêu cầu đăng nhập: Đăng ký, Đăng nhập, Đăng xuất
router.post('/register', authController.register); // Gọi API tạo tài khoản mới
router.post('/login', authController.login);       // Gọi API kiểm tra và lấy token đăng nhập
router.post('/logout', authController.logout);     // Gọi API xóa và đăng xuất

// Các route hỗ trợ tính năng quên mật khẩu (không cần token đăng nhập)
router.post('/forgot-password/request', authController.forgotPasswordRequest); // Yêu cầu cấp mã reset pass
router.post('/forgot-password/reset', authController.forgotPasswordReset);     // Nhập mã reset pass và đổi mật khẩu mới

// Các route YÊU CẦU ĐĂNG NHẬP (phải gắn thêm authMiddleware vào trước authController)
router.post('/change-password', authMiddleware, authController.changePassword); // Đổi mật khẩu khi đang login
router.get('/me', authMiddleware, authController.me);                           // Lấy thông tin user hiện tại
router.put('/profile', authMiddleware, authController.updateProfile);           // Cập nhật thông tin hồ sơ cá nhân

// Xuất router để đưa vào app.use()
module.exports = router;