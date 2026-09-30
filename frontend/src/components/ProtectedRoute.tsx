import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/Authcontext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  // Si está cargando el estado de autenticación
  if (loading) {
    return <div className="min-h-screen bg-[#071118] text-white flex items-center justify-center">Cargando...</div>;
  }

  // 1. Si no hay usuario autenticado -> Redirigir al Login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // 2. Si el rol del usuario no está permitido -> Redirigir según su propio rol
  if (allowedRoles && !allowedRoles.includes(user.rol)) {
    if (user.rol === 'docente') return <Navigate to="/docente/proyeccion" replace />;
    if (user.rol === 'alumno') return <Navigate to="/alumno/escaneo" replace />;
    if (user.rol === 'admin') return <Navigate to="/admin/dashboard" replace />;
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};