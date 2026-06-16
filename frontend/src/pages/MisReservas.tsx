import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Flame, Calendar, MapPin, Users, Clock, FileText, Download,
  AlertTriangle, CheckCircle2, X, Loader2, ArrowLeft, ChevronRight,
  XCircle, LogOut
} from 'lucide-react';
import api from '../api/client';

const STATUS_COLORS: Record<number, string> = {
  4: 'bg-amber-500/10 border-amber-500/30 text-amber-400',   // Pendiente
  5: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400', // Confirmada
  6: 'bg-blue-500/10 border-blue-500/30 text-blue-400',      // En Proceso
  7: 'bg-red-500/10 border-red-500/30 text-red-400',          // Cancelada
  8: 'bg-purple-500/10 border-purple-500/30 text-purple-400', // Completada
};

const STATUS_LABELS: Record<number, string> = {
  4: 'Pendiente', 5: 'Confirmada', 6: 'En Proceso', 7: 'Cancelada', 8: 'Completada'
};

interface Reserva {
  id: number;
  numero_solicitud: string;
  nombre_evento: string;
  fecha_evento: string;
  hora_evento: string;
  lugar: string;
  municipio: string;
  asistentes: number;
  observaciones: string;
  status_id: number;
  status_nombre: string;
  servicios_contratados: any[];
  creado_en: string;
}

const MisReservas = () => {
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Reserva | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Reserva | null>(null);
  const [motivoCancelacion, setMotivoCancelacion] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [documentos, setDocumentos] = useState<any[]>([]);
  const navigate = useNavigate();

  const userRaw = localStorage.getItem('user');
  const user = userRaw ? JSON.parse(userRaw) : null;

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) { navigate('/login'); return; }
    fetchReservas();
  }, []);

  const fetchReservas = async () => {
    setLoading(true);
    try {
      const res = await api.get('/reservas/');
      setReservas(Array.isArray(res.data) ? res.data : res.data.results || []);
    } catch {
      showToast('No se pudieron cargar tus reservas.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchDocumentos = async (reservaId: number) => {
    try {
      const res = await api.get(`/reservas/${reservaId}/documentos/`);
      setDocumentos(res.data || []);
    } catch {
      setDocumentos([]);
    }
  };

  const handleSelectReserva = (r: Reserva) => {
    setSelected(r);
    fetchDocumentos(r.id);
  };

  const handleCancelar = async () => {
    if (!cancelTarget) return;
    setCancelLoading(true);
    try {
      await api.post(`/reservas/${cancelTarget.id}/cancelar/`, { motivo: motivoCancelacion });
      showToast('Reserva cancelada correctamente.');
      setCancelTarget(null);
      setMotivoCancelacion('');
      setSelected(null);
      fetchReservas();
    } catch (err: any) {
      showToast(err?.response?.data?.detail || 'No se pudo cancelar la reserva.', 'error');
    } finally {
      setCancelLoading(false);
    }
  };

  const logout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const canCancel = (r: Reserva) => [4, 5].includes(r.status_id);
  const totalMonto = (r: Reserva) => {
    return r.servicios_contratados?.reduce((sum: number, s: any) => sum + parseFloat(s.precio_calculado || 0), 0) || 0;
  };

  return (
    <div className="min-h-screen bg-background text-white flex flex-col">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-white/5 h-20 px-6 flex items-center justify-between">
        <Link to="/" className="flex flex-col group">
          <span className="text-2xl font-display font-black tracking-tighter uppercase leading-none group-hover:text-primary transition-colors">Topher</span>
          <div className="h-[1px] w-full bg-white/20 my-0.5" />
          <span className="text-[7px] font-medium tracking-[0.7em] uppercase text-white/40">Producciones</span>
        </Link>
        <div className="flex items-center gap-4">
          <span className="hidden md:block text-xs text-white/40">
            Hola, <strong className="text-white">{user?.nombre_completo}</strong>
          </span>
          <button onClick={logout} className="flex items-center gap-2 border border-white/10 px-4 py-2 rounded-xl text-xs font-bold text-red-400 hover:bg-red-500/10 transition-all">
            <LogOut className="w-4 h-4" /> Salir
          </button>
        </div>
      </header>

      <main className="flex-1 pt-28 pb-16 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="mb-10">
            <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-primary">Panel de Cliente</span>
            <h1 className="text-4xl md:text-5xl font-display font-black uppercase tracking-tight mt-2 mb-2">Mis Reservas</h1>
            <p className="text-white/40">Consulta el historial y estado de todas tus solicitudes.</p>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
            <div className="flex gap-4 text-center">
              <div className="glass-card px-6 py-4 bg-surface/20 border-white/5">
                <div className="text-2xl font-display font-black text-white">{reservas.length}</div>
                <div className="text-[9px] text-white/30 uppercase tracking-widest">Total</div>
              </div>
              <div className="glass-card px-6 py-4 bg-surface/20 border-white/5">
                <div className="text-2xl font-display font-black text-amber-400">
                  {reservas.filter(r => r.status_id === 4).length}
                </div>
                <div className="text-[9px] text-white/30 uppercase tracking-widest">Pendientes</div>
              </div>
              <div className="glass-card px-6 py-4 bg-surface/20 border-white/5">
                <div className="text-2xl font-display font-black text-emerald-400">
                  {reservas.filter(r => r.status_id === 5).length}
                </div>
                <div className="text-[9px] text-white/30 uppercase tracking-widest">Confirmadas</div>
              </div>
            </div>
            <Link to="/servicios" className="btn-primary px-6 py-3 text-xs flex items-center gap-2">
              Nueva Solicitud <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : reservas.length === 0 ? (
            <div className="glass-card p-16 bg-surface/20 border-white/5 text-center">
              <Flame className="w-12 h-12 text-primary/30 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">Aún no tienes reservas</h3>
              <p className="text-white/40 text-sm mb-6">Explora nuestro catálogo y solicita tu primer servicio especial.</p>
              <Link to="/servicios" className="btn-primary px-8 py-3 inline-block">Ver Catálogo</Link>
            </div>
          ) : (
            <div className="space-y-4">
              {reservas.map(r => (
                <div
                  key={r.id}
                  className="glass-card p-6 bg-surface/20 border-white/5 cursor-pointer hover:border-primary/20 hover:bg-primary/5 transition-all"
                  onClick={() => handleSelectReserva(r)}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="bg-primary/10 border border-primary/20 p-2.5 rounded-xl text-primary flex-shrink-0">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-3 flex-wrap mb-1">
                          <h3 className="font-bold text-sm">{r.nombre_evento}</h3>
                          <span className="text-[9px] font-bold text-primary/70 bg-primary/5 border border-primary/15 px-2 py-0.5 rounded-full">
                            {r.numero_solicitud}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/40">
                          <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{r.lugar}, {r.municipio}</span>
                          <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{r.fecha_evento}</span>
                          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{r.hora_evento}</span>
                          <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{r.asistentes?.toLocaleString()} asistentes</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <span className={`text-[9px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full border ${STATUS_COLORS[r.status_id] || 'bg-white/5 border-white/10 text-white/50'}`}>
                        {r.status_nombre || STATUS_LABELS[r.status_id]}
                      </span>
                      <span className="text-sm font-bold font-display text-white/80">
                        ${totalMonto(r).toLocaleString()} COP
                      </span>
                      <ChevronRight className="w-4 h-4 text-white/20" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* ── MODAL DE DETALLE DE RESERVA ── */}
      {selected && (
        <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex items-start justify-center p-6 overflow-y-auto">
          <div className="bg-surface border border-white/10 w-full max-w-2xl rounded-2xl shadow-2xl my-8 animate-fade-in-scale">
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-display font-black uppercase tracking-tight">{selected.nombre_evento}</h3>
                <span className="text-xs text-primary">{selected.numero_solicitud}</span>
              </div>
              <button onClick={() => setSelected(null)} className="p-2 hover:bg-white/5 rounded-xl transition-all">
                <X className="w-5 h-5 text-white/40" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Estado */}
              <div className="flex items-center gap-3">
                <span className={`text-[9px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full border ${STATUS_COLORS[selected.status_id]}`}>
                  {selected.status_nombre || STATUS_LABELS[selected.status_id]}
                </span>
                <span className="text-xs text-white/40">Solicitada el {new Date(selected.creado_en).toLocaleDateString('es-CO')}</span>
              </div>

              {/* Info del evento */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-[10px] text-white/30 uppercase tracking-widest mb-1">Fecha y hora</div>
                  <div className="font-bold">{selected.fecha_evento} · {selected.hora_evento}</div>
                </div>
                <div>
                  <div className="text-[10px] text-white/30 uppercase tracking-widest mb-1">Asistentes</div>
                  <div className="font-bold">{selected.asistentes?.toLocaleString()}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-[10px] text-white/30 uppercase tracking-widest mb-1">Lugar</div>
                  <div className="font-bold">{selected.lugar}, {selected.municipio}</div>
                </div>
                {selected.observaciones && (
                  <div className="col-span-2">
                    <div className="text-[10px] text-white/30 uppercase tracking-widest mb-1">Observaciones</div>
                    <div className="text-white/60 text-xs">{selected.observaciones}</div>
                  </div>
                )}
              </div>

              {/* Servicios contratados */}
              {selected.servicios_contratados?.length > 0 && (
                <div>
                  <div className="text-[10px] text-white/30 uppercase tracking-widest mb-3">Servicios Contratados</div>
                  <div className="space-y-2">
                    {selected.servicios_contratados.map((s: any, i: number) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-xl text-sm">
                        <span className="text-white/80">{s.servicio_nombre || `Servicio #${s.servicio}`}</span>
                        <span className="font-bold text-white">${parseFloat(s.precio_calculado).toLocaleString()}</span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between p-3 bg-primary/10 border border-primary/20 rounded-xl">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Total Estimado</span>
                      <span className="font-display font-black text-primary">${totalMonto(selected).toLocaleString()} COP</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Documentos PDF */}
              {documentos.length > 0 && (
                <div>
                  <div className="text-[10px] text-white/30 uppercase tracking-widest mb-3">Documentos</div>
                  <div className="space-y-2">
                    {documentos.map((doc: any, i: number) => (
                      <a
                        key={i}
                        href={`http://localhost:8000${doc.url_pdf}`}
                        target="_blank" rel="noreferrer"
                        className="flex items-center justify-between p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-all group"
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="w-4 h-4 text-primary" />
                          <span className="text-sm capitalize">{doc.tipo.replace('_', ' ')}</span>
                        </div>
                        <Download className="w-4 h-4 text-white/30 group-hover:text-primary transition-colors" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Acciones */}
              <div className="flex gap-3 pt-2 border-t border-white/5">
                {canCancel(selected) && (
                  <button
                    onClick={() => setCancelTarget(selected)}
                    className="flex items-center gap-2 border border-red-500/20 text-red-400 px-5 py-2.5 rounded-xl text-xs font-bold uppercase hover:bg-red-500/10 transition-all"
                  >
                    <XCircle className="w-4 h-4" /> Cancelar Reserva
                  </button>
                )}
                <button
                  onClick={() => setSelected(null)}
                  className="ml-auto border border-white/10 px-5 py-2.5 rounded-xl text-xs font-bold uppercase hover:bg-white/5 transition-all"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL DE CANCELACIÓN ── */}
      {cancelTarget && (
        <div className="fixed inset-0 z-[200] bg-background/80 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-surface border border-white/10 w-full max-w-md p-8 rounded-2xl shadow-2xl animate-fade-in-scale">
            <div className="flex items-center justify-center w-12 h-12 bg-red-500/20 text-red-500 rounded-full mb-6 mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold uppercase tracking-tight text-center mb-2">Cancelar Reserva</h3>
            <p className="text-white/50 text-sm text-center mb-6">
              ¿Seguro que deseas cancelar <strong className="text-white">{cancelTarget.nombre_evento}</strong>?
              Solo puedes cancelar con más de 72 horas de anticipación.
            </p>
            <textarea
              placeholder="Motivo de cancelación (opcional)"
              rows={3}
              className="w-full bg-background border border-white/10 rounded-xl px-4 py-3 text-sm mb-4 outline-none focus:border-primary transition-colors resize-none"
              value={motivoCancelacion}
              onChange={e => setMotivoCancelacion(e.target.value)}
            />
            <div className="flex gap-3">
              <button onClick={() => { setCancelTarget(null); setMotivoCancelacion(''); }}
                className="flex-1 py-3 border border-white/10 rounded-xl text-sm font-bold uppercase hover:bg-white/5 transition-all">
                Volver
              </button>
              <button onClick={handleCancelar} disabled={cancelLoading}
                className="flex-1 py-3 bg-red-500 hover:bg-red-600 rounded-xl text-sm font-bold uppercase transition-all flex items-center justify-center gap-2">
                {cancelLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[300] flex items-center gap-3 px-5 py-4 rounded-xl border shadow-xl animate-slide-up ${
          toast.type === 'success' ? 'bg-emerald-950/80 border-emerald-500/30 text-emerald-300' : 'bg-red-950/80 border-red-500/30 text-red-300'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          <span className="text-xs font-semibold">{toast.msg}</span>
        </div>
      )}
    </div>
  );
};

export default MisReservas;
