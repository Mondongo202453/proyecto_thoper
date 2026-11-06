import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import api from '../api/client';

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
  const [sessionVersion, setSessionVersion] = React.useState(0);
  const [sessionStatus, setSessionStatus] = React.useState<'checking' | 'valid' | 'invalid' | 'error'>('checking');
  const [roleId, setRoleId] = React.useState<number | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    const token = localStorage.getItem('access_token');

    if (!token || token === 'null') {
      localStorage.removeItem('user');
      setRoleId(null);
      setSessionStatus('invalid');
      return () => { cancelled = true; };
    }

    setSessionStatus('checking');
    api.get('/me/').then((response) => {
      if (cancelled) return;
      if (localStorage.getItem('access_token') !== token) {
        setSessionVersion((version) => version + 1);
        return;
      }

      const verifiedRoleId = Number(response.data?.role_id ?? response.data?.role);
      if (![1, 2, 3].includes(verifiedRoleId)) {
        throw new Error('El perfil no contiene un rol válido.');
      }

      localStorage.setItem('user', JSON.stringify({
        ...response.data,
        role_id: verifiedRoleId,
      }));
      setRoleId(verifiedRoleId);
      setSessionStatus('valid');
      window.dispatchEvent(new Event('auth-session-updated'));
    }).catch((verificationError: unknown) => {
      if (cancelled) return;
      if (localStorage.getItem('access_token') !== token) {
        setSessionVersion((version) => version + 1);
        return;
      }

      console.error('No se pudo verificar la sesión actual:', verificationError);
      if (!localStorage.getItem('access_token')) {
        localStorage.removeItem('user');
        setSessionStatus('invalid');
      } else {
        setSessionStatus('error');
      }
    });

    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'access_token' || event.key === 'refresh_token' || event.key === 'user') {
        setSessionVersion((version) => version + 1);
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      cancelled = true;
      window.removeEventListener('storage', handleStorage);
    };
  }, [sessionVersion]);

  if (sessionStatus === 'checking') {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-white/60" role="status">
        Verificando tu sesión...
      </div>
    );
  }

  if (sessionStatus === 'invalid') {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (sessionStatus === 'error') {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-6 text-center text-white/60">
        <p>No pudimos verificar tu sesión. Comprueba tu conexión e inténtalo de nuevo.</p>
        <button
          type="button"
          className="btn-primary px-5 py-2"
          onClick={() => setSessionVersion((version) => version + 1)}
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (roleId === null) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(roleId)) {
    if (roleId === 1) return <Navigate to="/dashboard" replace />;
    if (roleId === 3) return <Navigate to="/panel-staff" replace />;
    return <Navigate to="/mis-reservas" replace />;
  }

  return <>{children}</>;
};

export default PrivateRoute;
