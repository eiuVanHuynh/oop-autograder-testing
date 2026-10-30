// Menu "…" ở cuối mỗi dòng bảng, gom các thao tác ít dùng / nguy hiểm (tắt, xoá).
// Row "…" menu holding the rarer / destructive actions (deactivate, delete).
//
//   <RowMenu items={[{ label: "Delete", icon: Trash2, onClick: fn, danger: true }]} />
import { useState, useEffect, useRef } from "react";
import { MoreHorizontal } from "lucide-react";

export default function RowMenu({ items }) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        title="More actions"
        className="p-2 text-gray-500 hover:text-brand-600"
      >
        <MoreHorizontal size={16} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-44 bg-white rounded-xl border border-gray-200 shadow-lg py-1 z-30 text-left">
          {items.map(({ label, icon: Icon, onClick, danger }) => (
            <button
              key={label}
              type="button"
              onClick={() => {
                setIsOpen(false);
                onClick();
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 ${
                danger ? "text-red-600" : "text-gray-700"
              }`}
            >
              {Icon && <Icon size={15} />}
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
