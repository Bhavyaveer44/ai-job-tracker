import { createContext, useContext, useState } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [isDemo, setIsDemo] = useState(() => localStorage.getItem('isDemo') === 'true');

  const login = (userData, jwt, demo = false) => {
    setUser(userData);
    setToken(jwt);
    setIsDemo(demo);
    localStorage.setItem('token', jwt);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('isDemo', demo ? 'true' : 'false');
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setIsDemo(false);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('isDemo');
  };

  return (
    <AuthContext.Provider value={{ user, token, isDemo, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);