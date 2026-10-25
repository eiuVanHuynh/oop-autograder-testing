import { createContext, useContext, useState } from 'react';

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
