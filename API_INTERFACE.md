# Giao diện API Backend

Tài liệu này mô tả các endpoint hiện có trong backend `be-nhom4`, bao gồm các route `auth`, `branches`, `staff`.

## Cấu trúc chung response

- Thành công:

```json
{
  "success": true,
  "message": "Thông báo thành công",
  "data": { ... }
}
```

- Lỗi:

```json
{
  "success": false,
  "message": "Thông báo lỗi",
  "errors": [...]
}
```

## 1. Auth

### POST /api/auth/register

- Mô tả: Đăng ký tài khoản mới
- Body:

```json
{
  "username": "user01",
  "password": "123456",
  "fullName": "Nguyen Van A",
  "email": "a@example.com",
  "phone": "0123456789",
  "address": "Hanoi"
}
```

- Response data: thông tin user vừa tạo (không trả về password)

### POST /api/auth/login

- Mô tả: Đăng nhập bằng `username` hoặc `email`
- Body:

```json
{
  "username": "user01",
  "password": "123456"
}
```

hoặc

```json
{
  "email": "a@example.com",
  "password": "123456"
}
```

- Response data:

```json
{
  "accessToken": "...",
  "user": { ... }
}
```

### POST /api/auth/logout

- Mô tả: Đăng xuất (backend hiện trả về thông báo, frontend tự xóa token)
- Body: không cần

### POST /api/auth/forgot-password/request

- Mô tả: Yêu cầu tạo mã reset mật khẩu
- Body:

```json
{
  "email": "a@example.com"
}
```

- Response data: trả về mã xác nhận trong môi trường test local

### POST /api/auth/forgot-password/reset

- Mô tả: Đặt lại mật khẩu bằng mã xác nhận
- Body:

```json
{
  "email": "a@example.com",
  "code": "123456",
  "newPassword": "newpass123"
}
```

### POST /api/auth/change-password

- Mô tả: Đổi mật khẩu khi đã đăng nhập
- Header: `Authorization: Bearer <token>`
- Body:

```json
{
  "oldPassword": "123456",
  "newPassword": "newpass123"
}
```

### GET /api/auth/me

- Mô tả: Lấy thông tin user hiện tại
- Header: `Authorization: Bearer <token>`
- Response data: thông tin user

### PUT /api/auth/profile

- Mô tả: Cập nhật hồ sơ user
- Header: `Authorization: Bearer <token>`
- Body:

```json
{
  "full_name": "Nguyen Van A",
  "email": "a@example.com",
  "phone": "0987654321",
  "address": "Ho Chi Minh"
}
```

## 2. Branches

### GET /api/branches

- Mô tả: Lấy danh sách tất cả chi nhánh
- Header: không cần

### GET /api/branches/:id

- Mô tả: Lấy chi tiết chi nhánh theo `id`
- Header: không cần

## 3. Staff

Tất cả endpoint phần `staff` đều yêu cầu xác thực bằng `Authorization: Bearer <token>`.

### GET /api/staff/branches/:branchId/bookings

- Mô tả: Lấy danh sách booking của chi nhánh

### GET /api/staff/branches/:branchId/bookings/search?q=xxx

- Mô tả: Tìm booking theo chuỗi keyword
- Query param: `q`

### GET /api/staff/branches/:branchId/bookings/today

- Mô tả: Lấy booking có ngày check-in hôm nay

### GET /api/staff/branches/:branchId/guests/current

- Mô tả: Lấy danh sách khách đang ở (status `đã check-in`)

### GET /api/staff/bookings/:id

- Mô tả: Lấy chi tiết một booking theo `id`

### POST /api/staff/branches/:branchId/bookings

- Mô tả: Tạo booking mới
- Body mẫu:

```json
{
  "branch_id": 1,
  "room_id": 101,
  "checkin_date": "2026-05-01",
  "checkout_date": "2026-05-03",
  "status": "pending",
  "total_amount": 1500000,
  "note": "Yêu cầu phòng 2 giường",
  "type_room": 1
}
```

### PUT /api/staff/bookings/:id

- Mô tả: Cập nhật thông tin booking
- Body: các trường cần sửa, ví dụ:

```json
{
  "checkin_date": "2026-05-02",
  "checkout_date": "2026-05-04",
  "status": "confirmed",
  "note": "Cập nhật giờ đến"
}
```

### POST /api/staff/bookings/:id/confirm

- Mô tả: Xác nhận booking

### POST /api/staff/bookings/:id/reject

- Mô tả: Từ chối booking

### POST /api/staff/bookings/:id/checkin

- Mô tả: Check-in booking

### POST /api/staff/bookings/:id/checkout

- Mô tả: Check-out booking

### POST /api/staff/bookings/:id/cancel

- Mô tả: Hủy booking

### POST /api/staff/bookings/:id/services

- Mô tả: Thêm dịch vụ phát sinh cho booking
- Body:

```json
{
  "service_name": "Dọn phòng thêm",
  "amount": 200000
}
```

### GET /api/staff/branches/:branchId/rooms

- Mô tả: Lấy danh sách phòng của chi nhánh

### PATCH /api/staff/rooms/:id/status

- Mô tả: Cập nhật trạng thái phòng
- Body:

```json
{
  "status": "trống"
}
```

### PATCH /api/staff/rooms/:id/note

- Mô tả: Cập nhật ghi chú phòng
- Body:

```json
{
  "note": "Phòng cần vệ sinh"
}
```

### GET /api/staff/branches/:branchId/rooms/stats

- Mô tả: Lấy thống kê phòng trống / total / occupied của chi nhánh

---

## Ghi chú

- Các endpoint `staff` yêu cầu token JWT trong header `Authorization: Bearer <token>`.
- Endpoint `auth/logout` chỉ trả về thông báo; frontend cần xóa token trên client.
- Một số endpoint sử dụng dữ liệu nội bộ (`status` chuyển đổi giữa tiếng Việt và tiếng Anh trong service).
