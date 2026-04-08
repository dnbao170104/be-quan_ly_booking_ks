// Import module mysql2 hỗ trợ kết nối database với Promise (giúp dùng async/await)
const mysql = require('mysql2/promise');

// Tạo một pool kết nối tới MySQL
// Pool giúp quản lý nhiều kết nối cùng lúc, tăng hiệu suất cho ứng dụng
const pool = mysql.createPool({
  host: process.env.DB_HOST,           // Địa chỉ máy chủ database (ví dụ: localhost)
  user: process.env.DB_USER,           // Tên đăng nhập database (thường là root)
  password: process.env.DB_PASSWORD,   // Mật khẩu database
  port: Number(process.env.DB_PORT),   // Cổng kết nối (thường là 3306)
  database: process.env.DB_NAME,       // Tên database cần kết nối (ví dụ: db_bookroom)
  waitForConnections: true,            // Đợi kết nối nếu pool đã đạt giới hạn connectionLimit
  connectionLimit: 10,                 // Giới hạn số lượng kết nối tối đa cùng lúc
  queueLimit: 0                        // Số lượng yêu cầu kết nối chờ tối đa (0 là không giới hạn)
});

// Xuất pool kết nối ra để các file service khác có thể sử dụng truy vấn database
module.exports = pool;