import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Usuario } from '../types';
import { login as loginApi, verificarSesion } from '../services/api';

interface AuthContextType {
  user: Usuario | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<boolean>;
  logout: () => void;
  recargarPerfil: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState<boolean>(() => Boolean(
    localStorage.getItem('asistencia_token') && localStorage.getItem('asistencia_user')
  ));
  const [user, setUser] = useState<Usuario | null>(() => {
    try {
      const saved = localStorage.getItem('asistencia_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      localStorage.removeItem('asistencia_user');
      return null;
    }
  });

  useEffect(() => {
    let vigente = true;
    const token = localStorage.getItem('asistencia_token');
    if (!token || !user) {
      return () => { vigente = false; };
    }

    verificarSesion()
      .then((data) => {
        if (!vigente) return;
        if (data.usuario?.id !== user.id) throw new Error('La sesión no corresponde al usuario guardado');
        setUser(data.usuario);
        localStorage.setItem('asistencia_user', JSON.stringify(data.usuario));
      })
      .catch(() => {
        if (!vigente) return;
        setUser(null);
        localStorage.removeItem('asistencia_user');
        localStorage.removeItem('asistencia_token');
      })
      .finally(() => { if (vigente) setLoading(false); });

    return () => { vigente = false; };
  }, []);

  const login = async (email: string, pass: string): Promise<boolean> => {
    try {
      const data = await loginApi(email, pass);
      
      // Guardar usuario y token recibidos del backend
      if (data && data.usuario) {
        setUser(data.usuario);
        localStorage.setItem('asistencia_user', JSON.stringify(data.usuario));
        if (data.token) {
          localStorage.setItem('asistencia_token', data.token);
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error durante autenticación:', error);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('asistencia_user');
    localStorage.removeItem('asistencia_token');
  };

  const recargarPerfil = async () => {
    const data = await verificarSesion();
    setUser(data.usuario);
    localStorage.setItem('asistencia_user', JSON.stringify(data.usuario));
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, recargarPerfil }}>
      {children}
    </AuthContext.Provider>
  );
};

// Este hook se exporta junto al provider y se consume en múltiples rutas.
// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe ser usado dentro de AuthProvider');
  return context;
};
