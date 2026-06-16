import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Phone, Save, ArrowLeft, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import api from '../api/client';

interface UserProfile {
  id: number;
  nombre_completo: string;
  nombre_usuario: string;
  correo: string;
  telefono: string;
  role_id: number;
  role_nombre?: string;
  creado_en?: string;
}

const Perfil = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [formData, setFormData] = useState({ nombre_completo: '', telefono: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const navigate = useNavigate();

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      navigate('/login');
      return;
    }
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await api.get('/me/');
      setUser(res.data);
      setFormData({
        nombre_completo: res.data.nombre_completo || '',
        telefono: res.data.telefono || '',
      });
    } catch (err) {
      showToast('Error al cargar el perfil.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch('/me/', formData);
      showToast('Perfil actualizado correctamente.', 'success');
      // Actualizar en localStorage
      if (user) {
        const updatedUser = { ...user, ...formData };
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }
      setTimeout(() => navigate('/'), 2000);
    } catch (err: any) {
      showToast(err?.response?.data?.detail || 'Error al actualizar el perfil.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
          <p>Cargando perfil...</p>
        </div>
      </div>
    );
  }

  const roleMap: Record<number, string> = {
    1: 'Administrador',
    2: 'Usuario Registrado',
    3: 'Personal (Staff)',
  };

  return (
    <div className="min-h-screen bg-background text-white pt-32 pb-20 px-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <Link to="/" className="inline-flex items-center gap-2 text-white/60 hover:text-white transition-colors mb-6">
            <ArrowLeft className="w-4 h-4" />
            Volver
          </Link>
          <div className="flex items-center gap-4">
            <div className="p-4 rounded-full bg-primary/20 border border-primary/30">
              <User className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-4xl font-display font-black tracking-tighter uppercase">Mi Perfil</h1>
              <p className="text-white/50 mt-2">Gestiona tu información personal</p>
            </div>
          </div>
        </div>

        {/* Toast */}
        {toast && (
          <div
            className={`mb-8 p-4 rounded-lg border flex items-center gap-3 ${
              toast.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-red-500/10 border-red-500/30 text-red-300'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
            )}
            <p className="text-sm">{toast.msg}</p>
          </div>
        )}

        {/* Profile Card */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 mb-8">
          {/* Info Read-Only */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 pb-8 border-b border-white/10">
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-white/40 mb-2 block">
                Nombre de Usuario
              </label>
              <p className="text-lg font-medium text-white/80">{user?.nombre_usuario}</p>
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-white/40 mb-2 block">
                Correo Electrónico
              </label>
              <p className="text-lg font-medium text-white/80">{user?.correo}</p>
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-white/40 mb-2 block">
                Rol
              </label>
              <p className="text-lg font-medium text-primary">{roleMap[user?.role_id || 2]}</p>
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-white/40 mb-2 block">
                Miembro desde
              </label>
              <p className="text-lg font-medium text-white/80">
                {user?.creado_en ? new Date(user.creado_en).toLocaleDateString('es-CO') : 'N/A'}
              </p>
            </div>
          </div>

          {/* Editable Fields */}
          <form onSubmit={handleSave} className="space-y-6">
            <div>
              <label htmlFor="nombre_completo" className="text-xs font-bold uppercase tracking-widest text-white/40 mb-3 block">
                Nombre Completo *
              </label>
              <input
                id="nombre_completo"
                type="text"
                name="nombre_completo"
                value={formData.nombre_completo}
                onChange={handleChange}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-primary transition-colors"
                placeholder="Tu nombre completo"
              />
            </div>

            <div>
              <label htmlFor="telefono" className="text-xs font-bold uppercase tracking-widest text-white/40 mb-3 block">
                Teléfono
              </label>
              <input
                id="telefono"
                type="tel"
                name="telefono"
                value={formData.telefono}
                onChange={handleChange}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-primary transition-colors"
                placeholder="+57 300 000 0000"
              />
            </div>

            {/* Submit Button */}
            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-primary hover:bg-primary/80 disabled:opacity-50 text-background font-bold uppercase tracking-widest rounded-lg py-3 transition-all flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Guardar Cambios
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => navigate('/')}
                className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold uppercase tracking-widest rounded-lg py-3 transition-all"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>

        {/* Account Actions */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
          <h2 className="text-xl font-bold mb-6">Acciones de Cuenta</h2>
          <div className="space-y-4">
            <Link
              to="/recuperar-password"
              className="block p-4 border border-white/10 rounded-lg hover:bg-white/5 transition-colors"
            >
              <p className="font-semibold">Cambiar Contraseña</p>
              <p className="text-sm text-white/50">Actualiza tu contraseña de acceso</p>
            </Link>
            <button
              onClick={() => {
                localStorage.clear();
                navigate('/login');
              }}
              className="w-full text-left p-4 border border-red-500/30 rounded-lg hover:bg-red-500/5 transition-colors text-red-400"
            >
              <p className="font-semibold">Cerrar Sesión</p>
              <p className="text-sm text-red-400/70">Salir de tu cuenta</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Perfil;
