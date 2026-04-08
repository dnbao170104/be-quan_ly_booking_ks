const isValidDate = (value) => !isNaN(new Date(value).getTime());

const validateBookingData = (body) => {
  const errors = [];
  const { customer_name, phone, room_id, checkin_date, checkout_date, branch_id } = body;

  if (!branch_id) {
    errors.push('branch_id là bắt buộc');
  }

  if (!customer_name || customer_name.trim().length < 2) {
    errors.push('customer_name tối thiểu 2 ký tự');
  }

  if (!phone || !/^\+?[0-9]{9,15}$/.test(phone)) {
    errors.push('phone không hợp lệ');
  }

  if (!room_id) {
    errors.push('room_id là bắt buộc');
  }

  if (!checkin_date || !isValidDate(checkin_date)) {
    errors.push('checkin_date không hợp lệ');
  }

  if (!checkout_date || !isValidDate(checkout_date)) {
    errors.push('checkout_date không hợp lệ');
  }

  if (checkin_date && checkout_date && new Date(checkin_date) > new Date(checkout_date)) {
    errors.push('checkout_date phải lớn hơn hoặc bằng checkin_date');
  }

  return errors;
};

const validateRoomStatus = (body) => {
  const errors = [];
  const { status } = body;

  if (!status || typeof status !== 'string' || status.trim() === '') {
    errors.push('status là bắt buộc');
  }

  return errors;
};

const validateServiceData = (body) => {
  const errors = [];
  const { service_name, amount } = body;

  if (!service_name || service_name.trim().length < 2) {
    errors.push('service_name tối thiểu 2 ký tự');
  }

  if (amount == null || Number(amount) < 0) {
    errors.push('amount phải là số >= 0');
  }

  return errors;
};

module.exports = {
  validateBookingData,
  validateRoomStatus,
  validateServiceData
};