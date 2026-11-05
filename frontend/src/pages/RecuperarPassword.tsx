import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, Lock, Mail } from 'lucide-react';
import axios from 'axios';
import api from '../api/client';

type RecoveryLocationState = {
  identifier?: string;
};

type RecoveryStep = 'identify' | 'confirm-send' | 'sent' | 'reset' | 'done';

const errorMessage = (error: unknown, fallback: string) => {
  if (!axios.isAxiosError(error)) return fallback;
  const collect = (value: unknown): string[] => {
    if (typeof value === 'string') return [value];
    if (Array.isArray(value)) return value.flatMap(collect);
    if (value && typeof value === 'object') return Object.values(value).flatMap(collect);
    return [];
  };
  const messages = collect(error.response?.data);
  if (messages.length) return messages.join(' ');
  if (error.response?.status === 429) return 'Se hicieron demasiados intentos. Espera un momento antes de volver a intentarlo.';
  if (!error.response) return 'No fue posible conectar con el servidor. Revisa tu conexión e inténtalo nuevamente.';
  return fallback;
};

const RecuperarPassword = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const routeState = location.state as RecoveryLocationState | null;
  const identifier = routeState?.identifier?.trim() || '';
  const [step, setStep] = useState<RecoveryStep>('identify');
  const [correoEnmascarado, setCorreoEnmascarado] = useState('');
  const [token, setToken] = useState('');
  const [nuevaPassword, setNuevaPassword] = useState('');
  const [confirmarPassword, setConfirmarPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  useEffect(() => {
    const hashToken = new URLSearchParams(window.location.hash.slice(1)).get('token');
    const legacyQueryToken = new URLSearchParams(window.location.search).get('token');
    const recoveryToken = hashToken || legacyQueryToken;
    if (recoveryToken) {
      setToken(recoveryToken);
      setStep('reset');
      navigate('/recuperar-password', { replace: true, state: null });
      return;
    }

    if (!identifier) {
      setStep('identify');
      return;
    }

    const controller = new AbortController();
    setStep('identify');
    setLoading(true);
    setError('');
    api.post('/password-reset/lookup/', { identificador: identifier }, { signal: controller.signal })
      .then((response) => {
        const maskedEmail = response.data?.correo_enmascarado;
        if (typeof maskedEmail !== 'string' || !maskedEmail) {
          throw new Error('El servidor no devolvió el correo protegido.');
        }
        setCorreoEnmascarado(maskedEmail);
        setStep('confirm-send');
      })
      .catch((lookupError: unknown) => {
        if (axios.isCancel(lookupError)) return;
        setError(errorMessage(lookupError, 'No pudimos identificar la cuenta. Verifica el usuario o correo en el inicio de sesión.'));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [identifier, navigate]);

  const handleRequest = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await api.post('/password-reset/', { identificador: identifier });
      setInfo(response.data?.detail || 'El correo de recuperación fue enviado.');
      setStep('sent');
    } catch (requestError: unknown) {
      setError(errorMessage(requestError, 'No fue posible enviar el correo. Puedes intentarlo nuevamente.'));
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (nuevaPassword !== confirmarPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    if (!token) {
      setError('El enlace no contiene un token válido. Inicia nuevamente la recuperación.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/password-reset/confirm/', {
        token,
        nueva_password: nuevaPassword,
        confirmar_password: confirmarPassword,
      });
      setInfo(response.data?.detail || 'Tu contraseña fue actualizada.');
      setStep('done');
    } catch (confirmError: unknown) {
      setError(errorMessage(confirmError, 'El enlace ya no es válido. Inicia nuevamente el proceso.'));
    } finally {
      setLoading(false);
    }
  };

  const volverAlLogin = (
    <Link
      to="/login"
      state={{ focusIdentifier: true }}
      className="flex items-center justify-center gap-2 text-xs text-white/50 hover:text-white transition-colors"
    >
      <ArrowLeft className="h-4 w-4" /> Volver al inicio de sesión
    </Link>
  );

  return (
    <div className="min-h-screen flex items-center justify-center px-6 pt-20 pb-12">
      <div className="glass-card w-full max-w-md p-7 sm:p-10 bg-surface/30 animate-fade-in-scale">
        <div className="flex flex-col items-center mb-8">
          <div className="w-44 sm:w-52 mb-5">
            <img
              src="/img/logo-topher.jpg"
              alt="Topher Producciones"
              className="block w-full h-auto object-contain"
            />
          </div>
          <h2 className="text-2xl sm:text-3xl font-display font-black uppercase tracking-tight text-center">
            {step === 'done' ? '¡Contraseña actualizada!' : step === 'reset' ? 'Nueva contraseña' : 'Recuperar contraseña'}
          </h2>
          <p className="text-white/50 text-sm text-center mt-2">
            {step === 'identify' && 'Usaremos el usuario o correo que ya escribiste en el inicio de sesión.'}
            {step === 'confirm-send' && 'Confirma que deseas recibir el enlace en el correo asociado a tu cuenta.'}
            {step === 'sent' && 'Revisa tu bandeja de entrada y la carpeta de correo no deseado.'}
            {step === 'reset' && 'Crea una contraseña segura para volver a ingresar.'}
            {step === 'done' && 'Ya puedes iniciar sesión con tu nueva contraseña.'}
          </p>
        </div>

        {error && (
          <div role="alert" className="bg-red-500/10 border border-red-500/20 text-red-300 text-sm py-3 px-4 rounded-xl flex items-start gap-2 mb-6">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {step === 'identify' && (
          <div className="space-y-6">
            {loading ? (
              <p role="status" className="flex items-center justify-center gap-2 text-sm text-white/60">
                <Loader2 className="h-5 w-5 animate-spin" /> Consultando la cuenta...
              </p>
            ) : error ? (
              <p className="text-sm text-white/60">
                Vuelve al inicio de sesión, verifica el usuario o correo y selecciona de nuevo «¿Olvidaste tu contraseña?».
              </p>
            ) : (
              <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/65">
                Para proteger tu cuenta, primero escribe tu usuario o correo en el campo de inicio de sesión. No necesitas volver a escribir el correo aquí.
              </div>
            )}
            {volverAlLogin}
          </div>
        )}

        {step === 'confirm-send' && (
          <form onSubmit={handleRequest} className="space-y-6">
            <div className="rounded-xl border border-primary/25 bg-primary/5 p-5 text-center">
              <Mail className="mx-auto mb-3 h-6 w-6 text-primary" aria-hidden="true" />
              <p className="text-white font-semibold">¿Deseas recuperar tu contraseña?</p>
              <p className="mt-3 text-sm text-white/60">Enviaremos un enlace al correo asociado a tu cuenta:</p>
              <p className="mt-2 break-all text-lg font-bold tracking-wide text-primary" aria-label="Correo electrónico parcialmente oculto">
                {correoEnmascarado}
              </p>
              <p className="mt-4 text-sm text-white/60">¿Confirmas que deseas recibir el correo de recuperación?</p>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-4 flex items-center justify-center gap-2 disabled:opacity-60">
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Sí, enviar correo de recuperación'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/login')}
              disabled={loading}
              className="w-full rounded-xl border border-white/15 py-3 text-sm font-semibold text-white/70 hover:bg-white/5 disabled:opacity-50"
            >
              Cancelar
            </button>
          </form>
        )}

        {step === 'sent' && (
          <div className="space-y-6 text-center">
            <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-400" />
            <p className="text-sm text-white/70">{info}</p>
            <p className="text-sm font-bold text-primary">{correoEnmascarado}</p>
            {volverAlLogin}
          </div>
        )}

        {step === 'reset' && (
          <form onSubmit={handleConfirm} className="space-y-5">
            <div>
              <label htmlFor="reset-new-password" className="block text-[10px] font-bold uppercase tracking-widest text-white/45 mb-2">
                Nueva contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" aria-hidden="true" />
                <input
                  id="reset-new-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  className="w-full bg-background border border-white/10 rounded-xl pl-12 pr-4 py-3.5 focus:border-primary outline-none transition-colors"
                  value={nuevaPassword}
                  onChange={event => setNuevaPassword(event.target.value)}
                />
              </div>
            </div>
            <div>
              <label htmlFor="reset-confirm-password" className="block text-[10px] font-bold uppercase tracking-widest text-white/45 mb-2">
                Confirmar nueva contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" aria-hidden="true" />
                <input
                  id="reset-confirm-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  className="w-full bg-background border border-white/10 rounded-xl pl-12 pr-4 py-3.5 focus:border-primary outline-none transition-colors"
                  value={confirmarPassword}
                  onChange={event => setConfirmarPassword(event.target.value)}
                />
              </div>
            </div>
            <p className="text-xs leading-relaxed text-white/45">
              Usa al menos 8 caracteres, con mayúscula, minúscula, número y carácter especial.
            </p>
            <button type="submit" disabled={loading} className="btn-primary w-full py-4 flex items-center justify-center gap-2 disabled:opacity-60">
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Guardar nueva contraseña'}
            </button>
            {error && error.toLowerCase().includes('enlace') && (
              <Link to="/login" state={{ focusIdentifier: true }} className="block text-center text-sm font-semibold text-primary hover:underline">
                Iniciar nuevamente la recuperación
              </Link>
            )}
          </form>
        )}

        {step === 'done' && (
          <div className="space-y-6 text-center">
            <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-400" />
            <p className="text-sm text-white/70">{info}</p>
            <Link to="/login" className="btn-primary block w-full py-4">
              Ir al inicio de sesión
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecuperarPassword;
