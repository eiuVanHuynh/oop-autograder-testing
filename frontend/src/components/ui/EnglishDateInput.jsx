// Ô chọn ngày / tháng luôn hiển thị tiếng Anh, không phụ thuộc ngôn ngữ trình duyệt.
// <input type="date|month"> gốc lấy ngôn ngữ từ trình duyệt/OS nên không ép được bằng code.
// value: "YYYY-MM-DD" (mode="date") hoặc "YYYY-MM" (mode="month") — giống input gốc.
import { useEffect, useMemo, useRef, useState } from "react";
import { Calendar, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const pad = (n) => String(n).padStart(2, "0");

function parse(value, mode) {
  const m = String(value || "").match(/^(\d{4})-(\d{2})(?:-(\d{2}))?/);
  if (!m) return null;
  return { y: +m[1], m: +m[2] - 1, d: mode === "date" ? +(m[3] || 1) : 1 };
}

export default function EnglishDateInput({
  value,
  onChange,
  mode = "date", // "date" | "month"
  className = "",
}) {
  const sel = parse(value, mode);
  const today = new Date();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState({
    y: sel?.y ?? today.getFullYear(),
    m: sel?.m ?? today.getMonth(),
  });
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const esc = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const toggle = () => {
    if (!open && sel) setView({ y: sel.y, m: sel.m });
    setOpen((o) => !o);
  };

  const label = sel
    ? mode === "date"
      ? `${MONTHS[sel.m].slice(0, 3)} ${sel.d}, ${sel.y}`
      : `${MONTHS[sel.m]} ${sel.y}`
    : mode === "date"
      ? "Select date"
      : "Select month";

  const cells = useMemo(() => {
    if (mode !== "date") return [];
    const first = new Date(view.y, view.m, 1).getDay();
    const days = new Date(view.y, view.m + 1, 0).getDate();
    return [
      ...Array(first).fill(null),
      ...Array.from({ length: days }, (_, i) => i + 1),
    ];
  }, [view, mode]);

  const shiftMonth = (delta) =>
    setView((v) => {
      const d = new Date(v.y, v.m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  const shiftYear = (delta) => setView((v) => ({ ...v, y: v.y + delta }));

  const pickDay = (d) => {
    onChange?.(`${view.y}-${pad(view.m + 1)}-${pad(d)}`);
    setOpen(false);
  };
  const pickMonth = (m) => {
    onChange?.(`${view.y}-${pad(m + 1)}`);
    setOpen(false);
  };
  const pickToday = () => {
    const y = today.getFullYear();
    const m = today.getMonth();
    onChange?.(mode === "date" ? `${y}-${pad(m + 1)}-${pad(today.getDate())}` : `${y}-${pad(m + 1)}`);
    setOpen(false);
  };

  const navBtn = "p-1 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-900";
  const isToday = (d) =>
    d === today.getDate() && view.m === today.getMonth() && view.y === today.getFullYear();
  const isSel = (d) => sel && sel.y === view.y && sel.m === view.m && sel.d === d;

  return (
    <div ref={ref} className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={toggle}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="flex min-w-[10.5rem] items-center justify-between gap-3 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 hover:border-gray-400"
      >
        <span>{label}</span>
        <Calendar size={16} className="text-gray-500" />
      </button>

      {open && (
        <div
          role="dialog"
          className="absolute left-0 top-full z-30 mt-2 w-72 rounded-xl border border-gray-200 bg-white p-3 shadow-lg"
        >
          <div className="mb-2 flex items-center justify-between">
            <div className="flex">
              <button type="button" className={navBtn} onClick={() => shiftYear(-1)} aria-label="Previous year">
                <ChevronsLeft size={16} />
              </button>
              {mode === "date" && (
                <button type="button" className={navBtn} onClick={() => shiftMonth(-1)} aria-label="Previous month">
                  <ChevronLeft size={16} />
                </button>
              )}
            </div>
            <span className="text-sm font-semibold text-gray-900">
              {mode === "date" ? `${MONTHS[view.m]} ${view.y}` : view.y}
            </span>
            <div className="flex">
              {mode === "date" && (
                <button type="button" className={navBtn} onClick={() => shiftMonth(1)} aria-label="Next month">
                  <ChevronRight size={16} />
                </button>
              )}
              <button type="button" className={navBtn} onClick={() => shiftYear(1)} aria-label="Next year">
                <ChevronsRight size={16} />
              </button>
            </div>
          </div>

          {mode === "date" ? (
            <>
              <div className="grid grid-cols-7 text-center text-xs font-medium text-gray-400">
                {WEEKDAYS.map((w) => (
                  <div key={w} className="py-1">{w}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-y-1 text-center text-sm">
                {cells.map((d, i) =>
                  d === null ? (
                    <div key={`e${i}`} />
                  ) : (
                    <button
                      key={d}
                      type="button"
                      onClick={() => pickDay(d)}
                      className={`mx-auto h-8 w-8 rounded-full transition ${
                        isSel(d)
                          ? "bg-brand-600 font-semibold text-white"
                          : isToday(d)
                            ? "font-semibold text-brand-600 ring-1 ring-brand-600"
                            : "text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      {d}
                    </button>
                  ),
                )}
              </div>
            </>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {MONTHS.map((name, i) => {
                const active = sel && sel.y === view.y && sel.m === i;
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => pickMonth(i)}
                    className={`rounded-lg py-2 text-sm transition ${
                      active ? "bg-brand-600 font-semibold text-white" : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    {name.slice(0, 3)}
                  </button>
                );
              })}
            </div>
          )}

          <div className="mt-3 flex justify-end border-t border-gray-100 pt-2">
            <button type="button" onClick={pickToday} className="text-sm font-medium text-brand-600 hover:underline">
              {mode === "date" ? "Today" : "This month"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
