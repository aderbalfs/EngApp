import { createContext, useContext, useState, useCallback } from 'react';
import { getUser, setUser as saveUser, clearUser } from '../utils/storage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUserState] = useState(() => getUser());

  const login = useCallback((role) => {
    const u = { role, loggedAt: new Date().toISOString() };
    saveUser(u);
    setUserState(u);
  }, []);

  const logout = useCallback(() => {
    clearUser();
    setUserState(null);
  }, []);

  const isAdmin = user?.role === 'admin';
  const isViewer = user?.role === 'viewer';

  return (
    <AuthContext.Provider value={{ user, login, logout, isAdmin, isViewer }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
