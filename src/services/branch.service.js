// Lấy đối tượng kết nối vào CSDL từ pool đã khởi tạo ở config
const pool = require('../config/db');

// Xử lý lấy tất cả chi nhánh đang public/active
const getAllBranches = async () => {
  // pool.query sẽ trả về [rows, fields]. Destructuring lấy phần tử đầu tiên (rows - các dòng kết quả)
  // Truy vấn tìm tất cả records trên bảng branches có is_active = 1
  const [rows] = await pool.query(
    `SELECT branch_id, branch_name, address, phone, email, description, is_active FROM branches WHERE is_active = 1`
  );
  // Trả về mảng dữ liệu
  return rows;
};

// Lấy duy nhất 1 chi nhánh thông qua ID tương đương
const getBranchById = async (branchId) => {
  // Thay thế biến truyền vào branchId qua dấu '?' để tránh lỗi bảo mật SQL Injection
  const [rows] = await pool.query(
    `SELECT branch_id, branch_name, address, phone, email, description, is_active FROM branches WHERE branch_id = ?`,
    [branchId]
  );
  // Do id là khoá chính (duy nhất) hoặc không có. Kết quả nếu có sẽ ở vị trí index 0. Nếu không có trả về null.
  return rows[0] || null;
};

// Export các hàm logic nghiệp vụ này để controller gọi
module.exports = {
  getAllBranches,
  getBranchById
};
