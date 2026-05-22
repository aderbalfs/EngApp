import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { login as apiLogin, getMe } from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const data = localStorage.getItem('engapp_user');
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  // Verificar token ao carregar
  useEffect(() => {
    const token = localStorage.getItem('engapp_token');
    if (!token) {
      // Limpar dados antigos do sistema anterior (login sem JWT)
      localStorage.removeItem('engapp_user');
      setUser(null);
      setLoading(false);
      return;
    }
    getMe()
      .then((userData) => {
        setUser(userData);
        localStorage.setItem('engapp_user', JSON.stringify(userData));
      })
      .catch(() => {
        localStorage.removeItem('engapp_token');
        localStorage.removeItem('engapp_user');
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, senha) => {
    const { token, user: userData } = await apiLogin(email, senha);
    localStorage.setItem('engapp_token', token);
    localStorage.setItem('engapp_user', JSON.stringify(userData));
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('engapp_token');
    localStorage.removeItem('engapp_user');
    setUser(null);
  }, []);

  const isAdmin = user?.role === 'admin';
  const isViewer = user?.role === 'viewer';

  return (
    <AuthContext.Provider value={{ user, login, logout, isAdmin, isViewer, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
