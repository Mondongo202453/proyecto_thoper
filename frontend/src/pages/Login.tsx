import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Flame, Mail, Lock, Loader2, ArrowRight, AlertCircle } from 'lucide-react';
import api from '../api/client';

const Login = () => {
  const [formData, setFormData] = useState({ nombre_usuario: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const cleanedIdentifier = formData.nombre_usuario.trim();
      const res = await api.post('/token/', { nombre_usuario: cleanedIdentifier, password: formData.password });
      const { access, refresh, user } = res.data;

      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);
      if (user) {
        localStorage.setItem('user', JSON.stringify(user));
      }

      // Redirección por rol (RF03)
      const roleId = user?.role_id;
      if (roleId === 1) {
        navigate('/dashboard');          // Administrador
      } else if (roleId === 3) {
        navigate('/panel-staff');        // Personal (Staff)
      } else {
        navigate('/mis-reservas');       // Usuario registrado
      }
    } catch (err: any) {
      const resp = err?.response?.data;
      let message = 'Error al iniciar sesión. Intenta de nuevo.';

      if (resp) {
        if (typeof resp.detail === 'string') message = resp.detail;
        else if (Array.isArray(resp.non_field_errors) && resp.non_field_errors.length) message = String(resp.non_field_errors[0]);
        else {
          // Field-specific errors (e.g., {nombre_usuario: ['...']}) -> take first
          const firstKey = Object.keys(resp)[0];
          const val = resp[firstKey];
          if (Array.isArray(val) && val.length) message = String(val[0]);
          else if (typeof val === 'string') message = val;
        }
      }

      // Normalize common backend texts to friendly, modern Spanish
      if (message.toLowerCase().includes('credenciales inválidas') || message.toLowerCase().includes('credenciales incorrectas')) {
        message = 'Usuario o contraseña incorrectos. Verifica tus datos o regístrate si no tienes cuenta.';
      } else if (message.toLowerCase().includes('bloqueada')) {
        // Keep backend message but make it friendlier
        message = message.replace('Cuenta bloqueada', 'Cuenta bloqueada');
      } else if (message.toLowerCase().includes('no se ha proporcionado') || message.toLowerCase().includes('no se proveyeron')) {
        message = 'Faltan credenciales. Por favor completa usuario y contraseña.';
      }

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 pt-20">
      <div className="glass-card w-full max-w-md p-10 bg-surface/30 animate-fade-in-scale">
        <div className="flex flex-col items-center mb-10">
          <div className="bg-primary p-3 rounded-2xl mb-4 shadow-xl shadow-primary/20">
            <Flame className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-display font-black uppercase tracking-tight">Bienvenido</h2>
          <p className="text-white/40 text-sm">Ingresa a tu cuenta de Topher</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs py-3 px-4 rounded-xl flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2">
              Usuario o Correo Electrónico
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
              <input
                id="login-identifier"
                type="text" required
                className="w-full bg-background border border-white/10 rounded-xl pl-12 pr-4 py-3.5 focus:border-primary outline-none transition-colors"
                placeholder="usuario o correo@ejemplo.com"
                value={formData.nombre_usuario}
                onChange={e => setFormData({ ...formData, nombre_usuario: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2">
              Contraseña
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
              <input
                id="login-password"
                type="password" required
                className="w-full bg-background border border-white/10 rounded-xl pl-12 pr-4 py-3.5 focus:border-primary outline-none transition-colors"
                placeholder="••••••••"
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
              />
            </div>
            <div className="text-right mt-2">
              <Link to="/recuperar-password" className="text-[10px] text-white/30 hover:text-primary transition-colors">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
          </div>

          <button
            type="submit"
            id="login-submit"
            disabled={loading}
            className="btn-primary w-full py-4 flex items-center justify-center gap-2 group"
          >
            <span className="flex items-center gap-2">
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <span>Ingresar</span>
              )}
            </span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-white/30">
          ¿No tienes cuenta?{' '}
          <Link to="/registro" className="text-primary font-bold hover:underline">
            Regístrate
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
