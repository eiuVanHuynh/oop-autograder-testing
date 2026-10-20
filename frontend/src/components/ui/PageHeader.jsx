// Khung đầu trang: breadcrumb, tiêu đề, mô tả, chỗ trống bên phải cho nút hành động.
// Page header frame: breadcrumb, title, description, right-hand slot for action buttons.
//
// Cần làm / To do:
// - breadcrumb: mảng chuỗi, nối bằng dấu "/", chữ nhỏ màu xám (xem ảnh 04-dashboard).
// - actions: nơi trang truyền nút "+ New Test", "Export CSV"… vào.
export default function PageHeader({ breadcrumb = [], title, description, actions }) {
  return (
    <div className="mb-6">
      {/* TODO: breadcrumb */}
      <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      {/* TODO: description + actions xếp cùng hàng với tiêu đề */}
    </div>
  );
}
