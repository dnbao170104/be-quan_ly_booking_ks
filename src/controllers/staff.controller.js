const staffService = require("../services/staff.service");
const { successResponse, errorResponse } = require("../utils/response");
const {
  validateBookingData,
  validateRoomStatus,
  validateServiceData,
} = require("../validators/staff.validator");

const getBranchBookings = async (req, res) => {
  try {
    const branchId = req.params.branchId;
    const bookings = await staffService.getBookingsByBranch(branchId);
    return successResponse(res, "Danh sách booking chi nhánh", bookings);
  } catch (error) {
    return errorResponse(
      res,
      error.message || "Lỗi lấy danh sách booking",
      [],
      500,
    );
  }
};

const searchBookings = async (req, res) => {
  try {
    const branchId = req.params.branchId;
    const q = req.query.q || req.query.key || "";

    if (!q.trim()) {
      return errorResponse(res, "Vui lòng truyền query tìm kiếm", [], 400);
    }

    const bookings = await staffService.searchBookings(branchId, q);
    return successResponse(res, "Kết quả tìm kiếm booking", bookings);
  } catch (error) {
    return errorResponse(res, error.message || "Lỗi tìm kiếm booking", [], 500);
  }
};

const getBookingDetail = async (req, res) => {
  try {
    const bookingId = req.params.id;
    const booking = await staffService.getBookingById(bookingId);
    if (!booking) return errorResponse(res, "Booking không tồn tại", [], 404);
    return successResponse(res, "Chi tiết booking", booking);
  } catch (error) {
    return errorResponse(
      res,
      error.message || "Lỗi lấy chi tiết booking",
      [],
      500,
    );
  }
};

const createBooking = async (req, res) => {
  try {
    const payload = {
      ...req.body,
      branch_id:
        req.body.branch_id || Number(req.params.branchId) || req.body.branchId,
    };

    const errors = validateBookingData(payload);
    if (errors.length)
      return errorResponse(res, "Dữ liệu booking không hợp lệ", errors, 400);

    const booking = await staffService.createBooking(
      payload,
      req.user.userId,
      Number(req.params.branchId),
    );
    return successResponse(res, "Tạo booking thành công", booking, 201);
  } catch (error) {
    return errorResponse(
      res,
      error.message || "Lỗi tạo booking",
      error.errors || [],
      error.status || 500,
    );
  }
};

const updateBooking = async (req, res) => {
  try {
    const bookingId = req.params.id;
    const booking = await staffService.getBookingById(bookingId);
    if (!booking) return errorResponse(res, "Booking không tồn tại", [], 404);

    const result = await staffService.updateBooking(bookingId, req.body);
    return successResponse(res, "Cập nhật booking thành công", result);
  } catch (error) {
    return errorResponse(
      res,
      error.message || "Lỗi cập nhật booking",
      error.errors || [],
      error.status || 500,
    );
  }
};

const confirmBooking = async (req, res) => {
  try {
    const bookingId = req.params.id;
    const booking = await staffService.updateBookingStatus(
      bookingId,
      "confirmed",
    );
    if (!booking) return errorResponse(res, "Booking không tồn tại", [], 404);
    return successResponse(res, "Xác nhận booking thành công", booking);
  } catch (error) {
    return errorResponse(
      res,
      error.message || "Lỗi xác nhận booking",
      [],
      error.status || 500,
    );
  }
};

const rejectBooking = async (req, res) => {
  try {
    const bookingId = req.params.id;
    const booking = await staffService.updateBookingStatus(
      bookingId,
      "rejected",
    );
    if (!booking) return errorResponse(res, "Booking không tồn tại", [], 404);
    return successResponse(res, "Từ chối booking thành công", booking);
  } catch (error) {
    return errorResponse(
      res,
      error.message || "Lỗi từ chối booking",
      [],
      error.status || 500,
    );
  }
};

const checkInBooking = async (req, res) => {
  try {
    const bookingId = req.params.id;
    const booking = await staffService.checkInBooking(bookingId);
    if (!booking) return errorResponse(res, "Booking không tồn tại", [], 404);
    return successResponse(res, "Check-in thành công", booking);
  } catch (error) {
    return errorResponse(
      res,
      error.message || "Lỗi check-in",
      [],
      error.status || 500,
    );
  }
};

const checkOutBooking = async (req, res) => {
  try {
    const bookingId = req.params.id;
    const booking = await staffService.checkOutBooking(bookingId);
    if (!booking) return errorResponse(res, "Booking không tồn tại", [], 404);
    return successResponse(res, "Check-out thành công", booking);
  } catch (error) {
    return errorResponse(
      res,
      error.message || "Lỗi check-out",
      [],
      error.status || 500,
    );
  }
};

const cancelBooking = async (req, res) => {
  try {
    const bookingId = req.params.id;
    const booking = await staffService.updateBookingStatus(
      bookingId,
      "cancelled",
    );
    if (!booking) return errorResponse(res, "Booking không tồn tại", [], 404);
    return successResponse(res, "Hủy booking thành công", booking);
  } catch (error) {
    return errorResponse(
      res,
      error.message || "Lỗi hủy booking",
      [],
      error.status || 500,
    );
  }
};

const getRooms = async (req, res) => {
  try {
    const branchId = req.params.branchId;
    const rooms = await staffService.getRoomsByBranch(branchId);
    return successResponse(res, "Danh sách phòng", rooms);
  } catch (error) {
    return errorResponse(
      res,
      error.message || "Lỗi lấy danh sách phòng",
      [],
      500,
    );
  }
};

const updateRoomStatus = async (req, res) => {
  try {
    const roomId = req.params.id;
    const errors = validateRoomStatus(req.body);
    if (errors.length)
      return errorResponse(res, "Dữ liệu không hợp lệ", errors, 400);

    const room = await staffService.updateRoomStatus(roomId, req.body.status);
    if (!room) return errorResponse(res, "Phòng không tồn tại", [], 404);
    return successResponse(res, "Cập nhật trạng thái phòng thành công", room);
  } catch (error) {
    return errorResponse(
      res,
      error.message || "Lỗi cập nhật trạng thái phòng",
      [],
      500,
    );
  }
};

const updateRoomNote = async (req, res) => {
  try {
    const roomId = req.params.id;
    const note = req.body.note || "";
    const room = await staffService.updateRoomNote(roomId, note);
    if (!room) return errorResponse(res, "Phòng không tồn tại", [], 404);
    return successResponse(res, "Ghi chú tình trạng phòng cập nhật", room);
  } catch (error) {
    return errorResponse(
      res,
      error.message || "Lỗi cập nhật ghi chú phòng",
      [],
      500,
    );
  }
};

const addService = async (req, res) => {
  try {
    const bookingId = req.params.id;
    const errors = validateServiceData(req.body);
    if (errors.length)
      return errorResponse(res, "Dữ liệu dịch vụ không hợp lệ", errors, 400);

    const booking = await staffService.getBookingById(bookingId);
    if (!booking) return errorResponse(res, "Booking không tồn tại", [], 404);

    const service = await staffService.addBookingService(bookingId, req.body);
    return successResponse(
      res,
      "Ghi nhận dịch vụ phát sinh thành công",
      service,
      201,
    );
  } catch (error) {
    return errorResponse(res, error.message || "Lỗi ghi nhận dịch vụ", [], 500);
  }
};

const getEmptyRoomStats = async (req, res) => {
  try {
    const branchId = req.params.branchId;
    const stats = await staffService.getEmptyRoomStats(branchId);
    return successResponse(res, "Thống kê phòng trống", stats);
  } catch (error) {
    return errorResponse(
      res,
      error.message || "Lỗi lấy thống kê phòng trống",
      [],
      500,
    );
  }
};

const getTodayBookings = async (req, res) => {
  try {
    const branchId = req.params.branchId;
    const bookings = await staffService.getTodayBookings(branchId);
    return successResponse(res, "Danh sách booking trong ngày", bookings);
  } catch (error) {
    return errorResponse(
      res,
      error.message || "Lỗi lấy booking trong ngày",
      [],
      500,
    );
  }
};

const getCurrentGuests = async (req, res) => {
  try {
    const branchId = req.params.branchId;
    const guests = await staffService.getCurrentGuests(branchId);
    return successResponse(res, "Danh sách khách đang ở", guests);
  } catch (error) {
    return errorResponse(
      res,
      error.message || "Lỗi lấy danh sách khách đang ở",
      [],
      500,
    );
  }
};
const changeStaffPassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return errorResponse(
        res,
        "Vui lòng cung cấp mật khẩu cũ và mật khẩu mới",
        [],
        400,
      );
    }

    if (newPassword.length < 6) {
      return errorResponse(
        res,
        "Mật khẩu mới phải có ít nhất 6 ký tự",
        [],
        400,
      );
    }

    const result = await staffService.changeStaffPassword(
      req.user.userId,
      oldPassword,
      newPassword,
    );

    return successResponse(res, result.message);
  } catch (error) {
    return errorResponse(
      res,
      error.message || "Lỗi đổi mật khẩu",
      [],
      error.status || 500,
    );
  }
};
module.exports = {
  getBranchBookings,
  searchBookings,
  getBookingDetail,
  createBooking,
  updateBooking,
  confirmBooking,
  rejectBooking,
  checkInBooking,
  checkOutBooking,
  cancelBooking,
  getRooms,
  updateRoomStatus,
  updateRoomNote,
  addService,
  getEmptyRoomStats,
  getTodayBookings,
  getCurrentGuests,
  changeStaffPassword,
};
