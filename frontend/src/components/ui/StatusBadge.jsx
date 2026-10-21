// Nhãn trạng thái dùng chung cho mọi bảng.
// Shared status pill for every table.
//
// Cần làm / To do:
// - Bảng màu theo trạng thái: PASSED xanh lá, FAILED đỏ, RUNNING hổ phách, QUEUED xám,
//   ACTIVE xanh lá, LOCKED đỏ. Trạng thái lạ thì rơi về màu xám.
// - Hằng số trạng thái ở frontend luôn viết HOA; DB viết thường, đổi ở backend/src/utils/mappers.js.
export default function StatusBadge({ status }) {
  return (
    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
      {status}
    </span>
  );
}
