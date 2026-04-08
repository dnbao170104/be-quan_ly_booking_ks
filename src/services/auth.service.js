// Import thư viện bâm mã (dùng để mã hóa mật khẩu)
const bcrypt = require("bcryptjs");
// Import thư viện tạo ID ngẫu nhiên không trùng lặp (UUID)
const { v4: uuidv4 } = require("uuid");
// Kết nối DB
const pool = require("../config/db");
// Tiện ích ký mã token JWT để xác thực user
const { signAccessToken } = require("../utils/jwt");

// ID mặc định cho vai trò USER (khách hàng bình thường)
const USER_ROLE_ID = 3;

// Hàm lấy user theo username. Nối bảng user và bảng roles
const getUserByUsername = async (username) => {
  const [rows] = await pool.query(
    `
      SELECT u.user_id, u.username, u.password, u.full_name, u.email, u.phone, u.address,
             u.role_id, u.is_active, r.role_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.role_id
      WHERE u.username = ?
      LIMIT 1
    `,
    [username],
  );
  return rows[0] || null;
};

// Hàm lấy user theo email
const getUserByEmail = async (email) => {
  const [rows] = await pool.query(
    `
      SELECT u.user_id, u.username, u.password, u.full_name, u.email, u.phone, u.address,
             u.role_id, u.is_active, r.role_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.role_id
      WHERE u.email = ?
      LIMIT 1
    `,
    [email],
  );
  return rows[0] || null;
};

// Hàm lấy thông tin user theo ID, ẩn đi thông tin nhạy cảm password
const getUserById = async (userId) => {
  const [rows] = await pool.query(
    `
      SELECT u.user_id, u.username, u.full_name, u.email, u.phone, u.address,
             u.role_id, u.is_active, u.created_at, r.role_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.role_id
      WHERE u.user_id = ?
      LIMIT 1
    `,
    [userId],
  );
  return rows[0] || null;
};

// Core logic: Đăng ký thành viên
const register = async (payload) => {
  const { username, password, fullName, email, phone, address } = payload;

  // 1. Kiểm tra tài khoản đã trùng lặp chưa
  const existingUsername = await getUserByUsername(username);
  if (existingUsername) {
    throw {
      status: 409,
      message: "Username đã tồn tại",
      errors: ["username already exists"],
    };
  }

  // 2. Kiểm tra email bị trùng chưa
  const existingEmail = await getUserByEmail(email);
  if (existingEmail) {
    throw {
      status: 409,
      message: "Email đã tồn tại",
      errors: ["email already exists"],
    };
  }

  // 3. Tạo ID và mã hóa mật khẩu trước khi lưu
  const userId = uuidv4();
  const hashedPassword = await bcrypt.hash(password, 10); // hash độ mạnh 10

  // 4. Lưu dòng mới vào csdl users
  await pool.query(
    `
      INSERT INTO users
      (user_id, username, password, full_name, email, phone, address, role_id, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      userId,
      username.trim(),
      hashedPassword,
      fullName.trim(),
      email.trim(),
      phone || null,
      address || null,
      USER_ROLE_ID,
      1,
    ],
  );

  return await getUserById(userId);
};

// Core logic: Xác thực đăng nhập
const login = async (payload) => {
  const { username, email, password } = payload;

  // 1. Kiểm tra xem user tồn tại không - support email hoặc username
  let user;
  if (email) {
    user = await getUserByEmail(email);
  } else if (username) {
    user = await getUserByUsername(username);
  }

  if (!user) {
    throw {
      status: 401,
      message: "Sai tài khoản hoặc mật khẩu",
      errors: ["invalid credentials"],
    };
  }

  // 2. Chặn nếu tài khoản bị khoá
  if (!user.is_active) {
    throw {
      status: 403,
      message: "Tài khoản đã bị khóa",
      errors: ["account inactive"],
    };
  }

  // 3. Chỉ cho phép nhân viên đăng nhập
  if (Number(user.role_id) !== 2) {
    throw {
      status: 403,
      message: "Chỉ tài khoản nhân viên mới được phép đăng nhập",
      errors: ["forbidden_role"],
    };
  }

  // 4. So khớp hash password với chuỗi nguyên bản
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw {
      status: 401,
      message: "Sai tài khoản hoặc mật khẩu",
      errors: ["invalid credentials"],
    };
  }

  // 4. Tạo Object chứa thông tin cần lưu trong token
  const token = signAccessToken({
    userId: user.user_id,
    username: user.username,
    roleId: user.role_id,
    roleName: user.role_name,
  });

  // Trả về token kèm cục thông tin chi tiết user
  return {
    accessToken: token,
    user: {
      user_id: user.user_id,
      username: user.username,
      full_name: user.full_name,
      email: user.email,
      phone: user.phone,
      address: user.address,
      role_id: user.role_id,
      role_name: user.role_name,
    },
  };
};

// Logic: Đăng xuất (chủ yếu thao tác bên FE xoá token do dùng JWT stateless, bên này chỉ trả về text)
const logout = async () => {
  return { message: "Đăng xuất thành công" };
};

// Logic: Yêu cầu lấy mật khẩu qua Email (tạo OTP)
const forgotPasswordRequest = async ({ email }) => {
  // Tìm email có trong hệ thống không
  const user = await getUserByEmail(email);
  if (!user) {
    throw {
      status: 404,
      message: "Không tìm thấy tài khoản với email này",
      errors: ["email not found"],
    };
  }

  // Tạo code 6 số random
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresMinutes = Number(
    process.env.FORGOT_PASSWORD_EXPIRES_MINUTES || 15,
  );

  // Xoá mã code cũ (nếu có) trước khi tạo mã mới cho user này
  await pool.query(`DELETE FROM forgot_pass WHERE id_user = ?`, [user.user_id]);

  // Lưu mã code OTP mới vào db
  await pool.query(
    `
      INSERT INTO forgot_pass (id_user, create_at, expired_at, code_confirm)
      VALUES (?, NOW(), DATE_ADD(NOW(), INTERVAL ? MINUTE), ?)
    `,
    [user.user_id, expiresMinutes, code],
  );

  return {
    email: user.email,
    code_confirm: code,
    note: "Local test: tạm trả code về để test. Server thật thì sẽ gọi hàm gửi SMS / Email thay vì hiện mã code ra đây",
  };
};

// Logic: Reset password theo mã OTP
const forgotPasswordReset = async ({ email, code, newPassword }) => {
  const user = await getUserByEmail(email);
  if (!user) {
    throw {
      status: 404,
      message: "Không tìm thấy tài khoản",
      errors: ["email not found"],
    };
  }

  // Lấy dòng kiểm tra OTP và xem mã còn hạn sử dụng không
  const [rows] = await pool.query(
    `SELECT * FROM forgot_pass WHERE id_user = ? AND code_confirm = ? AND expired_at >= NOW() ORDER BY create_at DESC LIMIT 1`,
    [user.user_id, String(code)],
  );

  if (!rows[0]) {
    throw {
      status: 400,
      message: "Mã xác nhận không đúng hoặc đã hết hạn",
      errors: ["invalid code"],
    };
  }

  // Đổi mật khẩu thành công: Tạo hash và cập nhật
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await pool.query(`UPDATE users SET password = ? WHERE user_id = ?`, [
    hashedPassword,
    user.user_id,
  ]);

  // Xoá OTP đó đi
  await pool.query(`DELETE FROM forgot_pass WHERE id_user = ?`, [user.user_id]);

  return { user_id: user.user_id, email: user.email };
};

// Logic: Tự đổi password (cần biết pass cũ)
const changePassword = async ({ userId, oldPassword, newPassword }) => {
  const [rows] = await pool.query(
    `SELECT user_id, password FROM users WHERE user_id = ? LIMIT 1`,
    [userId],
  );
  const user = rows[0];

  if (!user) {
    throw {
      status: 404,
      message: "Không tìm thấy người dùng",
      errors: ["user not found"],
    };
  }

  // Bắt buộc xác thực mật khẩu cũ
  const isMatch = await bcrypt.compare(oldPassword, user.password);
  if (!isMatch) {
    throw {
      status: 400,
      message: "Mật khẩu cũ không đúng",
      errors: ["old password incorrect"],
    };
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await pool.query(`UPDATE users SET password = ? WHERE user_id = ?`, [
    hashedPassword,
    userId,
  ]);

  return { user_id: userId };
};

// Logic: Cập nhật thông tin hồ sơ
const updateProfile = async (userId, payload) => {
  const { full_name, email, phone, address } = payload;

  // Nếu có đổi email, check xem email đã có ai dùng chưa
  if (email) {
    const existing = await getUserByEmail(email);
    // Nếu có email nhưng ID ko phải của ông hiện tại (tức là 1 ô khác giữ email này rồi)
    if (existing && existing.user_id !== userId) {
      throw {
        status: 409,
        message: "Email đã được sử dụng bởi tài khoản khác",
        errors: ["email exists"],
      };
    }
  }

  // Áp dụng đổi thông tin
  await pool.query(
    `UPDATE users SET full_name = ?, email = ?, phone = ?, address = ? WHERE user_id = ?`,
    [full_name || null, email || null, phone || null, address || null, userId],
  );
  return await getUserById(userId);
};

module.exports = {
  register,
  login,
  logout,
  forgotPasswordRequest,
  forgotPasswordReset,
  changePassword,
  updateProfile,
  getUserById,
};
