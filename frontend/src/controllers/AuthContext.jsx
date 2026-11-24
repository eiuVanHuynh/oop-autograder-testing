import { createContext, useContext, useEffect, useState } from 'react';
import { meRequest } from '../services/authService';

const AuthContext = createContext(null);

const readStored = (key) => {
  try {
    return localStorage.getItem(key) ?? sessionStorage.getItem(key);
  } catch {
    return null;
  }
};

const clearStored = () => {
  ['user', 'token'].forEach((k) => {
    try {
      localStorage.removeItem(k);
      sessionStorage.removeItem(k);
    } catch {
      /* bỏ qua */
    }
  });
};

export const AuthProvider = ({ children }) => {
  // Khởi tạo đồng bộ để reload trang không bị ProtectedRoute đá về /login
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(readStored('user'));
    } catch {
      return null;
    }
  });

  // remember = true -> localStorage (giữ sau khi đóng trình duyệt); false -> sessionStorage.
  const login = (userData, token, remember = true) => {
    clearStored();
    const store = remember ? localStorage : sessionStorage;
    setUser(userData);
    store.setItem('user', JSON.stringify(userData));
    if (token) store.setItem('token', token);
  };

  // Khởi tạo ở trên chỉ TIN storage. Gọi /auth/me một lần khi mở lại web để biết phiên còn thật:
  // token hết hạn / tài khoản bị xoá → 401, bị khoá → 423, interceptor trong models/api.js xoá phiên
  // và đưa về /login. Thành công thì ghi lại user, vì admin có thể đã đổi vai trò lúc mình đang
  // đăng nhập — trước đây vai trò trong storage cũ vẫn được dùng để ẩn/hiện nút.
  useEffect(() => {
    if (!readStored('token')) return;
    let alive = true;
    meRequest()
      .then((fresh) => {
        // Người dùng có thể đã bấm Đăng xuất trong lúc chờ: áp kết quả vào là phiên sống lại.
        if (!alive || !readStored('token')) return;
        setUser(fresh);
        const store = localStorage.getItem('token') ? localStorage : sessionStorage;
        try {
          store.setItem('user', JSON.stringify(fresh));
        } catch {
          /* bỏ qua */
        }
      })
      .catch(() => {
        /* interceptor đã lo phiên chết; lỗi mạng thì giữ nguyên phiên trong storage */
      });
    return () => {
      alive = false;
    };
  }, []);

  const logout = () => {
    // BACKEND-TODO: POST /auth/logout (chưa có endpoint). Hiện chỉ xóa phiên phía FE.
    setUser(null);
    clearStored();
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
