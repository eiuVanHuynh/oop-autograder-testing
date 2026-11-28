// Khung đầu trang: breadcrumb, tiêu đề, mô tả, chỗ trống bên phải cho nút hành động.
// Page header frame: breadcrumb, title, description, right-hand slot for action buttons.
//
// Cần làm / To do:
// - breadcrumb: mảng chuỗi, nối bằng dấu "/", chữ nhỏ màu xám (xem ảnh 04-dashboard).
// - actions: nơi trang truyền nút "+ New Test", "Export CSV"… vào.

import { ChevronRight } from 'lucide-react';

// Không có margin dưới: khoảng cách tới khối sau do .page (gap) lo, có thêm mb-6 là cộng hai lần.
// flex-wrap + min-w-0: tiêu đề dài không ép bẹp nút hành động ở màn hẹp — đúng cái lỗi của 6 khối
// header viết tay mà component này thay thế (chúng dùng "flex items-center justify-between" trơn).
export default function PageHeader({ breadcrumb = [], title, description, actions }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {breadcrumb.length > 0 && (
          <nav aria-label="Breadcrumb" className="mb-1 flex items-center gap-1 text-xs text-slate-500">
            {breadcrumb.map((item, i) => (
              <span key={`${item}-${i}`} className="flex items-center gap-1">
                {i > 0 && <ChevronRight size={12} className="text-slate-400" />}
                <span className={i === breadcrumb.length - 1 ? 'font-medium text-brand-600' : ''}>
                  {item}
                </span>
              </span>
            ))}
          </nav>
        )}
        {/* .page-title: cỡ / nét / giãn chữ là token theo theme (src/index.css), và nó cũng
            ghi đè rule h1 (56px, margin 32px). Trước đây chỗ này là 28px còn 6 trang tự viết
            header dùng 30px — cùng một thứ mà ba cỡ. */}
        <h1 className="page-title">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-3">{actions}</div>}
    </div>
  );
}
