import React, { useState } from 'react';
import { Flame, Mail, MessageSquare, User, Send, CheckCircle2, Loader2, Phone, MapPin } from 'lucide-react';
import api from '../api/client';

const Contacto = () => {
  const userRaw = localStorage.getItem('user');
  const userLogged = userRaw ? JSON.parse(userRaw) : null;

  const [formData, setFormData] = useState({
    nombre_remitente: userLogged?.nombre_completo || '',
    correo_remitente: userLogged?.correo || '',
    asunto: '',
    mensaje: '',
  });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/contacto/', formData);
      setSent(true);
    } catch (err: any) {
      setError('Hubo un error al enviar tu mensaje. Por favor intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-20 px-6">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="text-center mb-16 animate-fade-in">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-bold uppercase tracking-[0.4em] text-primary mb-6">
            Contáctanos
          </span>
          <h1 className="text-5xl md:text-7xl font-display font-black tracking-tighter uppercase mb-4">
            Hablemos <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-600">de tu Evento</span>
          </h1>
          <p className="text-white/40 max-w-lg mx-auto">
            Cuéntanos sobre tu proyecto y te responderemos a la brevedad. También puedes solicitar directamente una reserva.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

          {/* Info de contacto */}
          <div className="space-y-6 animate-fade-in">
            <div className="glass-card p-6 bg-surface/20 border-white/5">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-primary/10 p-2 rounded-lg border border-primary/20">
                  <Phone className="w-5 h-5 text-primary" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Teléfono</span>
              </div>
              <p className="text-white font-bold">+57 300 000 0000</p>
              <p className="text-white/40 text-xs mt-1">Lunes a Sábado, 8am – 8pm</p>
            </div>

            <div className="glass-card p-6 bg-surface/20 border-white/5">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-primary/10 p-2 rounded-lg border border-primary/20">
                  <Mail className="w-5 h-5 text-primary" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Correo</span>
              </div>
              <p className="text-white font-bold">contacto@topherproducciones.com</p>
              <p className="text-white/40 text-xs mt-1">Respondemos en máx. 24h hábiles</p>
            </div>

            <div className="glass-card p-6 bg-surface/20 border-white/5">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-primary/10 p-2 rounded-lg border border-primary/20">
                  <MapPin className="w-5 h-5 text-primary" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Ubicación</span>
              </div>
              <p className="text-white font-bold">Medellín, Antioquia</p>
              <p className="text-white/40 text-xs mt-1">Atendemos toda Colombia</p>
            </div>

            <div className="glass-card p-6 bg-primary/5 border-primary/20">
              <div className="flex items-center gap-3 mb-3">
                <Flame className="w-5 h-5 text-primary" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-primary">¿Listo para reservar?</span>
              </div>
              <p className="text-white/60 text-xs leading-relaxed mb-4">
                Si ya sabes qué servicios necesitas, crea tu solicitud directamente desde nuestro catálogo.
              </p>
              <a href="/servicios" className="btn-primary w-full py-2.5 text-xs text-center block">
                Ver Catálogo
              </a>
            </div>
          </div>

          {/* Formulario */}
          <div className="lg:col-span-2 animate-fade-in">
            {sent ? (
              <div className="glass-card p-16 bg-surface/20 border-white/5 flex flex-col items-center justify-center text-center h-full min-h-[400px]">
                <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-6">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                </div>
                <h3 className="text-2xl font-display font-black uppercase tracking-tight mb-3">¡Mensaje Enviado!</h3>
                <p className="text-white/50 max-w-sm">
                  Hemos recibido tu mensaje. Te responderemos a <strong className="text-white">{formData.correo_remitente}</strong> en un máximo de 24 horas hábiles.
                </p>
                <button
                  onClick={() => setSent(false)}
                  className="mt-8 border border-white/10 px-8 py-3 rounded-xl text-xs font-bold uppercase hover:bg-white/5 transition-all"
                >
                  Enviar otro mensaje
                </button>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="glass-card p-8 md:p-10 bg-surface/20 border-white/5 space-y-6"
              >
                <div>
                  <h2 className="text-2xl font-display font-black uppercase tracking-tight mb-1">Envíanos un mensaje</h2>
                  <p className="text-white/40 text-sm">Todos los campos son obligatorios.</p>
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs py-3 px-4 rounded-xl">
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2">
                      Nombre completo
                    </label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                      <input
                        id="contact-name"
                        name="nombre_remitente"
                        type="text" required
                        className="w-full bg-background border border-white/10 rounded-xl pl-12 pr-4 py-3.5 focus:border-primary outline-none transition-colors text-sm"
                        placeholder="Tu nombre completo"
                        value={formData.nombre_remitente}
                        onChange={handleChange}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2">
                      Correo electrónico
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                      <input
                        id="contact-email"
                        name="correo_remitente"
                        type="email" required
                        className="w-full bg-background border border-white/10 rounded-xl pl-12 pr-4 py-3.5 focus:border-primary outline-none transition-colors text-sm"
                        placeholder="correo@ejemplo.com"
                        value={formData.correo_remitente}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2">
                    Asunto
                  </label>
                  <select
                    id="contact-subject"
                    name="asunto"
                    required
                    className="w-full bg-background border border-white/10 rounded-xl px-4 py-3.5 focus:border-primary outline-none transition-colors text-sm"
                    value={formData.asunto}
                    onChange={handleChange}
                  >
                    <option value="">Selecciona un asunto...</option>
                    <option value="Cotización de servicios">Cotización de servicios</option>
                    <option value="Consulta sobre reserva">Consulta sobre reserva existente</option>
                    <option value="Información general">Información general</option>
                    <option value="Soporte técnico">Soporte técnico</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2">
                    Mensaje
                  </label>
                  <div className="relative">
                    <MessageSquare className="absolute left-4 top-4 w-4 h-4 text-white/20" />
                    <textarea
                      id="contact-message"
                      name="mensaje"
                      required
                      rows={6}
                      className="w-full bg-background border border-white/10 rounded-xl pl-12 pr-4 py-3.5 focus:border-primary outline-none transition-colors text-sm resize-none"
                      placeholder="Cuéntanos sobre tu evento, fecha, tipo de servicio que necesitas, número de asistentes..."
                      value={formData.mensaje}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  id="contact-submit"
                  disabled={loading}
                  className="btn-primary w-full py-4 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Enviar Mensaje</span>
                    </>
                  )}
                </button>

                <p className="text-center text-[10px] text-white/20">
                  Tu información es confidencial y no será compartida con terceros.
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contacto;
