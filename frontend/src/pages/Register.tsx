import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Flame, User, Mail, Lock, Phone, Loader2, ArrowRight } from 'lucide-react';
import api from '../api/client';

const Register = () => {
  const [formData, setFormData] = useState({ 
    nombre_completo: '',
    nombre_usuario: '',
    correo: '', 
    password: '',
    telefono: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/register/', formData);
      navigate('/login');
    } catch (err) {
      setError('Error en el registro. Es posible que el usuario o correo ya existan.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 pt-28 pb-10">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card w-full max-w-lg p-10 bg-surface/30"
      >
        <div className="flex flex-col items-center mb-10">
          <div className="bg-primary p-3 rounded-2xl mb-4 shadow-xl shadow-primary/20">
            <Flame className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-display font-black uppercase tracking-tight">Crea tu cuenta</h2>
          <p className="text-white/40 text-sm">Únete a la familia Topher Producciones</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-xs py-3 px-4 rounded-xl text-center">
              {error}
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2">Nombre Completo</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                <input 
                  type="text" required
                  className="w-full bg-background border border-white/10 rounded-xl pl-12 pr-4 py-3.5 focus:border-primary outline-none transition-colors"
                  placeholder="Juan Perez"
                  value={formData.nombre_completo}
                  onChange={e => setFormData({...formData, nombre_completo: e.target.value})}
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2">Nombre de Usuario</label>
              <div className="relative">
                <Flame className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                <input 
                  type="text" required
                  className="w-full bg-background border border-white/10 rounded-xl pl-12 pr-4 py-3.5 focus:border-primary outline-none transition-colors"
                  placeholder="juan_p"
                  value={formData.nombre_usuario}
                  onChange={e => setFormData({...formData, nombre_usuario: e.target.value})}
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2">Correo Electrónico</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
              <input 
                type="email" required
                className="w-full bg-background border border-white/10 rounded-xl pl-12 pr-4 py-3.5 focus:border-primary outline-none transition-colors"
                placeholder="juan@ejemplo.com"
                value={formData.correo}
                onChange={e => setFormData({...formData, correo: e.target.value})}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                <input 
                  type="password" required
                  className="w-full bg-background border border-white/10 rounded-xl pl-12 pr-4 py-3.5 focus:border-primary outline-none transition-colors"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2">Teléfono</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                <input 
                  type="text" required
                  className="w-full bg-background border border-white/10 rounded-xl pl-12 pr-4 py-3.5 focus:border-primary outline-none transition-colors"
                  placeholder="3001234567"
                  value={formData.telefono}
                  onChange={e => setFormData({...formData, telefono: e.target.value})}
                />
              </div>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="btn-primary w-full py-4 mt-4 flex items-center justify-center gap-2 group"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Registrarse'}
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-white/30">
          ¿Ya tienes cuenta? <Link to="/login" className="text-primary font-bold hover:underline">Ingresa aquí</Link>
        </p>
      </motion.div>
    </div>
  );
};

export default Register;
