import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Flame, Mail, Lock, KeyRound, Loader2, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import api from '../api/client';

const RecuperarPassword = () => {
  const [step, setStep] = useState<'request' | 'confirm' | 'done'>('request');
  const [correo, setCorreo] = useState('');
  const [token, setToken] = useState('');
  const [nuevaPassword, setNuevaPassword] = useState('');
  const [confirmarPassword, setConfirmarPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const navigate = useNavigate();

  // Check if token is in URL
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('token');
    if (t) {
      setToken(t);
      setStep('confirm');
    }
  }, []);

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/password-reset/', { correo });
      setInfo(res.data.detail || 'Revisa tu correo para el enlace de recuperación.');
      setStep('confirm');
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Error al procesar la solicitud.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nuevaPassword !== confirmarPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    if (nuevaPassword.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/password-reset/confirm/', { token, nueva_password: nuevaPassword });
      setInfo(res.data.detail || 'Contraseña actualizada.');
      setStep('done');
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Token inválido o expirado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 pt-20">
      <div className="glass-card w-full max-w-md p-10 bg-surface/30 animate-fade-in-scale">
        <div className="flex flex-col items-center mb-10">
          <div className="bg-primary/10 border border-primary/20 p-3 rounded-2xl mb-4">
            <KeyRound className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-3xl font-display font-black uppercase tracking-tight">
            {step === 'done' ? '¡Listo!' : 'Recuperar Contraseña'}
          </h2>
          <p className="text-white/40 text-sm text-center mt-1">
            {step === 'request' && 'Ingresa tu correo y te enviaremos un enlace de recuperación.'}
            {step === 'confirm' && 'Ingresa el token recibido y tu nueva contraseña.'}
            {step === 'done' && 'Tu contraseña fue actualizada exitosamente.'}
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs py-3 px-4 rounded-xl flex items-start gap-2 mb-6">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {info && step === 'confirm' && !token && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs py-3 px-4 rounded-xl mb-6">
            {info}
          </div>
        )}

        {step === 'done' && (
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <CheckCircle2 className="w-16 h-16 text-emerald-400" />
            </div>
            <p className="text-white/60 text-sm">{info}</p>
            <button
              onClick={() => navigate('/login')}
              className="btn-primary w-full py-4"
            >
              Ir al inicio de sesión
            </button>
          </div>
        )}

        {step === 'request' && (
          <form onSubmit={handleRequest} className="space-y-6">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2">
                Correo electrónico
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                <input
                  id="reset-email"
                  type="email" required
                  className="w-full bg-background border border-white/10 rounded-xl pl-12 pr-4 py-3.5 focus:border-primary outline-none transition-colors"
                  placeholder="tu@correo.com"
                  value={correo}
                  onChange={e => setCorreo(e.target.value)}
                />
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-4 flex items-center justify-center gap-2">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Enviar enlace de recuperación'}
            </button>
            <Link to="/login" className="flex items-center justify-center gap-2 text-xs text-white/30 hover:text-white transition-colors">
              <ArrowLeft className="w-4 h-4" /> Volver al inicio de sesión
            </Link>
          </form>
        )}

        {step === 'confirm' && (
          <form onSubmit={handleConfirm} className="space-y-6">
            {!token && (
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2">
                  Token de recuperación
                </label>
                <input
                  id="reset-token"
                  type="text" required
                  className="w-full bg-background border border-white/10 rounded-xl px-4 py-3.5 focus:border-primary outline-none transition-colors font-mono text-sm"
                  placeholder="Pega el token del correo"
                  value={token}
                  onChange={e => setToken(e.target.value)}
                />
              </div>
            )}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2">
                Nueva contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                <input
                  id="reset-new-password"
                  type="password" required minLength={8}
                  className="w-full bg-background border border-white/10 rounded-xl pl-12 pr-4 py-3.5 focus:border-primary outline-none transition-colors"
                  placeholder="Mínimo 8 caracteres"
                  value={nuevaPassword}
                  onChange={e => setNuevaPassword(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2">
                Confirmar nueva contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                <input
                  id="reset-confirm-password"
                  type="password" required
                  className="w-full bg-background border border-white/10 rounded-xl pl-12 pr-4 py-3.5 focus:border-primary outline-none transition-colors"
                  placeholder="Repite la contraseña"
                  value={confirmarPassword}
                  onChange={e => setConfirmarPassword(e.target.value)}
                />
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-4 flex items-center justify-center gap-2">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Guardar nueva contraseña'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default RecuperarPassword;
