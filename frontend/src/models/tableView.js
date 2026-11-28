// Nhớ "bảng hay thẻ" cho từng danh sách. Cùng kiểu với models/theme.js: chỉ đọc/ghi
// localStorage, mọi truy cập bọc try/catch (chế độ ẩn danh có thể throw).
import { useEffect, useState } from "react";

const KEY = (name) => `view:${name}`;

// Dưới md (768px) một cái bảng 5-7 cột không còn đọc được: hoặc chữ bị nén, hoặc phải kéo
// ngang. Ở khổ đó ta ÉP dạng thẻ, bất kể người dùng đã chọn gì — nhưng KHÔNG ghi đè lựa chọn
// đã lưu, nên khi cửa sổ rộng lại họ nhận đúng cái họ chọn. Cùng mốc với breakpoint md của
// Tailwind; đổi ở đây thì đổi cả bên đó.
const NARROW = "(max-width: 767px)";

const isNarrow = () => {
  try {
    return window.matchMedia(NARROW).matches;
  } catch {
    return false; // không có matchMedia (môi trường test) -> coi như màn rộng
  }
};

export const getTableView = (name) => {
  if (!name) return "table";
  try {
    return localStorage.getItem(KEY(name)) === "cards" ? "cards" : "table";
  } catch {
    return "table"; // chế độ ẩn danh chặn storage -> mặc định bảng
  }
};

export const setTableView = (name, view) => {
  if (!name) return;
  try {
    localStorage.setItem(KEY(name), view);
  } catch {
    /* không nhớ được thì thôi, phiên này vẫn đúng */
  }
};

// Lựa chọn bảng/thẻ của MỘT danh sách, đã tính cả bề rộng màn hình.
//   view   dạng đang hiển thị
//   setView đổi lựa chọn (và nhớ lại)
//   locked màn quá hẹp nên đang bị ép dạng thẻ -> trang nên ẩn nút đổi dạng,
//          vì bấm vào cũng không đổi được gì
export function useTableView(name) {
  const [chosen, setChosen] = useState(() => getTableView(name));
  const [narrow, setNarrow] = useState(isNarrow);

  useEffect(() => {
    let mq;
    try {
      mq = window.matchMedia(NARROW);
    } catch {
      return undefined;
    }
    const onChange = (e) => setNarrow(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return {
    view: narrow ? "cards" : chosen,
    setView: (v) => {
      setChosen(v);
      setTableView(name, v);
    },
    locked: narrow,
  };
}
