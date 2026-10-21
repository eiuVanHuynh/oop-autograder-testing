// Cửa 3: kiểm dữ liệu vào bằng zod trước khi tới controller.
// Gate 3: validate the incoming data with zod before the controller runs.
//
// Cần làm / To do:
// - validate(schema, 'body' | 'query' | 'params'); không khớp → 400 kèm details.
// - Gán lại dữ liệu đã parse vào req, để controller dùng bản đã ép kiểu.
// - Schema để ở validators/, không viết thẳng trong route.
module.exports = (schema, source = 'body') => (req, res, next) => {
  // TODO
};
