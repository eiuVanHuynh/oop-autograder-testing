import { useState } from "react";
import { KeyRound, X } from "lucide-react";
import PasswordField from "./PasswordField";
import Button from "./Button";

// Hộp thoại đặt mật khẩu, dùng cho CẢ HAI đường:
// - TopBar: tự đổi mật khẩu  → askCurrent = true (backend đòi mật khẩu hiện tại)
// - UserManagement: Admin đặt lại hộ người khác → askCurrent = false (quyền admin là bằng chứng)
//
// onSubmit nhận { currentPassword, newPassword } và tự báo lỗi/thành công bằng toast ở phía gọi;
// ở đây chỉ kiểm hai thứ mà gọi API cũng vô ích: độ dài 6 (khớp zod backend) và ô nhập lại.
export default function PasswordModal({
  title,
  subtitle,
  askCurrent = false,
  confirmLabel = "Save",
  onSubmit,
  onClose,
}) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (askCurrent && !current) return setError("Enter your current password.");
    if (next.length < 6) return setError("The new password must be at least 6 characters.");
    if (next !== again) return setError("The two new passwords do not match.");

    setError("");
    setSaving(true);
    try {
      await onSubmit({ currentPassword: current, newPassword: next });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-lg"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="m-0 flex items-center gap-2 text-base font-bold text-slate-900">
              <KeyRound size={18} className="text-brand-600" /> {title}
            </h2>
            {subtitle && <p className="m-0 mt-1 text-sm text-slate-500">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3">
          {askCurrent && (
            <PasswordField
              id="current-password"
              label="Current password"
              autoComplete="current-password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
            />
          )}
          <PasswordField
            id="new-password"
            label="New password"
            autoComplete="new-password"
            placeholder="At least 6 characters"
            value={next}
            onChange={(e) => setNext(e.target.value)}
          />
          <PasswordField
            id="new-password-again"
            label="Repeat new password"
            autoComplete="new-password"
            value={again}
            onChange={(e) => setAgain(e.target.value)}
          />
        </div>

        {error && (
          <p className="mt-3 rounded-lg bg-red-100 p-2.5 text-sm text-red-600">{error}</p>
        )}

        <div className="mt-5 flex gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : confirmLabel}
          </Button>
        </div>
      </form>
    </div>
  );
}
