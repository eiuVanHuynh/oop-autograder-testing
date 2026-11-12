// Phân trang dùng chung, đặt ở chân bảng.
// Shared pagination, placed at the foot of a table.
import { ChevronLeft, ChevronRight } from "lucide-react";

const navCls =
  "p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:text-brand-600 hover:border-brand-600 disabled:opacity-40 disabled:hover:text-gray-500 disabled:hover:border-gray-200 disabled:cursor-not-allowed";

export default function Pagination({ page = 1, pageCount = 1, total, onChange }) {
  return (
    <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
      <span>{total ?? 0} rows</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className={navCls}
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          title="Previous page"
          aria-label="Previous page"
        >
          <ChevronLeft size={14} />
        </button>
        <span className="font-medium text-gray-600">
          {page} / {pageCount}
        </span>
        <button
          type="button"
          className={navCls}
          disabled={page >= pageCount}
          onClick={() => onChange(page + 1)}
          title="Next page"
          aria-label="Next page"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
