// Thanh lọc: nút tải lại, ô tìm kiếm, filter riêng của từng trang truyền vào qua children.
// Filter bar: refresh button, search box, page-specific filters passed in via children.
import { Search, RefreshCw } from "lucide-react";

export default function FilterBar({
  value,
  onChange,
  placeholder = "Tìm kiếm…",
  onRefresh,
  loading = false,
  children,
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex flex-wrap items-center gap-3">
      {onRefresh && (
        <button
          type="button"
          onClick={onRefresh}
          title="Refresh"
          className="p-2.5 text-gray-500 hover:text-brand-600 border border-gray-200 rounded-xl"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
        </button>
      )}

      <div className="relative flex-1 min-w-[220px]">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-9 pr-3 py-2.5 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {children}
    </div>
  );
}
