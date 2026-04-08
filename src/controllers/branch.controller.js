// Import các hàm xử lý logic database từ thư mục services
const branchService = require('../services/branch.service');

// Import tiện ích tạo định dạng JSON chung (Response chung: success / error)
const { successResponse, errorResponse } = require('../utils/response');

// Hàm API để lấy tất cả chi nhánh
const getAllBranches = async (req, res) => {
  try {
    // Gọi layer service để lấy data db
    const branches = await branchService.getAllBranches();
    // Trả về kết quả thành công từ controller
    return successResponse(res, 'Lấy danh sách chi nhánh thành công', branches);
  } catch (error) {
    // Nếu có lỗi, trả về HTTP status 500 cùng thông báo lỗi
    return errorResponse(res, error.message || 'Lỗi lấy danh sách chi nhánh', [], 500);
  }
};

// Hàm API để lấy một chi tiết chi nhánh theo ID
const getBranchById = async (req, res) => {
  try {
    // Đọc thông số params truyển trên đường dẫn (vd: /api/branches/1 -> req.params.id = 1)
    const branchId = req.params.id;
    // Gọi logic lấy detail
    const branch = await branchService.getBranchById(branchId);
    
    // Nếu kết quả rỗng (không tìm thấy trong db), trả về lỗi 404 (Not Found)
    if (!branch) {
      return errorResponse(res, 'Không tìm thấy chi nhánh', [], 404);
    }
    
    // Trả về 200 kèm json data chi tiết
    return successResponse(res, 'Lấy thông tin chi nhánh thành công', branch);
  } catch (error) {
    return errorResponse(res, error.message || 'Lỗi lấy thông tin chi nhánh', [], 500);
  }
};

// Xuất thành object cung cấp 2 phương thức trên
module.exports = {
  getAllBranches,
  getBranchById
};
