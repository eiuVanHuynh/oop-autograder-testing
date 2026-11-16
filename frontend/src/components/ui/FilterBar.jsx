// Thanh lọc: nút tải lại, filter riêng của từng trang (children), ô tìm kiếm, rồi `trailing`.
// Filter bar: refresh, page filters (children), the search box, then `trailing`.
// `trailing` dành cho thứ không phải bộ lọc — hiện là nút đổi bảng ↔ thẻ, để nó không phải
// chiếm một dải riêng phía trên bảng.
//
// Truyền thêm `tagGroups` (CHÍNH mảng groups đang đưa cho FilterMenu bên cạnh) thì ô search
// gợi ý tag của đúng panel Filter đó: chọn một tag = ghép label vào `value`, mà parseQuery
// ở phía trang đọc lại thành filter đã tick. Không truyền thì ô search hoạt động như cũ.
import { useState, useEffect, useRef, useMemo } from "react";
import { Search, RefreshCw, X } from "lucide-react";
import {
  parseQuery,
  buildQuery,
  suggestTags,
  textAfterPick,
  pickedTags,
} from "../../models/searchTags";

export default function FilterBar({
  value,
  onChange,
  placeholder = "Tìm kiếm…",
  onRefresh,
  loading = false,
  tagGroups,
  trailing,
  children,
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const boxRef = useRef(null);
  const inputRef = useRef(null);

  // Chip và dòng gợi ý là <button>: bấm vào là focus rời input, mà ngay sau đó button biến
  // mất nên focus rơi ra ngoài và người dùng phải bấm lại ô search. Chặn ở mousedown.
  const keepFocus = (e) => e.preventDefault();

  // Tag tách khỏi free text: chip hiện trong ô search, input chỉ còn phần chữ tự do.
  const { filters, text, chips, tags } = useMemo(() => {
    if (!tagGroups?.length)
      return { filters: {}, text: value, chips: [], tags: [] };
    const { filters, text } = parseQuery(value, tagGroups);
    return {
      filters,
      text,
      chips: pickedTags(filters, tagGroups),
      tags: suggestTags(text, filters, tagGroups),
    };
  }, [value, tagGroups]);

  const addTag = (t) =>
    buildQuery(
      { ...filters, [t.key]: [...(filters[t.key] || []), t.value] },
      textAfterPick(text, t.label),
      tagGroups,
    );

  const dropTag = (t) =>
    buildQuery(
      { ...filters, [t.key]: filters[t.key].filter((v) => v !== t.value) },
      text,
      tagGroups,
    );

  useEffect(() => {
    const onClickOutside = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const pick = (tag) => {
    onChange(addTag(tag));
    setOpen(false);
    setActive(0);
    inputRef.current?.focus();
  };

  const drop = (tag) => {
    onChange(dropTag(tag));
    inputRef.current?.focus();
  };

  const onKeyDown = (e) => {
    // Backspace ở ô chữ trống thì nhả chip cuối, như mọi ô nhập tag khác.
    if (e.key === "Backspace" && !text && chips.length)
      return drop(chips[chips.length - 1]);
    if (!open || tags.length === 0) return;
    if (e.key === "Escape") return setOpen(false);
    if (e.key === "ArrowDown")
      return (e.preventDefault(), setActive((i) => (i + 1) % tags.length));
    if (e.key === "ArrowUp")
      return (
        e.preventDefault(),
        setActive((i) => (i - 1 + tags.length) % tags.length)
      );
    if (e.key === "Enter" && tags[active]) {
      e.preventDefault();
      pick(tags[active]);
    }
  };

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

      {children}

      <div className="relative flex-1 min-w-[220px]" ref={boxRef}>
        {/* Viền và vòng focus nằm ở khung ngoài để chip ngồi chung một ô với chữ. */}
        <div className="w-full flex flex-wrap items-center gap-1.5 pl-9 pr-3 py-1.5 min-h-[42px] bg-white border border-gray-300 rounded-xl focus-within:ring-2 focus-within:ring-brand-500">
          <Search
            size={16}
            className="absolute left-3 top-[13px] text-gray-400"
          />
          {chips.map((t) => (
            <span
              key={`${t.key}:${t.value}`}
              title={t.groupLabel}
              className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 bg-brand-100 text-brand-700 rounded-md text-xs font-medium"
            >
              {t.label}
              <button
                type="button"
                aria-label={`Remove ${t.label}`}
                onMouseDown={keepFocus}
                onClick={() => drop(t)}
                className="text-brand-500 hover:text-brand-800"
              >
                <X size={12} />
              </button>
            </span>
          ))}
          <input
            value={text}
            onChange={(e) => {
              onChange(buildQuery(filters, e.target.value, tagGroups || []));
              setActive(0);
              setOpen(true);
            }}
            ref={inputRef}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            placeholder={chips.length ? "" : placeholder}
            className="flex-1 min-w-[80px] py-1 bg-transparent text-sm focus:outline-none"
          />
        </div>

        {open && tags.length > 0 && (
          <div className="absolute left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white rounded-xl border border-gray-200 shadow-lg py-1 z-30">
            {tags.map((t, i) => (
              <button
                key={`${t.key}:${t.value}`}
                type="button"
                onMouseEnter={() => setActive(i)}
                onMouseDown={keepFocus}
                onClick={() => pick(t)}
                className={`w-full flex items-center justify-between gap-3 px-3 py-2 text-sm text-left ${
                  i === active ? "bg-brand-50 text-brand-700" : "text-gray-700"
                }`}
              >
                <span className="truncate">{t.label}</span>
                <span className="text-xs text-gray-400 shrink-0">
                  {t.groupLabel}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {trailing}
    </div>
  );
}
