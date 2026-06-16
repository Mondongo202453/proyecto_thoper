import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

interface PrivateRouteProps {
  children: React.ReactNode;
  /** IDs de rol permitidos: 1=Admin, 2=Usuario, 3=Staff. Vacío = cualquier autenticado */
  allowedRoles?: number[];
}

/**
 * Componente de ruta protegida.
 * - Redirige a /login si no está autenticado.
 * - Redirige a la ruta apropiada si el rol no tiene acceso.
 */
const PrivateRoute: React.FC<PrivateRouteProps> = ({ children, allowedRoles = [] }) => {
  const location = useLocation();
  const token = localStorage.getItem('access_token');
  const userRaw = localStorage.getItem('user');

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles.length > 0 && userRaw) {
    try {
      const user = JSON.parse(userRaw);
      if (!allowedRoles.includes(user.role_id)) {
        // Redirigir al panel correspondiente según su rol
        if (user.role_id === 1) return <Navigate to="/dashboard" replace />;
        if (user.role_id === 3) return <Navigate to="/panel-staff" replace />;
        return <Navigate to="/mis-reservas" replace />;
      }
    } catch {
      return <Navigate to="/login" replace />;
    }
  }

  return <>{children}</>;
};

export default PrivateRoute;
