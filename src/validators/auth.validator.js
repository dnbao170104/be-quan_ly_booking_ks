const isEmail = (value) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
};

const validateRegister = (body) => {
  const errors = [];
  const { username, password, fullName, email, phone } = body;

  if (!username || username.trim().length < 3) {
    errors.push("username tối thiểu 3 ký tự");
  }

  if (!password || password.length < 6) {
    errors.push("password tối thiểu 6 ký tự");
  }

  if (!fullName || fullName.trim().length < 2) {
    errors.push("fullName tối thiểu 2 ký tự");
  }

  if (!email || !isEmail(email)) {
    errors.push("email không hợp lệ");
  }

  if (phone && !/^[0-9]{9,15}$/.test(phone)) {
    errors.push("phone không hợp lệ");
  }

  return errors;
};

const validateLogin = (body) => {
  const errors = [];
  const { username, email, password } = body;

  // Accept cả username hoặc email
  if (!username && !email) {
    errors.push("username hoặc email là bắt buộc");
  }

  if (!password || password.trim() === "") {
    errors.push("password là bắt buộc");
  }

  return errors;
};

const validateForgotPasswordRequest = (body) => {
  const errors = [];
  const { email } = body;

  if (!email || !isEmail(email)) {
    errors.push("email không hợp lệ");
  }

  return errors;
};

const validateForgotPasswordReset = (body) => {
  const errors = [];
  const { email, code, newPassword } = body;

  if (!email || !isEmail(email)) {
    errors.push("email không hợp lệ");
  }

  if (!code || String(code).trim() === "") {
    errors.push("code là bắt buộc");
  }

  if (!newPassword || newPassword.length < 6) {
    errors.push("newPassword tối thiểu 6 ký tự");
  }

  return errors;
};

const validateChangePassword = (body) => {
  const errors = [];
  const { oldPassword, newPassword } = body;

  if (!oldPassword || oldPassword.trim() === "") {
    errors.push("oldPassword là bắt buộc");
  }

  if (!newPassword || newPassword.length < 6) {
    errors.push("newPassword tối thiểu 6 ký tự");
  }

  if (oldPassword && newPassword && oldPassword === newPassword) {
    errors.push("Mật khẩu mới không được trùng mật khẩu cũ");
  }

  return errors;
};

module.exports = {
  validateRegister,
  validateLogin,
  validateForgotPasswordRequest,
  validateForgotPasswordReset,
  validateChangePassword,
};
