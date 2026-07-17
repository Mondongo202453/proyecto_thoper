import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Phone, Save, ArrowLeft, Loader2, AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react';
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
          <p className="text-white/60">Cargando perfil...</p>
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
    <div className="page-shell bg-background text-white">
      <div className="page-inner max-w-3xl">
        <div className="mb-10">
          <Link to="/" className="inline-flex items-center gap-2 text-white/60 hover:text-white transition-colors mb-6">
            <ArrowLeft className="w-4 h-4" />
            Volver
          </Link>
          <div className="panel-surface p-8 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,138,0,0.16),transparent_42%)]" />
            <div className="relative flex flex-col md:flex-row md:items-center gap-6">
              <div className="p-4 rounded-full bg-primary/20 border border-primary/30">
                <User className="w-8 h-8 text-primary" />
              </div>
              <div>
                <span className="page-eyebrow mb-3">Tu cuenta</span>
                <h1 className="page-title text-3xl md:text-4xl">Mi Perfil</h1>
                <p className="page-subtitle mt-2">Gestiona tu información personal con la misma identidad visual del resto de la plataforma.</p>
              </div>
            </div>
          </div>
        </div>

        {toast && (
          <div className={`mb-8 p-4 rounded-xl border flex items-center gap-3 ${toast.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-red-500/10 border-red-500/30 text-red-300'}`}>
            {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
            <p className="text-sm">{toast.msg}</p>
          </div>
        )}

        <div className="glass-card bg-surface/20 border-white/5 p-8 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 pb-8 border-b border-white/10">
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-white/40 mb-2 block">Nombre de Usuario</label>
              <p className="text-lg font-medium text-white/80">{user?.nombre_usuario}</p>
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-white/40 mb-2 block">Correo Electrónico</label>
              <p className="text-lg font-medium text-white/80">{user?.correo}</p>
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-white/40 mb-2 block">Rol</label>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-sm text-primary">
                <ShieldCheck className="w-4 h-4" />
                {roleMap[user?.role_id || 2]}
              </div>
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-white/40 mb-2 block">Miembro desde</label>
              <p className="text-lg font-medium text-white/80">{user?.creado_en ? new Date(user.creado_en).toLocaleDateString('es-CO') : 'N/A'}</p>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            <div>
              <label htmlFor="nombre_completo" className="text-xs font-bold uppercase tracking-widest text-white/40 mb-3 block">Nombre Completo *</label>
              <input
                id="nombre_completo"
                type="text"
                name="nombre_completo"
                value={formData.nombre_completo}
                onChange={handleChange}
                className="w-full bg-background border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder:text-white/30 focus:outline-none focus:border-primary transition-colors"
                placeholder="Tu nombre completo"
              />
            </div>

            <div>
              <label htmlFor="telefono" className="text-xs font-bold uppercase tracking-widest text-white/40 mb-3 block">Teléfono</label>
              <input
                id="telefono"
                type="tel"
                name="telefono"
                value={formData.telefono}
                onChange={handleChange}
                className="w-full bg-background border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder:text-white/30 focus:outline-none focus:border-primary transition-colors"
                placeholder="+57 300 000 0000"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 btn-primary py-3.5 flex items-center justify-center gap-2"
              >
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</> : <><Save className="w-4 h-4" /> Guardar Cambios</>}
              </button>
              <button
                type="button"
                onClick={() => navigate('/')}
                className="flex-1 border border-white/10 rounded-xl py-3.5 font-bold uppercase tracking-widest hover:bg-white/5 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>

        <div className="glass-card bg-surface/20 border-white/5 p-8">
          <h2 className="text-xl font-bold mb-6">Acciones de Cuenta</h2>
          <div className="space-y-4">
            <Link to="/recuperar-password" className="block p-4 border border-white/10 rounded-xl hover:bg-white/5 transition-colors">
              <p className="font-semibold">Cambiar Contraseña</p>
              <p className="text-sm text-white/50">Actualiza tu contraseña de acceso</p>
            </Link>
            <button
              onClick={() => {
                localStorage.clear();
                navigate('/login');
              }}
              className="w-full text-left p-4 border border-red-500/30 rounded-xl hover:bg-red-500/5 transition-colors text-red-400"
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
