// Nút "Filter" mở bảng chọn: mỗi nhóm là một dãy option box, tick được nhiều giá trị.
// Filter button opening a panel: one row of option boxes per group, multi-select.
//
// Dùng chung cho Templates và Test Cases:
//   <FilterMenu
//     groups={[{ key: "scope", label: "Test scope", allLabel: "All scopes", options: SCOPES }]}
//     value={{ scope: ["API"] }}
//     onChange={setFilters}
//   />
// options: mảng chuỗi, hoặc mảng { value, label }. Mảng rỗng trong value = không lọc nhóm đó.
import { useState, useEffect, useRef } from "react";
import { Filter, ChevronDown } from "lucide-react";

const toOption = (o) => (typeof o === "object" ? o : { value: o, label: o });

export const FilterPill = ({ active, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    className={`px-3 py-1.5 rounded-full border text-sm transition ${
      active
        ? "border-brand-600 bg-brand-50 text-brand-700 font-medium"
        : "border-gray-200 text-gray-600 hover:border-gray-300"
    }`}
  >
    {children}
  </button>
);

export default function FilterMenu({ groups, value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);
  const activeCount = groups.reduce(
    (n, g) => n + (value[g.key]?.length || 0),
    0,
  );

  // Bỏ tick nếu đang chọn, thêm vào nếu chưa – mỗi nhóm lọc theo kiểu "hoặc".
  const toggle = (key, v) => {
    const cur = value[key] || [];
    onChange({
      ...value,
      [key]: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v],
    });
  };

  const clearAll = () =>
    onChange(Object.fromEntries(groups.map((g) => [g.key, []])));

  useEffect(() => {
    const onClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:border-gray-300"
      >
        <Filter size={16} className="text-gray-400" />
        Filter
        {activeCount > 0 && (
          <span className="px-1.5 py-0.5 bg-brand-600 text-white rounded-full text-xs">
            {activeCount}
          </span>
        )}
        <ChevronDown size={14} className="text-gray-400" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-[420px] max-w-[85vw] max-h-[70vh] overflow-y-auto bg-white rounded-2xl border border-gray-200 shadow-lg p-4 space-y-4 z-30">
          {groups.map((g) => {
            const picked = value[g.key] || [];
            return (
              <div key={g.key}>
                <p className="text-sm font-semibold text-gray-900 border-b border-gray-100 pb-2 mb-3">
                  {g.label}
                </p>
                <div className="flex flex-wrap gap-2">
                  <FilterPill
                    active={picked.length === 0}
                    onClick={() => onChange({ ...value, [g.key]: [] })}
                  >
                    {g.allLabel}
                  </FilterPill>
                  {g.options.map(toOption).map((o) => (
                    <FilterPill
                      key={o.value}
                      active={picked.includes(o.value)}
                      onClick={() => toggle(g.key, o.value)}
                    >
                      {o.label}
                    </FilterPill>
                  ))}
                </div>
              </div>
            );
          })}

          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={clearAll}
              className="text-sm text-gray-500 hover:text-gray-800"
            >
              Clear all
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
