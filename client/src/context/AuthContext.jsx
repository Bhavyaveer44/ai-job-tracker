import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [isDemo, setIsDemo] = useState(localStorage.getItem('isDemo') === 'true');

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) setUser(JSON.parse(stored));
  }, []);

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

export const useAuth = () => useContext(AuthContext);