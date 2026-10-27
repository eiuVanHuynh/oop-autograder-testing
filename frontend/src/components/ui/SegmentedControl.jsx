// Nhóm nút liền nhau, chọn đúng 1 giá trị.
// options: [{ value, label }]; value: giá trị đang chọn; onChange(value).
// variant: 'soft' (nền nhạt, ô chọn màu trắng) | 'solid' (ô chọn tô đậm).
// COLS ghi đủ class nguyên văn vì Tailwind không sinh được class ghép chuỗi kiểu `grid-cols-${n}`.
const COLS = { 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4' };

const VARIANTS = {
  soft: {
    wrap: 'gap-1 rounded-lg bg-brand-50 p-1',
    active: 'border border-slate-200 bg-white text-brand-600',
    inactive: 'border border-transparent text-slate-500 hover:text-slate-900',
  },
  solid: {
    wrap: 'gap-2',
    active: 'bg-brand-700 text-white',
    inactive: 'bg-brand-50 text-slate-600 hover:bg-brand-100',
  },
};

export default function SegmentedControl({
  options,
  value,
  onChange,
  columns = 4,
  variant = 'soft',
  disabled = false,
}) {
  const v = VARIANTS[variant];

  return (
    <div role="radiogroup" className={`grid ${COLS[columns]} ${v.wrap}`}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            className={`flex h-8 items-center justify-center gap-1.5 rounded-md px-2 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
              active ? v.active : v.inactive
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}