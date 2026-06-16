import React, { useState, useEffect } from 'react';
import { Calendar, MapPin, Users, Info, Send, CheckCircle2, Loader2, Plus, Trash2 } from 'lucide-react';
import api from '../api/client';
import { Servicio } from './Services';

const BookingForm = () => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [serviciosDisponibles, setServiciosDisponibles] = useState<Servicio[]>([]);
  
  const [formData, setFormData] = useState({
    nombre_evento: '',
    fecha_evento: '',
    hora_evento: '',
    lugar: '',
    municipio: '',
    asistentes: 0,
    observaciones: '',
    servicios_contratados: [] as any[]
  });

  useEffect(() => {
    api.get('/servicios/').then(res => setServiciosDisponibles(res.data));
  }, []);

  const addService = () => {
    setFormData({
      ...formData,
      servicios_contratados: [...formData.servicios_contratados, { servicio: '', tarifa: '', cantidad: 1, duracion_horas: 1 }]
    });
  };

  const removeService = (index: number) => {
    const updated = formData.servicios_contratados.filter((_, i) => i !== index);
    setFormData({ ...formData, servicios_contratados: updated });
  };

  const updateService = (index: number, field: string, value: any) => {
    const updated = formData.servicios_contratados.map((s, i) => {
      if (i === index) {
        const newService = { ...s, [field]: value };
        // Si cambia el servicio, resetear tarifa
        if (field === 'servicio') {
          const serv = serviciosDisponibles.find(sd => sd.id === parseInt(value));
          newService.tarifa = serv?.tarifas[0]?.id || '';
        }
        return newService;
      }
      return s;
    });
    setFormData({ ...formData, servicios_contratados: updated });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/reservas/', formData);
      setSubmitted(true);
    } catch (err) {
      console.error(err);
      alert('Error al crear la reserva. Asegúrate de estar logueado.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto py-20 text-center">
        <div className="flex justify-center mb-6 animate-fade-in-scale">
          <CheckCircle2 className="w-20 h-20 text-primary" />
        </div>
        <h2 className="text-3xl font-bold mb-4">¡Solicitud Enviada!</h2>
        <p className="text-white/60 mb-8">
          Hemos recibido tu solicitud. Un asesor se pondrá en contacto contigo pronto y hemos enviado la cotización a tu correo.
        </p>
        <button onClick={() => window.location.reload()} className="btn-primary">Nueva Solicitud</button>
      </div>
    );
  }

  return (
    <section className="py-24 px-6 max-w-4xl mx-auto">
      <div className="text-center mb-16">
        <h2 className="text-4xl font-display font-black tracking-tight mb-4 uppercase">
          Solicita tu <span className="text-primary">Evento</span>
        </h2>
        <p className="text-white/50">Completa los detalles para recibir una cotización automática.</p>
      </div>

      <form onSubmit={handleSubmit} className="glass-card bg-surface/20 p-8 md:p-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {/* Datos Básicos */}
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-white/40 mb-2">Nombre del Evento</label>
              <input 
                type="text" required
                className="w-full bg-background border border-white/10 rounded-xl px-4 py-3 focus:border-primary outline-none transition-colors"
                placeholder="Ej: Boda de Juan y Maria"
                value={formData.nombre_evento}
                onChange={e => setFormData({...formData, nombre_evento: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-white/40 mb-2">Fecha</label>
                <input 
                  type="date" required
                  className="w-full bg-background border border-white/10 rounded-xl px-4 py-3 focus:border-primary outline-none transition-colors"
                  value={formData.fecha_evento}
                  onChange={e => setFormData({...formData, fecha_evento: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-white/40 mb-2">Hora</label>
                <input 
                  type="time" required
                  className="w-full bg-background border border-white/10 rounded-xl px-4 py-3 focus:border-primary outline-none transition-colors"
                  value={formData.hora_evento}
                  onChange={e => setFormData({...formData, hora_evento: e.target.value})}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-white/40 mb-2">Lugar / Dirección</label>
              <input 
                type="text" required
                className="w-full bg-background border border-white/10 rounded-xl px-4 py-3 focus:border-primary outline-none transition-colors"
                placeholder="Hacienda, Club, Auditorio..."
                value={formData.lugar}
                onChange={e => setFormData({...formData, lugar: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-white/40 mb-2">Municipio</label>
              <input 
                type="text" required
                className="w-full bg-background border border-white/10 rounded-xl px-4 py-3 focus:border-primary outline-none transition-colors"
                placeholder="Medellín, Envigado..."
                value={formData.municipio}
                onChange={e => setFormData({...formData, municipio: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-white/40 mb-2">Número de Asistentes</label>
              <input 
                type="number" required
                className="w-full bg-background border border-white/10 rounded-xl px-4 py-3 focus:border-primary outline-none transition-colors"
                value={formData.asistentes}
                onChange={e => setFormData({...formData, asistentes: parseInt(e.target.value)})}
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-white/40 mb-2">Observaciones</label>
              <textarea 
                className="w-full bg-background border border-white/10 rounded-xl px-4 py-3 focus:border-primary outline-none transition-colors h-[108px]"
                placeholder="Detalles adicionales..."
                value={formData.observaciones}
                onChange={e => setFormData({...formData, observaciones: e.target.value})}
              />
            </div>
          </div>
        </div>

        {/* Selección de Servicios */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold uppercase tracking-tight">Servicios Requeridos</h3>
            <button 
              type="button" onClick={addService}
              className="flex items-center gap-2 text-sm font-bold text-primary hover:text-white transition-colors"
            >
              <Plus className="w-4 h-4" /> Añadir Servicio
            </button>
          </div>

          <div className="space-y-4">
            {formData.servicios_contratados.map((item, idx) => (
              <div 
                key={idx} 
                className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end bg-white/5 p-4 rounded-xl border border-white/5 animate-slide-up"
              >
                <div className="md:col-span-5">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2">Servicio</label>
                  <select 
                    required
                    className="w-full bg-background border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary"
                    value={item.servicio}
                    onChange={e => updateService(idx, 'servicio', e.target.value)}
                  >
                    <option value="">Seleccionar...</option>
                    {serviciosDisponibles.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2">Cant.</label>
                  <input 
                    type="number" required
                    className="w-full bg-background border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary"
                    value={item.cantidad}
                    onChange={e => updateService(idx, 'cantidad', e.target.value)}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2">Horas</label>
                  <input 
                    type="number" required step="0.5"
                    className="w-full bg-background border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary"
                    value={item.duracion_horas}
                    onChange={e => updateService(idx, 'duracion_horas', e.target.value)}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2">Tarifa</label>
                  <select 
                    required
                    className="w-full bg-background border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary"
                    value={item.tarifa}
                    onChange={e => updateService(idx, 'tarifa', e.target.value)}
                  >
                    {serviciosDisponibles.find(s => s.id === parseInt(item.servicio))?.tarifas.map(t => (
                      <option key={t.id} value={t.id}>{t.unidad} - ${parseFloat(t.precio_unitario).toLocaleString()}</option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-1 flex justify-center pb-2">
                  <button type="button" onClick={() => removeService(idx)} className="text-white/20 hover:text-red-500 transition-colors">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
            {formData.servicios_contratados.length === 0 && (
              <div className="text-center py-8 border-2 border-dashed border-white/5 rounded-2xl text-white/20 text-sm">
                No has añadido servicios aún.
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-center">
          <button 
            type="submit" 
            disabled={loading || formData.servicios_contratados.length === 0}
            className="btn-primary px-12 py-4 flex items-center gap-3 disabled:opacity-50 disabled:scale-100"
          >
            <span className="flex items-center gap-2">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              <span>Enviar Solicitud y Generar Cotización</span>
            </span>
          </button>
        </div>
      </form>
    </section>
  );
};

export default BookingForm;
