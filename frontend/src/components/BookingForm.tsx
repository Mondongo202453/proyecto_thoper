import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Loader2, Plus, Send, Trash2 } from 'lucide-react';
import api, { BACKEND_HOST } from '../api/client';
import axios from 'axios';
import { Servicio } from './Services';
import { calculateServicePrice, serviceTariffUnitLabel } from '../utils/pricing';
import municipiosPorDepartamento from '../data/colombianMunicipalities.json';

const FUENTE_MUNICIPIOS_URL = 'https://www.datos.gov.co/Mapas-Nacionales/DIVIPOLA-C%C3%B3digos-municipios/gdxc-w37w';

type HorarioOcupado = {
  inicio: string;
  fin: string;
  inicio_minutos?: number;
  fin_minutos?: number;
  inicio_dia_offset?: number;
  fin_dia_offset?: number;
};

type ServicioSeleccionado = {
  servicio: string;
  tarifa: string;
  cantidad: string;
};

type DatosSolicitud = {
  nombre_evento: string;
  fecha_evento: string;
  hora_evento: string;
  duracion_evento: number;
  lugar: string;
  municipio: string;
  asistentes: number | '';
  observaciones: string;
  servicios_contratados: ServicioSeleccionado[];
};

const datosSolicitudIniciales: DatosSolicitud = {
  nombre_evento: '',
  fecha_evento: '',
  hora_evento: '',
  duracion_evento: 1,
  lugar: '',
  municipio: '',
  asistentes: '',
  observaciones: '',
  servicios_contratados: [],
};

const minutos = (hora: string) => {
  const [horas, mins] = hora.split(':').map(Number);
  return horas * 60 + mins;
};

const horarioDisponible = (hora: string, duracion: number, ocupados: HorarioOcupado[]) => {
  if (!hora) return false;
  const inicio = minutos(hora);
  const fin = inicio + duracion * 60;
  return !ocupados.some((horario) => {
    const inicioOcupado = horario.inicio_minutos ?? minutos(horario.inicio);
    const finOcupado = horario.fin_minutos ?? minutos(horario.fin);
    return inicio < finOcupado && fin > inicioOcupado;
  });
};

const mensajeDeError = (error: unknown) => {
  if (!axios.isAxiosError(error)) {
    return 'No se pudo enviar la solicitud. Intenta de nuevo.';
  }

  const recopilarMensajes = (valor: unknown): string[] => {
    if (typeof valor === 'string') return [valor];
    if (Array.isArray(valor)) return valor.flatMap(recopilarMensajes);
    if (valor && typeof valor === 'object') {
      return Object.values(valor).flatMap(recopilarMensajes);
    }
    return [];
  };

  if (error.response?.status && error.response.status >= 500) {
    return `El servidor tuvo un problema al enviar la solicitud (código ${error.response.status}). Intenta nuevamente más tarde.`;
  }

  const mensajes = recopilarMensajes(error.response?.data);
  if (mensajes.length) return mensajes.join(' ');
  if (error.response?.status === 401) return 'Tu sesión expiró. Inicia sesión de nuevo para enviar la solicitud.';
  if (error.response) return `No se pudo enviar la solicitud (código ${error.response.status}). Revisa los datos e intenta de nuevo.`;
  return 'No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.';
};

const formatoMoneda = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

const fechaLocal = (fecha: Date) => {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
};

const BookingForm = () => {
  const [loading, setLoading] = useState(false);
  const [numeroSolicitud, setNumeroSolicitud] = useState('');
  const [serviciosDisponibles, setServiciosDisponibles] = useState<Servicio[]>([]);
  const [cargandoServicios, setCargandoServicios] = useState(true);
  const [error, setError] = useState('');
  const [horariosOcupados, setHorariosOcupados] = useState<HorarioOcupado[]>([]);
  const [consultandoDisponibilidad, setConsultandoDisponibilidad] = useState(false);
  const [disponibilidadError, setDisponibilidadError] = useState('');
  const [horaDisponible, setHoraDisponible] = useState<boolean | null>(null);
  const [formData, setFormData] = useState<DatosSolicitud>(datosSolicitudIniciales);
  const horasDisponibles = Array.from({ length: 48 }, (_, index) => {
    const totalMinutos = index * 30;
    const hora = `${String(Math.floor(totalMinutos / 60)).padStart(2, '0')}:${String(totalMinutos % 60).padStart(2, '0')}`;
    return hora;
  });
  const serviciosCompletos = formData.servicios_contratados.length > 0
    && formData.servicios_contratados.every((seleccion) => {
      const servicio = serviciosDisponibles.find((item) => item.id === Number(seleccion.servicio));
      const tarifa = servicio?.tarifas.find((item) =>
        item.id === Number(seleccion.tarifa) && item.activa !== false
      );
      const cantidad = Number(seleccion.cantidad);
      return Boolean(servicio && tarifa && Number.isInteger(cantidad) && cantidad >= (tarifa.cantidad_minima || 1));
    });
  const subtotalEstimado = formData.servicios_contratados.reduce((total, seleccion) => {
    const servicio = serviciosDisponibles.find((item) => item.id === Number(seleccion.servicio));
    const tarifa = servicio?.tarifas.find((item) => item.id === Number(seleccion.tarifa));
    const cantidad = Number(seleccion.cantidad);
    return tarifa && Number.isInteger(cantidad) && cantidad > 0
      ? total + calculateServicePrice(tarifa, cantidad, formData.duracion_evento)
      : total;
  }, 0);

  useEffect(() => {
    let cancelled = false;
    axios.get(`${BACKEND_HOST}/api/servicios/?disponible=true`)
      .then((response) => {
        if (cancelled) return;
        const servicios = Array.isArray(response.data) ? response.data : response.data?.results;
        if (!Array.isArray(servicios)) {
          throw new Error('La respuesta de servicios tiene un formato inesperado.');
        }
        setServiciosDisponibles(servicios.filter((servicio: Servicio) =>
          servicio.tarifas?.some((tarifa) => tarifa.activa !== false)
        ));
      })
      .catch((serviceError: unknown) => {
        if (cancelled) return;
        console.error('No se pudieron cargar los servicios disponibles:', serviceError);
        setError('No pudimos cargar los servicios disponibles. Actualiza la página para intentarlo de nuevo.');
      })
      .finally(() => {
        if (!cancelled) setCargandoServicios(false);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!formData.fecha_evento) {
      setHorariosOcupados([]);
      setHoraDisponible(null);
      setDisponibilidadError('');
      setConsultandoDisponibilidad(false);
      return;
    }

    let cancelled = false;
    const consultarDisponibilidad = async () => {
      setConsultandoDisponibilidad(true);
      setHoraDisponible(null);
      setDisponibilidadError('');
      try {
        const params = new URLSearchParams({ fecha: formData.fecha_evento });
        if (formData.hora_evento) params.set('hora', formData.hora_evento);
        params.set('duracion', String(formData.duracion_evento));
        const response = await axios.get(`${BACKEND_HOST}/api/reservas/disponibilidad/?${params.toString()}`);
        if (cancelled) return;
        const ocupados = response.data?.horarios_ocupados;
        const disponible = response.data?.disponible;
        if (
          !Array.isArray(ocupados)
          || (disponible !== null && typeof disponible !== 'boolean')
          || (formData.hora_evento && typeof disponible !== 'boolean')
        ) {
          throw new Error('El servidor devolvió una respuesta de disponibilidad inválida.');
        }
        setHorariosOcupados(ocupados);
        setHoraDisponible(disponible);
      } catch (availabilityErr) {
        if (cancelled) return;
        console.error('Error al consultar disponibilidad:', availabilityErr);
        const detail = axios.isAxiosError(availabilityErr) ? availabilityErr.response?.data?.detail : null;
        setDisponibilidadError(detail || 'No pudimos comprobar la disponibilidad. Intenta de nuevo antes de enviar la solicitud.');
        setHoraDisponible(false);
      } finally {
        if (!cancelled) setConsultandoDisponibilidad(false);
      }
    };

    consultarDisponibilidad();
    return () => { cancelled = true; };
  }, [formData.fecha_evento, formData.hora_evento, formData.duracion_evento]);

  const addService = () => {
    setFormData((current) => ({
      ...current,
      servicios_contratados: [
        ...current.servicios_contratados,
        { servicio: '', tarifa: '', cantidad: '1' },
      ],
    }));
  };

  const removeService = (index: number) => {
    setFormData((current) => ({
      ...current,
      servicios_contratados: current.servicios_contratados.filter((_, i) => i !== index),
    }));
  };

  const updateService = (index: number, changes: Partial<ServicioSeleccionado>) => {
    setFormData((current) => ({
      ...current,
      servicios_contratados: current.servicios_contratados.map((service, serviceIndex) =>
        serviceIndex === index ? { ...service, ...changes } : service
      ),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.servicios_contratados.length === 0) {
      setError('Debes agregar al menos un servicio.');
      return;
    }
    if (!formData.nombre_evento.trim() || !formData.lugar.trim() || !formData.municipio.trim()) {
      setError('Completa el nombre del evento, el lugar y el municipio.');
      return;
    }
    if (!formData.asistentes || formData.asistentes < 1) {
      setError('Indica al menos una persona asistente.');
      return;
    }
    const serviciosInvalidos = formData.servicios_contratados.some((seleccion) => {
      const servicio = serviciosDisponibles.find((item) => item.id === Number(seleccion.servicio));
      const tarifa = servicio?.tarifas.find((item) =>
        item.id === Number(seleccion.tarifa) && item.activa !== false
      );
      const cantidad = Number(seleccion.cantidad);
      return !servicio || !tarifa || !Number.isInteger(cantidad) || cantidad < (tarifa.cantidad_minima || 1);
    });
    if (serviciosInvalidos) {
      setError('Revisa los servicios, las tarifas y las cantidades seleccionadas.');
      return;
    }
    if (consultandoDisponibilidad || disponibilidadError || horaDisponible !== true) {
      setError(disponibilidadError || 'El horario seleccionado no está disponible. Elige otra hora.');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      if (!token || token === 'null' || token.trim().length === 0) {
        setError('Debes iniciar sesión para crear una reserva.');
        return;
      }

      const payload = {
        ...formData,
        nombre_evento: formData.nombre_evento.trim(),
        lugar: formData.lugar.trim(),
        municipio: formData.municipio.trim(),
        asistentes: Number(formData.asistentes),
        duracion_evento: Number(formData.duracion_evento),
        servicios_contratados: formData.servicios_contratados.map((service) => ({
          servicio: Number(service.servicio),
          tarifa: Number(service.tarifa),
          cantidad: Number(service.cantidad),
          duracion_horas: Number(formData.duracion_evento),
        }))
      };

      const response = await api.post('/reservas/', payload);
      const numero = response.data?.numero_solicitud;
      setNumeroSolicitud(typeof numero === 'string' && numero ? numero : 'Recibida');
    } catch (submitError: unknown) {
      console.error('No se pudo enviar la solicitud del evento:', submitError);
      setError(mensajeDeError(submitError));
    } finally {
      setLoading(false);
    }
  };

  if (numeroSolicitud) {
    return (
      <div className="booking-success-card">
        <div className="booking-success-content">
          <div className="booking-success-icon animate-fade-in-scale">
            <CheckCircle2 className="w-16 h-16 text-primary" />
          </div>
          <div className="booking-success-copy">
            <span className="text-primary text-[10px] font-bold uppercase tracking-[0.35em]">Topher Producciones</span>
            <h2 className="text-3xl sm:text-4xl font-display font-black uppercase mt-2 mb-4">¡Solicitud Enviada!</h2>
            <p className="text-white/60 max-w-xl mx-auto">
              Recibimos los datos de tu evento. Un asesor revisará la solicitud y se pondrá en contacto contigo.
            </p>
          </div>
          <div className="booking-success-actions">
            <p className="booking-success-note">
              Número de solicitud: <strong>{numeroSolicitud}</strong>. Podrás consultar su estado y los documentos disponibles desde <strong>Mis Reservas</strong>.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link to="/mis-reservas" className="btn-primary">Ver mis reservas</Link>
              <button
                type="button"
                onClick={() => {
                  setFormData(datosSolicitudIniciales);
                  setNumeroSolicitud('');
                  setError('');
                }}
                className="btn-outline"
              >
                Nueva solicitud
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <section className="min-h-screen py-16 sm:py-24 px-4 sm:px-6 max-w-4xl mx-auto">
      <div className="text-center mb-10 sm:mb-16">
        <h2 className="text-3xl sm:text-4xl font-display font-black tracking-tight mb-4 uppercase">
          Solicita tu <span className="text-primary">Evento</span>
        </h2>
        <p className="text-white/50">Cuéntanos qué necesitas. Completa los campos del formulario; los detalles adicionales son opcionales.</p>
      </div>

      <form onSubmit={handleSubmit} className="glass-card bg-surface/20 p-5 sm:p-8 md:p-12">
        {error && (
          <div role="alert" className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
            <p className="text-red-300 text-sm font-semibold">{error}</p>
            {(error.includes('iniciar sesión') || error.includes('Tu sesión expiró')) && (
              <Link to="/login" className="mt-2 inline-flex text-sm font-bold text-primary underline underline-offset-4">
                Iniciar sesión
              </Link>
            )}
          </div>
        )}
        
        <div className="mb-5">
          <h3 className="text-xl font-bold uppercase tracking-tight">Datos del evento</h3>
          <p className="mt-1 text-sm text-white/45">Indica cuándo y dónde se realizará.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <div className="space-y-6">
            <div>
              <div className="form-field-group">
                <input
                  id="nombre-evento"
                  type="text"
                  required
                  minLength={3}
                  maxLength={200}
                  autoComplete="off"
                  className="form-field"
                  placeholder=" "
                  value={formData.nombre_evento}
                  onChange={e => setFormData({...formData, nombre_evento: e.target.value})}
                />
                <label htmlFor="nombre-evento" className="form-field-label">Nombre del evento</label>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <div className="form-field-group">
                  <input
                    id="fecha-evento"
                    type="date"
                    required
                    min={fechaLocal(new Date())}
                    className="form-field form-field-date"
                    value={formData.fecha_evento}
                    onChange={e => {
                      setHorariosOcupados([]);
                      setHoraDisponible(null);
                      setDisponibilidadError('');
                      setFormData({...formData, fecha_evento: e.target.value, hora_evento: ''});
                    }}
                  />
                  <label htmlFor="fecha-evento" className="form-field-label form-field-label-static">Fecha del evento</label>
                </div>
              </div>
              <div className="form-field-group form-field-group-compact">
                <select
                  id="duracion-evento"
                  required
                  className="form-field form-field-date form-field-select"
                  value={String(formData.duracion_evento)}
                  onChange={(e) => setFormData({
                    ...formData,
                    duracion_evento: Number(e.target.value),
                    hora_evento: '',
                  })}
                >
                  <option value="1">1 hora</option>
                  <option value="2">2 horas</option>
                  <option value="3">3 horas (máximo)</option>
                </select>
                <label htmlFor="duracion-evento" className="form-field-label form-field-label-static">Duración del evento</label>
              </div>
              <div className="form-field-group form-field-group-compact">
                <select
                  id="hora-evento"
                  required
                  className="form-field form-field-date form-field-select"
                  value={formData.hora_evento}
                  disabled={!formData.fecha_evento}
                  aria-describedby="estado-disponibilidad"
                  onChange={(e) => setFormData({...formData, hora_evento: e.target.value})}
                >
                  <option value="">Selecciona una hora</option>
                  {horasDisponibles.map((hora) => {
                    const fechaEsHoy = formData.fecha_evento === fechaLocal(new Date());
                    const ahora = new Date();
                    const horaYaPaso = fechaEsHoy && minutos(hora) <= ahora.getHours() * 60 + ahora.getMinutes();
                    const libre = !horaYaPaso && horarioDisponible(hora, formData.duracion_evento, horariosOcupados);
                    return (
                      <option key={hora} value={hora} disabled={!libre}>
                        {hora}{libre ? '' : ' — No disponible'}
                      </option>
                    );
                  })}
                </select>
                <label htmlFor="hora-evento" className="form-field-label form-field-label-static">Hora de inicio</label>
              </div>
              <div id="estado-disponibilidad" className="min-h-5 text-xs" aria-live="polite">
                {consultandoDisponibilidad ? (
                  <span className="flex items-center gap-2 text-white/45"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Consultando horarios...</span>
                ) : disponibilidadError ? (
                  <span className="text-red-300">{disponibilidadError}</span>
                ) : formData.hora_evento && horaDisponible === true ? (
                  <span className="text-emerald-300">Horario disponible para el evento.</span>
                ) : formData.hora_evento && horaDisponible === false ? (
                  <span className="text-red-300">Ese horario se cruza con otra reserva. Elige otra hora.</span>
                ) : formData.fecha_evento && horariosOcupados.length > 0 ? (
                  <span className="text-amber-200/80">
                    Horarios ocupados:{' '}
                    {horariosOcupados.map((horario) => {
                      const inicio = `${horario.inicio}${horario.inicio_dia_offset ? ' (día anterior)' : ''}`;
                      const fin = `${horario.fin}${horario.fin_dia_offset ? ' (+1 día)' : ''}`;
                      return `${inicio}–${fin}`;
                    }).join(', ')}.
                  </span>
                ) : formData.fecha_evento ? (
                  <span className="text-emerald-300">No hay horarios reservados para esta fecha.</span>
                ) : null}
              </div>
            </div>
            <div>
              <div className="form-field-group">
                <input
                  id="lugar-evento"
                  type="text"
                  required
                  maxLength={200}
                  autoComplete="street-address"
                  className="form-field"
                  placeholder=" "
                  value={formData.lugar}
                  onChange={e => setFormData({...formData, lugar: e.target.value})}
                />
                <label htmlFor="lugar-evento" className="form-field-label">Lugar / dirección</label>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <div className="form-field-group form-field-group-compact">
                <select
                  id="municipio-evento"
                  required
                  autoComplete="address-level2"
                  className="form-field form-field-date form-field-select"
                  value={formData.municipio}
                  onChange={e => setFormData({...formData, municipio: e.target.value})}
                >
                  <option value="">Selecciona un municipio</option>
                  {municipiosPorDepartamento.map(({ department, municipalities }) => (
                    <optgroup key={department} label={department}>
                      {municipalities.map((municipality) => {
                        const value = municipality === department
                          ? municipality
                          : `${municipality}, ${department}`;
                        return (
                          <option key={value} value={value}>
                            {municipality}
                          </option>
                        );
                      })}
                    </optgroup>
                  ))}
                </select>
                <label htmlFor="municipio-evento" className="form-field-label form-field-label-static">Municipio</label>
                <p className="mt-1 text-xs text-white/40">
                  Listado DIVIPOLA de los 1.103 municipios de Colombia, agrupados por departamento.{' '}
                  <a
                    href={FUENTE_MUNICIPIOS_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline"
                  >
                    Ver fuente
                  </a>
                </p>
              </div>
            </div>
            <div>
              <div className="form-field-group">
                <input
                  id="asistentes-evento"
                  type="number"
                  required
                  min={1}
                  step={1}
                  inputMode="numeric"
                  className="form-field"
                  placeholder=" "
                  value={formData.asistentes}
                  onChange={e => setFormData({
                    ...formData,
                    asistentes: e.target.value === '' ? '' : e.target.valueAsNumber,
                  })}
                />
                <label htmlFor="asistentes-evento" className="form-field-label">Número de asistentes</label>
              </div>
            </div>
            <div>
              <div className="form-field-group form-field-group-textarea">
                <textarea
                  id="observaciones-evento"
                  className="form-field form-field-textarea"
                  placeholder=" "
                  value={formData.observaciones}
                  onChange={e => setFormData({...formData, observaciones: e.target.value})}
                />
                <label htmlFor="observaciones-evento" className="form-field-label">Detalles adicionales (opcional)</label>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-12">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <h3 className="text-xl font-bold uppercase tracking-tight">Servicios requeridos</h3>
              <p className="mt-1 text-sm text-white/45">Selecciona el servicio, su tarifa y la cantidad.</p>
            </div>
            <button 
              type="button"
              onClick={addService}
              disabled={cargandoServicios || serviciosDisponibles.length === 0 || loading}
              className="flex items-center justify-center gap-2 text-sm font-bold text-primary hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" /> Añadir servicio
            </button>
          </div>

          <div className="space-y-4">
            {cargandoServicios && (
              <p className="flex items-center gap-2 text-sm text-white/55" role="status">
                <Loader2 className="h-4 w-4 animate-spin" /> Cargando servicios y tarifas...
              </p>
            )}
            {!cargandoServicios && serviciosDisponibles.length === 0 && !error && (
              <p className="rounded-xl border border-amber-300/20 bg-amber-300/5 p-4 text-sm text-amber-100/80" role="status">
                No hay servicios con tarifas disponibles en este momento.
              </p>
            )}
            {formData.servicios_contratados.map((item, idx) => {
              const servicioSeleccionado = serviciosDisponibles.find(s => s.id === Number(item.servicio));
              const tarifasDisponibles = servicioSeleccionado?.tarifas.filter(tarifa => tarifa.activa !== false) || [];
              const tarifaSeleccionada = tarifasDisponibles.find(tarifa => tarifa.id === Number(item.tarifa));
              const cantidadMinima = tarifaSeleccionada?.cantidad_minima || 1;
              const imagenPrincipal = servicioSeleccionado?.imagenes?.find((img) => img.es_principal) ||
                                     servicioSeleccionado?.imagenes?.[0];
              return (
                <div
                  key={`${idx}-${item.servicio}`}
                  className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start bg-white/5 p-4 sm:p-5 rounded-xl border border-white/10"
                >
                  {imagenPrincipal && (
                    <div className="md:col-span-12 flex justify-center">
                      <img
                        src={imagenPrincipal.url_imagen}
                        alt={imagenPrincipal.alt_text || servicioSeleccionado?.nombre || ''}
                        className="h-32 max-w-full object-cover rounded-lg border border-white/10"
                        onError={(event) => { event.currentTarget.hidden = true; }}
                      />
                    </div>
                  )}

                  <div className="md:col-span-5">
                    <div className="form-field-group form-field-group-compact">
                      <select
                        id={`servicio-${idx}`}
                        required
                        className="form-field form-field-date form-field-select"
                        value={item.servicio}
                        onChange={(event) => {
                          const siguienteServicio = serviciosDisponibles.find(
                            (servicio) => servicio.id === Number(event.target.value)
                          );
                          const primeraTarifa = siguienteServicio?.tarifas.find((tarifa) => tarifa.activa !== false);
                          updateService(idx, {
                            servicio: event.target.value,
                            tarifa: primeraTarifa ? String(primeraTarifa.id) : '',
                            cantidad: String(Math.max(
                              Number(item.cantidad) || 1,
                              primeraTarifa?.cantidad_minima || 1
                            )),
                          });
                        }}
                      >
                        <option value="">Selecciona un servicio</option>
                        {serviciosDisponibles.map((servicio) => (
                          <option key={servicio.id} value={servicio.id}>{servicio.nombre}</option>
                        ))}
                      </select>
                      <label htmlFor={`servicio-${idx}`} className="form-field-label form-field-label-static">Servicio</label>
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <div className="form-field-group form-field-group-compact">
                      <input
                        id={`cantidad-${idx}`}
                        type="number"
                        required
                        min={cantidadMinima}
                        step={1}
                        inputMode="numeric"
                        className="form-field"
                        placeholder=" "
                        value={item.cantidad}
                        onChange={(event) => updateService(idx, { cantidad: event.target.value })}
                      />
                      <label htmlFor={`cantidad-${idx}`} className="form-field-label form-field-label-static">
                        Cantidad{cantidadMinima > 1 ? ` (mín. ${cantidadMinima})` : ''}
                      </label>
                    </div>
                  </div>
                  <div className="md:col-span-4">
                    <div className="form-field-group form-field-group-compact">
                      <select
                        id={`tarifa-${idx}`}
                        required
                        disabled={!servicioSeleccionado || tarifasDisponibles.length === 0}
                        className="form-field form-field-date form-field-select"
                        value={item.tarifa}
                        onChange={(event) => {
                          const siguienteTarifa = tarifasDisponibles.find(
                            (tarifa) => tarifa.id === Number(event.target.value)
                          );
                          updateService(idx, {
                            tarifa: event.target.value,
                            cantidad: String(Math.max(
                              Number(item.cantidad) || 1,
                              siguienteTarifa?.cantidad_minima || 1
                            )),
                          });
                        }}
                      >
                        <option value="">Selecciona una tarifa</option>
                        {tarifasDisponibles.map((tarifa) => (
                          <option key={tarifa.id} value={tarifa.id}>
                            {serviceTariffUnitLabel(tarifa.unidad)}
                            {' · '}{formatoMoneda.format(Number(tarifa.precio_unitario))}
                          </option>
                        ))}
                      </select>
                      <label htmlFor={`tarifa-${idx}`} className="form-field-label form-field-label-static">Tarifa</label>
                    </div>
                  </div>
                  <div className="md:col-span-1 flex justify-end md:justify-center md:pt-5">
                    <button
                      type="button"
                      onClick={() => removeService(idx)}
                      disabled={loading}
                      aria-label={`Quitar ${servicioSeleccionado?.nombre || 'servicio'}`}
                      className="flex items-center gap-2 text-white/55 hover:text-red-300 transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="h-5 w-5" />
                      <span className="md:hidden">Quitar</span>
                    </button>
                  </div>
                  {tarifaSeleccionada && Number.isInteger(Number(item.cantidad)) && Number(item.cantidad) >= cantidadMinima && (
                    <p className="md:col-span-12 text-right text-sm text-white/65">
                      Subtotal estimado{tarifaSeleccionada.unidad === 'hora'
                        ? ` · ${item.cantidad} × ${formData.duracion_evento} h`
                        : ` · ${item.cantidad} ${item.cantidad === '1' ? 'unidad/show' : 'unidades/shows'}`}: <strong className="text-white">
                        {formatoMoneda.format(calculateServicePrice(
                          tarifaSeleccionada,
                          Number(item.cantidad),
                          formData.duracion_evento,
                        ))}
                      </strong>
                    </p>
                  )}
                </div>
              );
            })}
            {formData.servicios_contratados.length === 0 && (
              <div className="text-center py-8 border-2 border-dashed border-white/10 rounded-2xl text-white/45 text-sm">
                Aún no agregas servicios. Añade al menos uno para preparar la solicitud.
              </div>
            )}
          </div>
        </div>

        {serviciosCompletos && (
          <div className="mb-8 flex flex-col gap-1 rounded-xl border border-primary/25 bg-primary/5 p-4 text-right sm:flex-row sm:items-center sm:justify-between">
            <div className="text-left">
              <p className="text-sm text-white/75">Estimado de servicios · {formData.duracion_evento} {formData.duracion_evento === 1 ? 'hora' : 'horas'}</p>
              <p className="text-xs text-white/45">La tarifa por hora se multiplica por la duración. Las tarifas por unidad o show se cobran por cantidad, sin multiplicar por horas.</p>
            </div>
            <strong className="text-xl text-primary">{formatoMoneda.format(subtotalEstimado)}</strong>
          </div>
        )}

        <div className="flex flex-col items-center gap-3">
          {!horaDisponible && formData.fecha_evento && !disponibilidadError && !consultandoDisponibilidad && (
            <p className="text-center text-sm text-white/50">Selecciona una fecha y una hora disponible para continuar.</p>
          )}
          <button 
            type="submit" 
            disabled={loading || cargandoServicios || serviciosDisponibles.length === 0 || consultandoDisponibilidad}
            className="btn-primary px-12 py-4 flex items-center gap-3 disabled:opacity-50 disabled:scale-100"
          >
            <span className="flex items-center gap-2">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              <span>{loading ? 'Enviando solicitud...' : 'Enviar solicitud'}</span>
            </span>
          </button>
        </div>
      </form>
    </section>
  );
};

export default BookingForm;
