// Import thư viện express
const express = require('express');

// Import controller điều khiển logic xử lý chi nhánh
const branchController = require('../controllers/branch.controller');

// Khởi tạo module Router 
const router = express.Router();

// Định nghĩa route GET '/' lấy danh sách tất cả các chi nhánh
router.get('/', branchController.getAllBranches);

// Định nghĩa route GET '/:id' để lấy thông tin chi tiết của 1 chi nhánh (dựa vào id)
router.get('/:id', branchController.getBranchById);

// Xuất router để sử dụng ở app.js
module.exports = router;
