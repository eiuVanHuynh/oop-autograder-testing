// Khung đầu trang: breadcrumb, tiêu đề, mô tả, chỗ trống bên phải cho nút hành động.
// Page header frame: breadcrumb, title, description, right-hand slot for action buttons.
//
// Cần làm / To do:
// - breadcrumb: mảng chuỗi, nối bằng dấu "/", chữ nhỏ màu xám (xem ảnh 04-dashboard).
// - actions: nơi trang truyền nút "+ New Test", "Export CSV"… vào.

import { ChevronRight } from 'lucide-react';

export default function PageHeader({ breadcrumb = [], title, description, actions }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
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
        {/* m-0 + font-bold + tracking-tight để ghi đè rule h1 (56px, margin 32px) trong index.css */}
        <h1 className="m-0 text-[28px] font-bold leading-9 tracking-tight text-slate-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-3">{actions}</div>}
    </div>
  );
}
