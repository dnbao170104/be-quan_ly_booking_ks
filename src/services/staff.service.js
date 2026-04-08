const pool = require("../config/db");
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");

const STATUS_MAP_TO_EN = {
  "chờ xác nhận": "pending",
  "đã xác nhận": "confirmed",
  "đã check-in": "checked_in",
  "đã check-out": "checked_out",
  "đã hủy": "cancelled",
};

const STATUS_MAP_TO_VN = {
  pending: "chờ xác nhận",
  confirmed: "đã xác nhận",
  checked_in: "đã check-in",
  checked_out: "đã check-out",
  cancelled: "đã hủy",
  rejected: "đã hủy",
};

const normalizeBookingStatus = (status) => STATUS_MAP_TO_EN[status] || status;
const denormalizeBookingStatus = (status) => STATUS_MAP_TO_VN[status] || status;

const mapBookingRow = (row) => ({
  booking_id: row.booking_id,
  booking_code: row.booking_code,
  customer_name: row.customer_name || row.full_name || null,
  phone: row.phone || null,
  room_id: row.room_id || null,
  branch_id: row.branch_id,
  checkin_date: row.check_in_date || row.checkin_date || null,
  checkout_date: row.check_out_date || row.checkout_date || null,
  checkin_at: row.actual_check_in || row.checkin_at || null,
  checkout_at: row.actual_check_out || row.checkout_at || null,
  total_amount: row.price_at_booking || row.total_amount || 0,
  status: normalizeBookingStatus(row.status),
  note: row.note || null,
  created_at: row.created_at,
});

const getStaffByUserId = async (userId) => {
  const [rows] = await pool.query(`SELECT * FROM staff WHERE user_id = ?`, [
    userId,
  ]);
  return rows[0] || null;
};

const getUserByPhone = async (phone) => {
  const [rows] = await pool.query(
    `SELECT * FROM users WHERE phone = ? LIMIT 1`,
    [phone],
  );
  return rows[0] || null;
};

const createGuestUser = async ({ customer_name, phone }) => {
  if (!customer_name || !phone) return null;

  const existing = await getUserByPhone(phone);
  if (existing) return existing;

  const userId = uuidv4();
  const username = `guest_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  const passwordHash = await bcrypt.hash(uuidv4(), 10);

  await pool.query(
    `INSERT INTO users (user_id, username, password, full_name, phone, role_id, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [userId, username, passwordHash, customer_name, phone, 3, 1],
  );

  return {
    user_id: userId,
    username,
    full_name: customer_name,
    phone,
    role_id: 3,
    is_active: 1,
  };
};

const getUserRoleById = async (userId) => {
  const [rows] = await pool.query(
    `SELECT user_id, role_id FROM users WHERE user_id = ? LIMIT 1`,
    [userId],
  );
  return rows[0] || null;
};

const ensureStaffRecord = async (userId, branchId) => {
  let staff = await getStaffByUserId(userId);
  if (staff) return staff;

  const user = await getUserRoleById(userId);
  if (!user || Number(user.role_id) !== 2) {
    return null;
  }

  await pool.query(`INSERT INTO staff (user_id, branch_id) VALUES (?, ?)`, [
    userId,
    branchId,
  ]);
  staff = await getStaffByUserId(userId);
  return staff;
};

const getRoomDetails = async (roomId) => {
  const [rows] = await pool.query(
    `SELECT r.room_id, r.type_id, r.status,
            rt.base_price, rt.price_sunday_normal, rt.price_peak_season,
            rt.price_peak_sunday, rt.price_hour
      FROM rooms r
      LEFT JOIN room_types rt ON rt.type_id = r.type_id
      WHERE r.room_id = ?
      LIMIT 1`,
    [roomId],
  );
  return rows[0] || null;
};

const calculateBookingDays = (checkinDate, checkoutDate) => {
  const checkin = new Date(checkinDate);
  const checkout = new Date(checkoutDate);
  if (Number.isNaN(checkin.getTime()) || Number.isNaN(checkout.getTime())) {
    return 1;
  }

  const diffDays = Math.ceil(
    (checkout.getTime() - checkin.getTime()) / (1000 * 60 * 60 * 24),
  );
  return diffDays <= 0 ? 1 : diffDays;
};

const isSunday = (date) => date.getDay() === 0;

const isPeakSeason = (date) => {
  const month = date.getMonth() + 1;
  // Điều kiện mùa cao điểm có thể điều chỉnh theo quy tắc thực tế của dự án.
  return month === 7 || month === 8 || month === 12;
};

const normalizePrice = (value) => {
  const numberValue = Number(value);
  return Number.isNaN(numberValue) ? 0 : numberValue;
};

const getNightRate = (room, date) => {
  const basePrice = normalizePrice(room.base_price);
  const sundayNormal = normalizePrice(room.price_sunday_normal);
  const peakSeason = normalizePrice(room.price_peak_season);
  const peakSunday = normalizePrice(room.price_peak_sunday);

  if (isSunday(date) && isPeakSeason(date)) {
    return peakSunday || peakSeason || sundayNormal || basePrice;
  }
  if (isPeakSeason(date)) {
    return peakSeason || basePrice;
  }
  if (isSunday(date)) {
    return sundayNormal || basePrice;
  }
  return basePrice;
};

const calculateBookingAmount = (room, checkinDate, checkoutDate) => {
  const checkin = new Date(checkinDate);
  const checkout = new Date(checkoutDate);
  if (
    Number.isNaN(checkin.getTime()) ||
    Number.isNaN(checkout.getTime()) ||
    checkout <= checkin
  ) {
    return normalizePrice(room.base_price);
  }

  const diffMs = checkout.getTime() - checkin.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  if (diffHours > 0 && diffHours < 24 && normalizePrice(room.price_hour) > 0) {
    return normalizePrice(room.price_hour);
  }

  let total = 0;
  const current = new Date(checkin);

  while (current < checkout) {
    total += getNightRate(room, current);
    current.setDate(current.getDate() + 1);
  }

  return total || normalizePrice(room.base_price);
};

const getBookingsByBranch = async (branchId) => {
  const [rows] = await pool.query(
    `SELECT b.*, u.full_name AS customer_name, u.phone,
            (SELECT bd.room_id FROM booking_details bd WHERE bd.booking_id = b.booking_id LIMIT 1) AS room_id
      FROM bookings b
      LEFT JOIN users u ON u.user_id = b.customer_id
      WHERE b.branch_id = ?
      ORDER BY b.created_at DESC`,
    [branchId],
  );
  return rows.map(mapBookingRow);
};

const searchBookings = async (branchId, keyword) => {
  const q = `%${keyword}%`;
  const [rows] = await pool.query(
    `
      SELECT b.*, u.full_name AS customer_name, u.phone,
             (SELECT bd.room_id FROM booking_details bd WHERE bd.booking_id = b.booking_id LIMIT 1) AS room_id
      FROM bookings b
      LEFT JOIN users u ON u.user_id = b.customer_id
      WHERE b.branch_id = ? AND (
        b.booking_id LIKE ? OR
        b.booking_code LIKE ? OR
        u.full_name LIKE ? OR
        u.phone LIKE ?
      )
      ORDER BY b.created_at DESC
    `,
    [branchId, q, q, q, q],
  );
  return rows.map(mapBookingRow);
};

const getBookingById = async (bookingId) => {
  const [rows] = await pool.query(
    `SELECT b.*, u.full_name AS full_name, u.phone,
            (SELECT bd.room_id FROM booking_details bd WHERE bd.booking_id = b.booking_id LIMIT 1) AS room_id
      FROM bookings b
      LEFT JOIN users u ON u.user_id = b.customer_id
      WHERE b.booking_id = ?
      LIMIT 1`,
    [bookingId],
  );
  return rows[0] ? mapBookingRow(rows[0]) : null;
};

const generateBookingCode = () => `BK${Date.now().toString().slice(-8)}`;

const createBooking = async (payload, staffId, routeBranchId = null) => {
  const {
    branch_id,
    room_id,
    checkin_date,
    checkout_date,
    status = "pending",
    note = "",
    customer_name,
    phone,
  } = payload;

  const effectiveBranchId = branch_id || routeBranchId;
  const staff = await ensureStaffRecord(staffId, effectiveBranchId);
  if (!staff) {
    const error = new Error(
      "Người dùng không có quyền nhân viên hoặc chưa được cấp quyền staff",
    );
    error.status = 403;
    throw error;
  }

  const room = await getRoomDetails(room_id);
  if (!room) {
    const error = new Error("Phòng không tồn tại");
    error.status = 400;
    throw error;
  }

  if (room.status && room.status !== "trống") {
    const error = new Error("Phòng hiện không khả dụng để đặt");
    error.status = 400;
    throw error;
  }

  const guestUser = await createGuestUser({ customer_name, phone });
  const customerId = guestUser ? guestUser.user_id : null;

  const bookingPrice = calculateBookingAmount(
    room,
    checkin_date,
    checkout_date,
  );
  const bookingCode = generateBookingCode();
  const bookingStatus = denormalizeBookingStatus(status);

  const [result] = await pool.query(
    `INSERT INTO bookings (booking_code, customer_id, staff_confirm, type_room, branch_id, check_in_date, check_out_date, price_at_booking, status, note, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
    [
      bookingCode,
      customerId,
      staffId,
      room.type_id || 1,
      effectiveBranchId,
      checkin_date,
      checkout_date,
      bookingPrice,
      bookingStatus,
      note,
    ],
  );

  await pool.query(
    `INSERT INTO booking_details (booking_id, room_id) VALUES (?, ?)`,
    [result.insertId, room_id],
  );

  await pool.query(`UPDATE rooms SET status = 'đã đặt' WHERE room_id = ?`, [
    room_id,
  ]);

  return getBookingById(result.insertId);
};

const BOOKING_FIELD_MAP = {
  branch_id: "branch_id",
  customer_id: "customer_id",
  type_room: "type_room",
  checkin_date: "check_in_date",
  checkout_date: "check_out_date",
  actual_check_in: "actual_check_in",
  actual_check_out: "actual_check_out",
  total_amount: "price_at_booking",
  status: "status",
  note: "note",
};

const updateBooking = async (bookingId, payload) => {
  const setParts = [];
  const params = [];

  Object.entries(payload).forEach(([key, value]) => {
    const dbKey = BOOKING_FIELD_MAP[key];
    if (!dbKey || value == null) return;

    if (key === "status") {
      setParts.push(`\`${dbKey}\` = ?`);
      params.push(denormalizeBookingStatus(value));
    } else {
      setParts.push(`\`${dbKey}\` = ?`);
      params.push(value);
    }
  });

  if (!setParts.length) return getBookingById(bookingId);

  params.push(bookingId);
  await pool.query(
    `UPDATE bookings SET ${setParts.join(", ")} WHERE booking_id = ?`,
    params,
  );

  return getBookingById(bookingId);
};

const updateBookingStatus = async (bookingId, status) => {
  await pool.query(`UPDATE bookings SET status = ? WHERE booking_id = ?`, [
    denormalizeBookingStatus(status),
    bookingId,
  ]);
  return getBookingById(bookingId);
};

const checkInBooking = async (bookingId) => {
  await pool.query(
    `UPDATE bookings SET status = 'đã check-in', actual_check_in = NOW() WHERE booking_id = ?`,
    [bookingId],
  );
  return getBookingById(bookingId);
};

const checkOutBooking = async (bookingId) => {
  await pool.query(
    `UPDATE bookings SET status = 'đã check-out', actual_check_out = NOW() WHERE booking_id = ?`,
    [bookingId],
  );
  return getBookingById(bookingId);
};

const getRoomsByBranch = async (branchId) => {
  const [rows] = await pool.query(
    `SELECT r.*, rt.type_name, rt.base_price, rt.base_price AS price, rt.price_sunday_normal,
            rt.price_peak_season, rt.price_peak_sunday, rt.price_hour, rt.capacity
      FROM rooms r
      LEFT JOIN room_types rt ON rt.type_id = r.type_id
      WHERE r.branch_id = ?
      ORDER BY r.room_number`,
    [branchId],
  );
  return rows;
};

const updateRoomStatus = async (roomId, status) => {
  // Kiểm tra ràng buộc: chỉ cho phép cập nhật thành "trống" hoặc "đang dọn"
  // khi booking đã check-out
  if (status === "trống" || status === "đang dọn") {
    const [bookingRows] = await pool.query(
      `SELECT b.status FROM bookings b
       INNER JOIN booking_details bd ON b.booking_id = bd.booking_id
       WHERE bd.room_id = ? AND b.status = 'đã check-out'
       ORDER BY b.created_at DESC LIMIT 1`,
      [roomId],
    );

    if (bookingRows.length === 0) {
      const error = new Error(
        "Không thể cập nhật trạng thái phòng. Booking chưa check-out.",
      );
      error.status = 400;
      throw error;
    }
  }

  await pool.query(`UPDATE rooms SET status = ? WHERE room_id = ?`, [
    status,
    roomId,
  ]);
  const [rows] = await pool.query(`SELECT * FROM rooms WHERE room_id = ?`, [
    roomId,
  ]);
  return rows[0] || null;
};

const updateRoomNote = async (roomId, note) => {
  await pool.query(`UPDATE rooms SET note = ? WHERE room_id = ?`, [
    note,
    roomId,
  ]);
  const [rows] = await pool.query(`SELECT * FROM rooms WHERE room_id = ?`, [
    roomId,
  ]);
  return rows[0] || null;
};

const addBookingService = async (bookingId, payload) => {
  const { service_name, amount } = payload;
  const [result] = await pool.query(
    `INSERT INTO booking_services (booking_id, service_name, amount, created_at) VALUES (?, ?, ?, NOW())`,
    [bookingId, service_name, amount],
  );
  return {
    id: result.insertId,
    booking_id: bookingId,
    service_name,
    amount,
  };
};

const getEmptyRoomStats = async (branchId) => {
  const [[totalRows]] = await pool.query(
    `SELECT COUNT(*) AS total_rooms FROM rooms WHERE branch_id = ?`,
    [branchId],
  );
  const [[emptyRows]] = await pool.query(
    `SELECT COUNT(*) AS empty_rooms FROM rooms WHERE branch_id = ? AND status = 'trống'`,
    [branchId],
  );

  return {
    branch_id: branchId,
    total_rooms: totalRows?.total_rooms || 0,
    empty_rooms: emptyRows?.empty_rooms || 0,
    emptyCount: emptyRows?.empty_rooms || 0,
    occupied_rooms:
      (totalRows?.total_rooms || 0) - (emptyRows?.empty_rooms || 0),
  };
};

const getTodayBookings = async (branchId) => {
  const [rows] = await pool.query(
    `SELECT b.*, u.full_name AS full_name, u.phone,
            (SELECT bd.room_id FROM booking_details bd WHERE bd.booking_id = b.booking_id LIMIT 1) AS room_id
      FROM bookings b
      LEFT JOIN users u ON u.user_id = b.customer_id
      WHERE b.branch_id = ? AND DATE(b.check_in_date) = CURDATE()
      ORDER BY b.check_in_date`,
    [branchId],
  );
  return rows.map(mapBookingRow);
};

const getCurrentGuests = async (branchId) => {
  const [rows] = await pool.query(
    `SELECT b.*, u.full_name AS full_name, u.phone,
            (SELECT bd.room_id FROM booking_details bd WHERE bd.booking_id = b.booking_id LIMIT 1) AS room_id
      FROM bookings b
      LEFT JOIN users u ON u.user_id = b.customer_id
      WHERE b.branch_id = ? AND b.status = 'đã check-in'
      ORDER BY b.actual_check_in`,
    [branchId],
  );
  return rows.map(mapBookingRow);
};

const changeStaffPassword = async (userId, oldPassword, newPassword) => {
  // Lấy thông tin user hiện tại
  const [userRows] = await pool.query(
    `SELECT password FROM users WHERE user_id = ? LIMIT 1`,
    [userId],
  );

  if (userRows.length === 0) {
    const error = new Error("Người dùng không tồn tại");
    error.status = 404;
    throw error;
  }

  const user = userRows[0];

  // Kiểm tra mật khẩu cũ
  const isMatch = await bcrypt.compare(oldPassword, user.password);
  if (!isMatch) {
    const error = new Error("Mật khẩu cũ không đúng");
    error.status = 400;
    throw error;
  }

  // Hash mật khẩu mới
  const hashedNewPassword = await bcrypt.hash(newPassword, 10);

  // Cập nhật mật khẩu mới
  await pool.query(`UPDATE users SET password = ? WHERE user_id = ?`, [
    hashedNewPassword,
    userId,
  ]);

  return { message: "Đổi mật khẩu thành công" };
};

module.exports = {
  getBookingsByBranch,
  searchBookings,
  getBookingById,
  createBooking,
  updateBooking,
  updateBookingStatus,
  checkInBooking,
  checkOutBooking,
  getRoomsByBranch,
  updateRoomStatus,
  updateRoomNote,
  addBookingService,
  getEmptyRoomStats,
  getTodayBookings,
  getCurrentGuests,
  changeStaffPassword,
};
