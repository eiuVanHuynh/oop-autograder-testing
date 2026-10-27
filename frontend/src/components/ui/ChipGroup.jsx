import { Check, Plus } from 'lucide-react';

// Nhóm chip bật/tắt, chọn được nhiều.
// options: [{ value, label }]; value: mảng các value đang chọn; onChange(mảngMới).
export default function ChipGroup({ options, value, onChange, disabled = false }) {
  const toggle = (v) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const on = value.includes(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={on}
            disabled={disabled}
            onClick={() => toggle(opt.value)}
            className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
              on ? 'bg-brand-600 text-white' : 'bg-brand-50 text-slate-600 hover:bg-brand-100'
            }`}
          >
            {on ? <Check size={14} /> : <Plus size={14} />}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}