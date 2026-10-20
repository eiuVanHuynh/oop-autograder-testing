// Phân trang dùng chung, đặt ở chân bảng.
// Shared pagination, placed at the foot of a table.
//
// Cần làm / To do:
// - Trái: "Tổng N dòng". Phải: nút lùi / "trang / tổng trang" / nút tiến.
// - Nhớ disable nút lùi khi page <= 1 và nút tiến khi page >= pageCount,
//   nếu không nút tiến sẽ bấm được mãi và gọi onChange vượt quá số trang.
export default function Pagination({ page = 1, pageCount = 1, total, onChange }) {
  return (
    <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
      {/* TODO: tổng số dòng + cụm nút lùi/tiến */}
    </div>
  );
}
