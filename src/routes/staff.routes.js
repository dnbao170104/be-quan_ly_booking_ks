const express = require("express");
const staffController = require("../controllers/staff.controller");
const authMiddleware = require("../middlewares/auth.middleware");

const router = express.Router();

// Áp dụng auth middleware cho tất cả routes staff
router.use(authMiddleware);

// Booking
router.get("/branches/:branchId/bookings", staffController.getBranchBookings);
router.get(
  "/branches/:branchId/bookings/search",
  staffController.searchBookings,
);
router.get(
  "/branches/:branchId/bookings/today",
  staffController.getTodayBookings,
);
router.get(
  "/branches/:branchId/guests/current",
  staffController.getCurrentGuests,
);
router.get("/bookings/:id", staffController.getBookingDetail);
router.post("/branches/:branchId/bookings", staffController.createBooking);
router.put("/bookings/:id", staffController.updateBooking);
router.post("/bookings/:id/confirm", staffController.confirmBooking);
router.post("/bookings/:id/reject", staffController.rejectBooking);
router.post("/bookings/:id/checkin", staffController.checkInBooking);
router.post("/bookings/:id/checkout", staffController.checkOutBooking);
router.post("/bookings/:id/cancel", staffController.cancelBooking);
router.post("/bookings/:id/services", staffController.addService);

// Room
router.get("/branches/:branchId/rooms", staffController.getRooms);
router.patch("/rooms/:id/status", staffController.updateRoomStatus);
router.patch("/rooms/:id/note", staffController.updateRoomNote);
router.get(
  "/branches/:branchId/rooms/stats",
  staffController.getEmptyRoomStats,
);

// Staff
router.post("/change-password", staffController.changeStaffPassword);

module.exports = router;
