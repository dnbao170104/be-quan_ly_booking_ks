const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth.routes');
const branchRoutes = require('./routes/branch.routes');
const staffRoutes = require('./routes/staff.routes');

// Khởi tạo ứng dụng Express
const app = express();

// Cấu hình CORS để cho phép frontend gọi API từ URL khác (domain khác)
app.use(cors({ origin: '*' }));

// Middleware để parse dữ liệu dạng JSON từ request body
app.use(express.json());

// Route mặc định (Trang chủ của API) để kiểm tra server có hoạt động không
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Auth API local đang chạy',
    data: {
      endpoints: [
        'POST /api/auth/register',
        'POST /api/auth/login',
        'POST /api/auth/logout',
        'POST /api/auth/forgot-password/request',
        'POST /api/auth/forgot-password/reset',
        'POST /api/auth/change-password',
        'GET /api/auth/me',
        'GET /api/branches',
        'GET /api/branches/:id',
        'GET /api/staff/branches/:branchId/bookings',
        'GET /api/staff/branches/:branchId/bookings/search?q=xxx',
        'GET /api/staff/branches/:branchId/bookings/today',
        'GET /api/staff/branches/:branchId/guests/current',
        'POST /api/staff/branches/:branchId/bookings',
        'PUT /api/staff/bookings/:id',
        'POST /api/staff/bookings/:id/confirm',
        'POST /api/staff/bookings/:id/reject',
        'POST /api/staff/bookings/:id/checkin',
        'POST /api/staff/bookings/:id/checkout',
        'POST /api/staff/bookings/:id/cancel',
        'GET /api/staff/branches/:branchId/rooms',
        'PATCH /api/staff/rooms/:id/status',
        'PATCH /api/staff/rooms/:id/note',
        'GET /api/staff/branches/:branchId/rooms/stats',
        'POST /api/staff/bookings/:id/services'
      ]
    }
  });
});

// Gắn các tập hợp routes vào các đường dẫn (prefix) tương ứng
app.use('/api/auth', authRoutes);         // Đưa tất cả API liên quan đến tài khoản vào /api/auth
app.use('/api/branches', branchRoutes);   // Đưa tất cả API liên quan đến chi nhánh vào /api/branches
app.use('/api/staff', staffRoutes);      // Đưa tất cả API nhân viên vào /api/staff

// Xuất app ra để server.js có thể sử dụng và chạy server
module.exports = app;