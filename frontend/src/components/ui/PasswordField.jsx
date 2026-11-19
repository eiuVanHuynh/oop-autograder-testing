import { useState } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';
import FormField from './FormField';

// Ô mật khẩu có nút ẩn/hiện, mỗi ô tự giữ state của mình.
// Nhận các prop như FormField (id, label, hint, value, onChange, placeholder, autoComplete...).
export default function PasswordField(props) {
  const [show, setShow] = useState(false);

  return (
    <FormField
      {...props}
      icon={Lock}
      type={show ? 'text' : 'password'}
      trailing={
        <button
          type="button"
          onClick={() => setShow(!show)}
          aria-label={show ? 'Hide password' : 'Show password'}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      }
    />
  );
}