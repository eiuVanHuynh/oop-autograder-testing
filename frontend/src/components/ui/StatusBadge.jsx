// Nhãn trạng thái dùng chung cho mọi bảng.
// Shared status pill for every table.
//
//   <StatusBadge status="PASSED" />            // màu tra theo tên trạng thái
//   <StatusBadge status={c.priority} />        // priority cũng nằm trong bảng tra
//   <StatusBadge status={t.scope} tone="brand" />  // ép màu cho thứ không phải trạng thái
//
// Hằng số trạng thái ở frontend luôn viết HOA; DB viết thường, đổi ở backend/src/utils/mappers.js.
// Tailwind không sinh được class ghép chuỗi nên TONES phải ghi nguyên văn.
const TONES = {
  emerald: "bg-emerald-100 text-emerald-700",
  red: "bg-red-100 text-red-700",
  amber: "bg-amber-100 text-amber-700",
  orange: "bg-orange-100 text-orange-700",
  blue: "bg-blue-100 text-blue-700",
  brand: "bg-brand-50 text-brand-600",
  slate: "bg-gray-100 text-gray-600",
};

const STATUS_TONE = {
  PASSED: "emerald",
  ACTIVE: "emerald",
  READY: "emerald",
  LOW: "slate",
  FAILED: "red",
  TIMEDOUT: "red",
  LOCKED: "red",
  INACTIVE: "red",
  CRITICAL: "red",
  RUNNING: "amber",
  QUEUED: "slate",
  SKIPPED: "slate",
  IDLE: "slate",
  CANCELLED: "orange",
  MEDIUM: "blue",
  INTERRUPTED: "orange",
  HIGH: "orange",
  DRAFT: "slate",
  DEPRECATED: "orange",
};

const toneOf = (status) => STATUS_TONE[String(status ?? "").toUpperCase()] ?? "slate";

export default function StatusBadge({ status, label, icon: Icon, tone, className = "" }) {
  const cls = TONES[tone ?? toneOf(status)] ?? TONES.slate;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${cls} ${className}`}
    >
      {Icon && <Icon size={12} />}
      {label ?? status}
    </span>
  );
}
