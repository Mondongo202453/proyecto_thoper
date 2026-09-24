import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Flame, Calendar, MapPin, Users, Clock, FileText, Download,
  AlertTriangle, CheckCircle2, X, Loader2, ArrowLeft, ChevronRight,
  XCircle, LogOut, Bell, RefreshCw, ChevronDown, Menu, CreditCard
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

const normalizeReserva = (reserva: any): Reserva => ({
  ...reserva,
  status_id: Number(reserva?.status_id ?? reserva?.status?.id ?? reserva?.status ?? 0),
  status_nombre: reserva?.status_nombre || reserva?.status?.nombre || STATUS_LABELS[
    Number(reserva?.status_id ?? reserva?.status?.id ?? reserva?.status)
  ] || 'Desconocido',
});

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

interface Notificacion {
  id: number;
  reserva?: number | null;
  asunto: string;
  mensaje: string;
  leido: boolean;
  enviado_en: string;
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
  const [downloadingDocumentId, setDownloadingDocumentId] = useState<number | null>(null);
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const lastNotificationId = useRef<number | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [expandedNotificationId, setExpandedNotificationId] = useState<number | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [pagos, setPagos] = useState<any[]>([]);
  const [paymentLoading, setPaymentLoading] = useState<string | null>(null);
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
    fetchNotificaciones();

    const syncInterval = window.setInterval(() => {
      fetchReservas(true);
      fetchNotificaciones();
    }, 10000);

    return () => window.clearInterval(syncInterval);
  }, []);

  const fetchReservas = async (background = false) => {
    if (!background) setLoading(true);
    else setSyncing(true);
    try {
      const res = await api.get('/reservas/');
      const nextReservas = (Array.isArray(res.data) ? res.data : res.data.results || []).map(normalizeReserva);
      setReservas(nextReservas);
      setSelected((current) => current ? nextReservas.find((r: Reserva) => r.id === current.id) || current : current);
    } catch {
      if (!background) showToast('No se pudieron cargar tus reservas.', 'error');
    } finally {
      if (!background) setLoading(false);
      else setSyncing(false);
    }
  };

  const fetchNotificaciones = async () => {
    try {
      const res = await api.get('/notificaciones/');
      const nextNotificaciones: Notificacion[] = (Array.isArray(res.data) ? res.data : res.data.results || [])
        .sort((a: Notificacion, b: Notificacion) =>
          new Date(b.enviado_en).getTime() - new Date(a.enviado_en).getTime()
        );
      setNotificaciones(nextNotificaciones);

      const newest = nextNotificaciones[0];
      if (newest && newest.id !== lastNotificationId.current) {
        if (lastNotificationId.current !== null) {
          showToast(`${newest.asunto}: ${newest.mensaje}`);
        }
        lastNotificationId.current = newest.id;
      }
    } catch {
      // La pantalla de reservas sigue funcionando aunque las notificaciones no estén disponibles.
    }
  };

  const markNotificationRead = async (notification: Notificacion) => {
    if (notification.leido) return;
    try {
      await api.patch(`/notificaciones/${notification.id}/`, { leido: true });
      setNotificaciones((current) => current.map((item) =>
        item.id === notification.id ? { ...item, leido: true } : item
      ));
    } catch {
      showToast('No se pudo marcar el aviso como leído.', 'error');
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
    api.get(`/pagos/reserva/${r.id}/`).then((res) => setPagos(res.data || [])).catch(() => setPagos([]));
  };

  const iniciarPago = async (tipo: 'ANTICIPO' | 'TOTAL') => {
    if (!selected) return;
    setPaymentLoading(tipo);
    try {
      const response = await api.post('/pagos/crear/', { reserva_id: selected.id, tipo });
      if (!response.data.checkout_url) throw new Error('No se recibió el enlace de pago.');
      window.location.assign(response.data.checkout_url);
    } catch (error: any) {
      showToast(error?.response?.data?.detail || 'No se pudo iniciar el pago.', 'error');
    } finally {
      setPaymentLoading(null);
    }
  };

  const handleDownloadDocument = async (doc: any) => {
    setDownloadingDocumentId(doc.id);
    try {
      const response = await api.get(`/cotizaciones/${doc.id}/download/`, {
        responseType: 'blob',
      });
      const contentType = response.headers['content-type'] || 'application/pdf';
      const blob = new Blob([response.data], { type: contentType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${doc.tipo || 'documento'}-topher.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      const message = error?.response?.data?.detail || 'No se pudo descargar el documento.';
      showToast(message, 'error');
    } finally {
      setDownloadingDocumentId(null);
    }
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
  const unreadNotifications = notificaciones.filter((notification) => !notification.leido).length;

  return (
    <div className="min-h-screen bg-background text-white flex flex-col">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-white/5 h-20 px-6 flex items-center justify-between">
        <Link to="/" className="flex flex-col group">
          <span className="text-2xl font-display font-black tracking-tighter uppercase leading-none group-hover:text-primary transition-colors">Topher</span>
          <div className="h-[1px] w-full bg-white/20 my-0.5" />
          <span className="text-[7px] font-medium tracking-[0.7em] uppercase text-white/40">Producciones</span>
        </Link>
        <div className="flex items-center gap-2 sm:gap-4">
          <span className="hidden md:block text-xs text-white/40">
            Hola, <strong className="text-white">{user?.nombre_completo}</strong>
          </span>
          <button
            type="button"
            className="md:hidden rounded-lg p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            onClick={() => setMobileNavOpen((open) => !open)}
            aria-label={mobileNavOpen ? 'Cerrar barra de navegación' : 'Abrir barra de navegación'}
            aria-expanded={mobileNavOpen}
            aria-controls="client-mobile-navigation"
          >
            {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <button onClick={logout} className="logout-button" aria-label="Salir">
            <span className="logout-icon"><LogOut className="w-4 h-4" /></span>
            <span className="logout-label">Salir</span>
          </button>
        </div>
        {mobileNavOpen && (
          <nav
            id="client-mobile-navigation"
            className="fixed inset-0 z-[60] flex min-h-dvh flex-col bg-[#060606] px-7 pb-10 pt-5 shadow-[0_20px_50px_rgba(0,0,0,0.65)] md:hidden"
            aria-label="Navegación principal"
          >
            <div className="flex items-start justify-between border-b border-white/10 pb-5">
              <Link to="/" onClick={() => setMobileNavOpen(false)} className="flex flex-col leading-none">
                <span className="text-2xl font-display font-black tracking-tighter uppercase text-white">Topher</span>
                <span className="mt-1 text-[7px] font-medium tracking-[0.7em] uppercase text-white/45">Producciones</span>
              </Link>
              <button
                type="button"
                onClick={() => setMobileNavOpen(false)}
                className="rounded-lg p-1 text-white transition-colors hover:bg-white/10 hover:text-primary"
                aria-label="Cerrar barra de navegación"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="flex flex-col gap-7 pt-9">
              {[
                ['Inicio', '/'],
                ['Servicios', '/servicios'],
                ['Portafolio', '/portafolio'],
                ['Solicitud', '/solicitud'],
              ].map(([label, path], index) => (
                <Link
                  key={path}
                  to={path}
                  onClick={() => setMobileNavOpen(false)}
                  className={`text-left text-xl font-bold uppercase tracking-[0.12em] transition-colors hover:text-primary ${
                    index === 3 ? 'text-primary' : 'text-white'
                  }`}
                >
                  {label}
                </Link>
              ))}
            </div>
          </nav>
        )}
      </header>

      <main className="flex-1 pt-28 pb-16 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="mb-10">
            <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-primary">Panel de Cliente</span>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-display font-black uppercase tracking-tight mt-2 mb-2">Mis Reservas</h1>
            <p className="text-white/40">Consulta el historial y estado de todas tus solicitudes.</p>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
            <div className="flex flex-wrap gap-3 sm:gap-4 text-center">
              <div className="glass-card px-4 sm:px-6 py-4 bg-surface/20 border-white/5">
                <div className="text-2xl font-display font-black text-white">{reservas.length}</div>
                <div className="text-[9px] text-white/30 uppercase tracking-widest">Total</div>
              </div>
              <div className="glass-card px-4 sm:px-6 py-4 bg-surface/20 border-white/5">
                <div className="text-2xl font-display font-black text-amber-400">
                  {reservas.filter(r => r.status_id === 4).length}
                </div>
                <div className="text-[9px] text-white/30 uppercase tracking-widest">Pendientes</div>
              </div>
              <div className="glass-card px-4 sm:px-6 py-4 bg-surface/20 border-white/5">
                <div className="text-2xl font-display font-black text-emerald-400">
                  {reservas.filter(r => r.status_id === 5).length}
                </div>
                <div className="text-[9px] text-white/30 uppercase tracking-widest">Confirmadas</div>
              </div>
              <div className="glass-card px-4 sm:px-6 py-4 bg-surface/20 border-white/5">
                <div className="text-2xl font-display font-black text-blue-400">
                  {reservas.filter(r => r.status_id === 6).length}
                </div>
                <div className="text-[9px] text-white/30 uppercase tracking-widest">En proceso</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 text-[10px] text-white/40" aria-live="polite">
                <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin text-primary' : ''}`} />
                {syncing ? 'Actualizando...' : 'Actualización automática'}
              </div>
              <Link to="/servicios" className="btn-primary px-6 py-3 text-xs flex items-center gap-2">
                Nueva Solicitud <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {notificaciones.length > 0 && (
            <section className="mb-8 glass-card p-4 sm:p-5 bg-primary/5 border-primary/20" aria-label="Notificaciones">
              <div className={`flex items-center justify-between gap-3 ${notificationsOpen ? 'mb-4' : ''}`}>
                <div className="flex items-center gap-3">
                  <div className="relative text-primary">
                    <Bell className="w-5 h-5" />
                    {unreadNotifications > 0 && (
                      <span className="absolute -right-2 -top-2 min-w-4 h-4 px-1 rounded-full bg-primary text-[9px] font-bold text-black flex items-center justify-center">
                        {unreadNotifications}
                      </span>
                    )}
                  </div>
                  <div>
                    <h2 className="text-xs font-bold uppercase tracking-widest text-primary">Notificaciones</h2>
                    <p className="text-[11px] text-white/40">{notificaciones.length} avisos recibidos</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-semibold text-primary transition-colors hover:bg-primary/10"
                  onClick={() => setNotificationsOpen((open) => !open)}
                  aria-expanded={notificationsOpen}
                  aria-controls="client-notifications-list"
                >
                  {notificationsOpen ? 'Ocultar' : 'Mostrar'}
                  <ChevronDown className={`w-4 h-4 transition-transform ${notificationsOpen ? 'rotate-180' : ''}`} />
                </button>
              </div>
              {notificationsOpen && <div id="client-notifications-list" className="space-y-2">
                {notificaciones.map((notification) => {
                  const expanded = expandedNotificationId === notification.id;
                  return (
                    <div key={notification.id} className={`rounded-xl border transition-colors ${
                      notification.leido ? 'border-white/5 bg-black/10' : 'border-primary/25 bg-primary/10'
                    }`}>
                      <button
                        type="button"
                        className="w-full text-left p-3 flex items-start gap-3"
                        onClick={() => {
                          setExpandedNotificationId(expanded ? null : notification.id);
                          markNotificationRead(notification);
                        }}
                        aria-expanded={expanded}
                      >
                        <span className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${notification.leido ? 'bg-white/20' : 'bg-primary'}`} />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center justify-between gap-2">
                            <span className="text-sm font-semibold text-white truncate">{notification.asunto}</span>
                            <ChevronDown className={`w-4 h-4 flex-shrink-0 text-primary transition-transform ${expanded ? 'rotate-180' : ''}`} />
                          </span>
                          <span className="block text-[10px] text-white/40 mt-1">
                            {new Date(notification.enviado_en).toLocaleString('es-CO')}
                          </span>
                        </span>
                      </button>
                      {expanded && (
                        <div className="px-8 pb-4 text-sm leading-relaxed text-white/75 whitespace-pre-wrap">
                          {notification.mensaje}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>}
            </section>
          )}

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
                    <div className={`mt-4 rounded-xl border p-4 ${
                      [5, 6, 8].includes(selected.status_id)
                        ? 'border-emerald-500/20 bg-emerald-500/5'
                        : 'border-white/10 bg-white/[.03]'
                    }`}>
                        <div className="mb-3 flex items-center gap-2">
                          <CreditCard className={`h-4 w-4 ${[5, 6, 8].includes(selected.status_id) ? 'text-emerald-300' : 'text-white/40'}`} />
                          <span className={`text-[10px] font-bold uppercase tracking-widest ${[5, 6, 8].includes(selected.status_id) ? 'text-emerald-300' : 'text-white/50'}`}>Pago de la reserva</span>
                        </div>
                        <div className="mb-3 flex justify-between text-xs text-white/60">
                          <span>Pagado</span>
                          <span className="font-semibold text-white">
                            ${pagos.filter((p) => p.estado === 'APPROVED').reduce((sum, p) => sum + Number(p.monto), 0).toLocaleString()} COP
                          </span>
                        </div>
                        {[5, 6, 8].includes(selected.status_id) ? (
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            <button type="button" onClick={() => iniciarPago('ANTICIPO')} disabled={!!paymentLoading} className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary disabled:opacity-50">
                            {paymentLoading === 'ANTICIPO' ? 'Preparando...' : 'Pagar anticipo (50%)'}
                            </button>
                            <button type="button" onClick={() => iniciarPago('TOTAL')} disabled={!!paymentLoading} className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-300 disabled:opacity-50">
                            {paymentLoading === 'TOTAL' ? 'Preparando...' : 'Pagar totalidad'}
                            </button>
                          </div>
                        ) : (
                          <p className="rounded-lg border border-amber-400/15 bg-amber-400/5 px-3 py-2 text-xs text-amber-200/80">
                            Los pagos estarán disponibles cuando el administrador confirme tu reserva.
                          </p>
                        )}
                        <p className="mt-2 text-[10px] text-white/40">Pago seguro con Wompi.</p>
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
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleDownloadDocument(doc)}
                        className={`pdf-download-button ${downloadingDocumentId === doc.id ? 'is-downloading' : ''}`}
                        aria-busy={downloadingDocumentId === doc.id}
                      >
                        <span className="pdf-download-circle" aria-hidden="true">
                          {downloadingDocumentId === doc.id ? (
                            <Loader2 className="pdf-download-icon animate-spin" />
                          ) : (
                            <Download className="pdf-download-icon" />
                          )}
                        </span>
                        <span className="pdf-download-copy">
                          <span className="pdf-download-title">
                            {downloadingDocumentId === doc.id ? 'Descargando...' : 'Descargar'}
                          </span>
                          <span className="pdf-download-subtitle capitalize">
                            {doc.tipo.replace('_', ' ')} · PDF
                          </span>
                        </span>
                      </button>
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
