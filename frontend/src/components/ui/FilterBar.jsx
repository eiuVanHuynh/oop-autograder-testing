// Thanh lọc: ô tìm kiếm bên trái, filter riêng của từng trang truyền vào qua children.
// Filter bar: search box on the left, page-specific filters passed in via children.
//
// Cần làm / To do:
// - Ô tìm kiếm có icon Search nằm trong input (absolute), bo tròn, focus ring brand-500.
// - children: dropdown trạng thái / phạm vi / khoảng ngày, nút "Reset filters".
export default function FilterBar({ value, onChange, placeholder = 'Tìm kiếm…', children }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-3 flex flex-wrap items-center gap-3">
      {/* TODO: input tìm kiếm + icon */}
      {children}
    </div>
  );
}
