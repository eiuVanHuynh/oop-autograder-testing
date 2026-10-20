// Cửa 1 của chuỗi: xác thực JWT rồi gắn req.user = { id, role }.
// Gate 1 of the chain: verify the JWT, then attach req.user = { id, role }.
//
// Cần làm / To do:
// - Đọc header `Authorization: Bearer <token>`; thiếu hoặc sai → 401.
// - Token hợp lệ nhưng tài khoản đang bị khóa → 423 (xem api-endpoints.md mục 0).
// - Chỉ gắn id và role vào req.user, đừng gắn cả bản ghi user.
module.exports = (req, res, next) => {
  // TODO
};
