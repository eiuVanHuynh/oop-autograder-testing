// Theme là token thuần CSS: src/index.css giữ giá trị, tailwind.config.js trỏ vào biến.
// File này chỉ làm đúng hai việc: nhớ lựa chọn và đặt data-theme lên <html>.
// Lần tải đầu do script đồng bộ trong index.html lo, nếu không màn hình nháy một nhịp.

export const THEMES = [
  { id: "", label: "Indigo", hint: "Default" },
  { id: "nature", label: "Nature", hint: "Square" },
];

// Storage có thể throw ở chế độ ẩn danh -> luôn bọc try/catch (quy ước của dự án).
export const getTheme = () => {
  let saved = "";
  try {
    saved = localStorage.getItem("theme") || "";
  } catch {
    /* chế độ ẩn danh chặn storage -> theme mặc định */
  }
  // Giá trị lạ (bản cũ, người dùng tự sửa) phải rơi về mặc định, nếu không nhãn trong
  // menu rỗng và không ô nào được tick trong khi giao diện vẫn là theme mặc định.
  return THEMES.some((t) => t.id === saved) ? saved : "";
};

export const setTheme = (id) => {
  // Xoá hẳn thuộc tính khi về theme mặc định, để :root[data-theme] không khớp nữa.
  if (id) document.documentElement.dataset.theme = id;
  else delete document.documentElement.dataset.theme;
  try {
    if (id) localStorage.setItem("theme", id);
    else localStorage.removeItem("theme");
  } catch {
    /* không nhớ được thì thôi, phiên này vẫn đúng theme */
  }
};
