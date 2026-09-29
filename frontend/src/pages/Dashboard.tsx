import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Calendar, Users, Briefcase, Image as ImageIcon,
  MessageSquare, LogOut, Menu, X, Home, Flame, Sparkles, Search, Filter, Eye, Bell, ChevronDown
} from 'lucide-react';
import { Toaster, toast } from 'react-hot-toast';
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import api from '../api/client';
import axios from 'axios';
import { BACKEND_HOST } from '../api/client';
import Modal from '../components/Modal';
import TopherSelect from '../components/TopherSelect';

const normalizeReserva = (reserva: any) => {
  const statusId = reserva?.status_id ?? reserva?.status?.id ?? reserva?.status ?? reserva?.status_id ?? null;
  const normalizedUsuario = reserva?.usuario || {
    nombre_completo: reserva?.usuario_nombre || reserva?.usuario?.nombre_completo || 'N/A',
    correo: reserva?.usuario_correo || reserva?.usuario?.correo || '',
  };

  return {
    ...reserva,
    status_id: statusId !== null && statusId !== undefined ? Number(statusId) : null,
    usuario: normalizedUsuario,
  };
};

const emitDashboardRefresh = () => {
  window.dispatchEvent(new CustomEvent('dashboard-refresh'));
};

const DashboardNotificaciones = () => {
  const [notificaciones, setNotificaciones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const latestId = useRef<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(true);

  const fetchNotificaciones = async (showNewToast = false) => {
    try {
      const res = await api.get('/notificaciones/?limit=20');
      const data = (Array.isArray(res.data) ? res.data : res.data.results || [])
        .sort((a: any, b: any) => new Date(b.enviado_en).getTime() - new Date(a.enviado_en).getTime());
      setNotificaciones(data);
      const newest = data[0];
      if (newest && latestId.current !== null && newest.id !== latestId.current && showNewToast) {
        toast.success(newest.asunto);
      }
      if (newest) latestId.current = newest.id;
    } catch {
      toast.error('No se pudieron cargar las notificaciones del dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotificaciones();
    const interval = window.setInterval(() => fetchNotificaciones(true), 10000);
    return () => window.clearInterval(interval);
  }, []);

  const marcarLeida = async (notificacion: any) => {
    try {
      await api.patch(`/notificaciones/${notificacion.id}/`, { leido: true });
      setNotificaciones((actuales) => actuales.map((item) =>
        item.id === notificacion.id ? { ...item, leido: true } : item
      ));
    } catch {
      toast.error('No se pudo marcar la notificación como leída');
    }
  };

  if (loading || notificaciones.length === 0) return null;

  const pendientes = notificaciones.filter((notificacion) => !notificacion.leido).length;

  return (
    <section className="glass-card bg-primary/5 border-primary/20 p-5">
      <div className={`flex items-center justify-between gap-3 ${notificationsOpen ? 'mb-4' : ''}`}>
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-primary" />
          <h2 className="text-sm font-bold uppercase tracking-widest text-primary">Avisos recientes</h2>
        </div>
        <div className="flex items-center gap-2">
          {pendientes > 0 && (
            <span className="rounded-full bg-primary text-black px-2 py-1 text-[10px] font-bold">
              {pendientes} sin leer
            </span>
          )}
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-semibold text-primary transition-colors hover:bg-primary/10"
            onClick={() => setNotificationsOpen((open) => !open)}
            aria-expanded={notificationsOpen}
            aria-controls="dashboard-notifications-list"
          >
            {notificationsOpen ? 'Ocultar' : 'Mostrar'}
            <ChevronDown className={`w-4 h-4 transition-transform ${notificationsOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>
      {notificationsOpen && <div id="dashboard-notifications-list" className="space-y-3">
        {notificaciones.map((notificacion) => {
          const expanded = expandedId === notificacion.id;
          return (
            <div key={notificacion.id} className={`rounded-xl border transition-colors ${
              notificacion.leido ? 'border-white/5 bg-white/[.02]' : 'border-primary/20 bg-primary/10'
            }`}>
              <button
                type="button"
                className="w-full text-left p-3 flex items-start gap-3"
                onClick={() => {
                  setExpandedId(expanded ? null : notificacion.id);
                  if (!notificacion.leido) marcarLeida(notificacion);
                }}
                aria-expanded={expanded}
              >
                <span className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${notificacion.leido ? 'bg-white/20' : 'bg-primary'}`} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-white truncate">{notificacion.asunto}</span>
                    <ChevronDown className={`w-4 h-4 flex-shrink-0 text-primary transition-transform ${expanded ? 'rotate-180' : ''}`} />
                  </span>
                  <span className="block text-[10px] text-white/35 mt-1">
                    {new Date(notificacion.enviado_en).toLocaleString('es-CO')}
                  </span>
                </span>
              </button>
              {expanded && (
                <div className="px-8 pb-4 text-sm leading-relaxed text-white/70 whitespace-pre-wrap">
                  {notificacion.mensaje}
                </div>
              )}
            </div>
          );
        })}
      </div>}
    </section>
  );
};

const DashboardResumen = () => {
  const [stats, setStats] = useState({
    total_reservas: 0,
    pendientes: 0,
    confirmadas: 0,
    en_proceso: 0,
    canceladas: 0,
    completadas: 0,
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/reservas/?limit=1000');
        const data = (Array.isArray(res.data) ? res.data : res.data.results || []).map(normalizeReserva);

        const counts = {
          4: 0,
          5: 0,
          6: 0,
          7: 0,
          8: 0,
        };

        data.forEach((r: any) => {
          const statusId = Number(r.status_id);
          if (counts[statusId] !== undefined) {
            counts[statusId] += 1;
          }
        });

        const pend = counts[4] || 0;
        const conf = counts[5] || 0;
        const proc = counts[6] || 0;
        const canc = counts[7] || 0;
        const comp = counts[8] || 0;

        setStats({
          total_reservas: data.length,
          pendientes: pend,
          confirmadas: conf,
          en_proceso: proc,
          canceladas: canc,
          completadas: comp,
        });

        setChartData([
          { name: 'Pendientes', cantidad: pend, fill: '#f59e0b' },
          { name: 'Confirmadas', cantidad: conf, fill: '#10b981' },
          { name: 'En Proceso', cantidad: proc, fill: '#3b82f6' },
          { name: 'Canceladas', cantidad: canc, fill: '#ef4444' },
          { name: 'Completadas', cantidad: comp, fill: '#8b5cf6' },
        ]);
      } catch (err) {
        toast.error("Error al cargar resumen");
      } finally {
        setLoading(false);
      }
    };

    const handleRefresh = () => {
      fetchStats();
    };

    fetchStats();
    window.addEventListener('dashboard-refresh', handleRefresh);
    window.addEventListener('reservas-updated', handleRefresh);
    return () => {
      window.removeEventListener('dashboard-refresh', handleRefresh);
      window.removeEventListener('reservas-updated', handleRefresh);
    };
  }, []);

  const cards = [
    { label: 'Total Reservas', value: stats.total_reservas, tone: 'from-blue-500/20 to-blue-500/5', icon: Calendar },
    { label: 'Pendientes', value: stats.pendientes, tone: 'from-amber-500/20 to-amber-500/5', icon: Sparkles },
    { label: 'Confirmadas', value: stats.confirmadas, tone: 'from-emerald-500/20 to-emerald-500/5', icon: Flame },
    { label: 'En Proceso', value: stats.en_proceso, tone: 'from-sky-500/20 to-sky-500/5', icon: LayoutDashboard },
    { label: 'Canceladas', value: stats.canceladas, tone: 'from-red-500/20 to-red-500/5', icon: X },
    { label: 'Completadas', value: stats.completadas, tone: 'from-purple-500/20 to-purple-500/5', icon: LayoutDashboard },
  ];

  return (
    <div className="space-y-8">
      <div className="panel-surface p-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,138,0,0.16),transparent_42%)]" />
        <div className="relative">
          <span className="page-eyebrow">Resumen ejecutivo</span>
          <h1 className="page-title mb-3">Dashboard</h1>
          <p className="page-subtitle">Bienvenido al panel de administración de Topher Producciones.</p>
        </div>
      </div>

      {loading ? (
        <div className="glass-card bg-surface/20 border-white/5 p-8 text-center text-white/60">Cargando estadísticas...</div>
      ) : (
        <>
          <DashboardNotificaciones />
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {cards.map(({ label, value, tone, icon: Icon }, i) => (
              <div key={i} className={`glass-card bg-surface/20 border-white/5 bg-gradient-to-br ${tone}`}>
                <div className="flex items-center justify-between mb-6">
                  <p className="text-white/60 text-sm font-semibold">{label}</p>
                  <div className="p-2 rounded-xl border border-white/10 bg-background/40">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                </div>
                <p className="text-3xl font-display font-black text-white">{value}</p>
              </div>
            ))}
          </div>

          <div className="glass-card bg-surface/20 border-white/5 p-6 h-[400px]">
            <h3 className="text-lg font-bold text-white mb-6">Distribución de Reservas</h3>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" tick={{fill: 'rgba(255,255,255,0.5)'}} />
                <YAxis allowDecimals={false} stroke="rgba(255,255,255,0.5)" tick={{fill: 'rgba(255,255,255,0.5)'}} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#1f1f22', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Bar dataKey="cantidad" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
};

const DashboardReservas = () => {
  const [reservas, setReservas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [updatingStatusId, setUpdatingStatusId] = useState<number | null>(null);
  
  // Modal State
  const [selectedReserva, setSelectedReserva] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [personalDisponible, setPersonalDisponible] = useState<any[]>([]);
  const [asignaciones, setAsignaciones] = useState<any[]>([]);
  const [personalSeleccionado, setPersonalSeleccionado] = useState('');
  const [rolAsignacion, setRolAsignacion] = useState('Producción');
  const [assigningStaff, setAssigningStaff] = useState(false);

  const STATUS_LABELS: Record<number, string> = {
    4: 'Pendiente', 5: 'Confirmada', 6: 'En Proceso', 7: 'Cancelada', 8: 'Completada'
  };
  const VALID_STATUS_TRANSITIONS: Record<number, number[]> = {
    4: [4, 5, 7],
    5: [5, 6, 7],
    6: [6, 8],
    7: [7],
    8: [8],
  };

  const fetchReservas = async () => {
    try {
      const res = await api.get('/reservas/?limit=100');
      const data = (Array.isArray(res.data) ? res.data : res.data.results || []).map(normalizeReserva);
      setReservas(data);
    } catch (err) {
      toast.error("Error al cargar reservas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReservas();
    api.get('/personal/?activo=true')
      .then((res) => setPersonalDisponible(Array.isArray(res.data) ? res.data : res.data.results || []))
      .catch(() => toast.error('No se pudo cargar el personal disponible'));
  }, []);

  const openReservaDetails = async (reserva: any) => {
    setSelectedReserva(reserva);
    setIsModalOpen(true);
    setPersonalSeleccionado('');
    try {
      const res = await api.get(`/asignaciones/?reserva_id=${reserva.id}`);
      setAsignaciones(Array.isArray(res.data) ? res.data : res.data.results || []);
    } catch {
      setAsignaciones([]);
      toast.error('No se pudieron cargar las asignaciones de la reserva');
    }
  };

  const asignarPersonal = async () => {
    if (!selectedReserva || !personalSeleccionado) {
      toast.error('Selecciona un miembro del personal');
      return;
    }
    setAssigningStaff(true);
    try {
      const response = await api.post('/asignaciones/', {
        reserva: selectedReserva.id,
        personal: Number(personalSeleccionado),
        rol_en_evento: rolAsignacion,
        fecha_asignacion: selectedReserva.fecha_evento,
        confirmado: false,
      });
      setAsignaciones((current) => [...current, response.data]);
      setPersonalSeleccionado('');
      toast.success('Personal asignado. Ya puedes confirmar la reserva.');
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'No se pudo asignar el personal');
    } finally {
      setAssigningStaff(false);
    }
  };

  const handleStatusChange = async (id: number, newStatusId: number) => {
    const previousReserva = reservas.find((reserva) => reserva.id === id);
    if (!previousReserva || previousReserva.status_id === newStatusId) return;
    if (!VALID_STATUS_TRANSITIONS[previousReserva.status_id]?.includes(newStatusId)) {
      toast.error(
        `Transición inválida: ${STATUS_LABELS[previousReserva.status_id] || 'Estado actual'} → ${STATUS_LABELS[newStatusId] || 'Estado seleccionado'}.`
      );
      return;
    }

    setUpdatingStatusId(id);
    try {
      const res = await api.post(`/reservas/${id}/cambiar_estado/`, {
        status_id: newStatusId,
      });
      toast.success("Estado actualizado exitosamente");
      const updatedReserva = normalizeReserva(res?.data || { id, status_id: newStatusId });
      setReservas(prev => prev.map(r => r.id === id ? { ...r, ...updatedReserva, status_id: updatedReserva.status_id } : r));
      window.dispatchEvent(new CustomEvent('reservas-updated'));
      emitDashboardRefresh();
    } catch (error: any) {
      const msg = error?.response?.data?.detail || 'Error al actualizar el estado';
      setReservas(prev => prev.map(r => r.id === id ? previousReserva : r));
      if (newStatusId === 5 && /personal asignado|rn06/i.test(msg)) {
        toast.error('Asigna primero un miembro del personal. Abrimos el detalle de la reserva para hacerlo.');
        await openReservaDetails(previousReserva);
      } else {
        toast.error(msg);
      }
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const filteredReservas = reservas.filter(r => {
    const matchesSearch = (r.numero_solicitud || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (r.nombre_evento || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (r.usuario?.nombre_completo || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter ? r.status_id.toString() === statusFilter : true;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <span className="page-eyebrow mb-3">Operación</span>
          <h1 className="page-title text-3xl md:text-4xl">Reservas</h1>
        </div>
      </div>
      
      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4 mb-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input 
            type="text" 
            placeholder="Buscar por cliente o evento..." 
            className="w-full bg-surface/30 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-white placeholder-white/40 focus:outline-none focus:border-primary/50 transition-colors"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="relative sm:w-64">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <TopherSelect
            className="sm:w-64"
            value={statusFilter}
            onChange={setStatusFilter}
            placeholder="Todos los estados"
            options={[
              { value: '', label: 'Todos los estados' },
              ...Object.entries(STATUS_LABELS).map(([id, label]) => ({ value: id, label })),
            ]}
          />
        </div>
      </div>

      <div className="glass-card bg-surface/20 border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-4 py-3 text-left font-semibold text-white/45">#</th>
                <th className="px-4 py-3 text-left font-semibold text-white/45">Evento</th>
                <th className="px-4 py-3 text-left font-semibold text-white/45">Fecha</th>
                <th className="px-4 py-3 text-left font-semibold text-white/45">Cliente</th>
                <th className="px-4 py-3 text-left font-semibold text-white/45">Estado</th>
                <th className="px-4 py-3 text-center font-semibold text-white/45">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-white/50">Cargando...</td></tr>
              ) : filteredReservas.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-white/50">Sin reservas encontradas</td></tr>
              ) : (
                filteredReservas.slice(0, 50).map((r: any) => (
                  <tr key={r.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3 text-white/70">{r.numero_solicitud}</td>
                    <td className="px-4 py-3 text-white/80">{r.nombre_evento}</td>
                    <td className="px-4 py-3 text-white/70">{r.fecha_evento}</td>
                    <td className="px-4 py-3 text-white/70">{r.usuario?.nombre_completo || 'N/A'}</td>
                    <td className="px-4 py-3">
                      <TopherSelect
                        value={String(r.status_id)}
                        disabled={updatingStatusId === r.id}
                        onChange={(value) => handleStatusChange(r.id, parseInt(value))}
                        compact
                        options={(VALID_STATUS_TRANSITIONS[r.status_id] || [r.status_id]).map((statusId) => ({
                          value: String(statusId), label: STATUS_LABELS[statusId],
                        }))}
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button 
                        onClick={() => openReservaDetails(r)}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                        title="Ver detalles"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Detalles de la Reserva">
        {selectedReserva && (
          <div className="space-y-4 text-sm text-white/80">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 p-3 rounded-lg">
                <span className="block text-white/40 text-xs uppercase mb-1">Número de Solicitud</span>
                <span className="font-semibold">{selectedReserva.numero_solicitud}</span>
              </div>
              <div className="bg-white/5 p-3 rounded-lg">
                <span className="block text-white/40 text-xs uppercase mb-1">Estado</span>
                <span className="font-semibold text-primary">{STATUS_LABELS[selectedReserva.status_id] || 'Desconocido'}</span>
              </div>
            </div>
            
            <div className="bg-white/5 p-3 rounded-lg">
              <span className="block text-white/40 text-xs uppercase mb-1">Cliente</span>
              <span className="font-semibold">{selectedReserva.usuario?.nombre_completo || 'N/A'}</span>
              <div className="text-white/60 text-xs mt-1">{selectedReserva.usuario?.correo}</div>
            </div>

            <div className="bg-white/5 p-3 rounded-lg">
              <span className="block text-white/40 text-xs uppercase mb-1">Nombre del Evento</span>
              <span className="font-semibold">{selectedReserva.nombre_evento}</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 p-3 rounded-lg">
                <span className="block text-white/40 text-xs uppercase mb-1">Fecha del Evento</span>
                <span>{selectedReserva.fecha_evento}</span>
              </div>
              <div className="bg-white/5 p-3 rounded-lg">
                <span className="block text-white/40 text-xs uppercase mb-1">Hora</span>
                <span>{selectedReserva.hora_inicio} - {selectedReserva.hora_fin}</span>
              </div>
            </div>

            <div className="bg-white/5 p-3 rounded-lg">
              <span className="block text-white/40 text-xs uppercase mb-1">Ubicación</span>
              <span>{selectedReserva.ubicacion_evento}</span>
            </div>

            <div className="bg-white/5 p-3 rounded-lg">
              <span className="block text-white/40 text-xs uppercase mb-1">Descripción / Notas</span>
              <p className="whitespace-pre-wrap">{selectedReserva.descripcion || 'Sin notas adicionales.'}</p>
            </div>

            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
              <span className="block text-white/40 text-xs uppercase mb-2">Personal asignado</span>
              {asignaciones.length > 0 ? (
                <div className="space-y-2">
                  {asignaciones.map((asignacion) => (
                    <div key={asignacion.id} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
                      <div>
                        <div className="font-semibold text-white">{asignacion.personal_nombre || 'Personal asignado'}</div>
                        <div className="text-xs text-white/50">{asignacion.rol_en_evento}</div>
                      </div>
                      <span className="text-[10px] uppercase tracking-widest text-emerald-300">Asignado</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mb-3 text-xs text-amber-200/80">Asigna al menos un miembro antes de confirmar esta reserva.</p>
              )}
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]">
                <select
                  value={personalSeleccionado}
                  onChange={(event) => setPersonalSeleccionado(event.target.value)}
                  className="rounded-lg border border-white/10 bg-surface p-2 text-sm text-white"
                >
                  <option value="">Seleccionar personal</option>
                  {personalDisponible
                    .filter((miembro) => !asignaciones.some((asignacion) => Number(asignacion.personal) === Number(miembro.id)))
                    .map((miembro) => (
                      <option key={miembro.id} value={miembro.id}>{miembro.nombre} · {miembro.especialidad}</option>
                    ))}
                </select>
                <input
                  value={rolAsignacion}
                  onChange={(event) => setRolAsignacion(event.target.value)}
                  placeholder="Rol en el evento"
                  className="rounded-lg border border-white/10 bg-white/5 p-2 text-sm text-white"
                />
                <button type="button" onClick={asignarPersonal} disabled={assigningStaff || !personalSeleccionado} className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-black disabled:opacity-50">
                  {assigningStaff ? 'Asignando...' : 'Asignar'}
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

const DashboardServicios = () => {
  const [servicios, setServicios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingServicio, setEditingServicio] = useState<any | null>(null);
  const [form, setForm] = useState({
    nombre: '',
    categoria: 'Fotografía',
    descripcion: '',
    disponible: true,
  });
  const [tarifas, setTarifas] = useState<Array<{
    id?: number;
    unidad: 'hora' | 'unidad' | 'show';
    precio_unitario: string;
    cantidad_minima: string;
    activa: boolean;
  }>>([]);
  const [mediaItems, setMediaItems] = useState<Array<{ tipo: 'image' | 'video'; url_imagen: string; alt_text: string; es_principal: boolean }>>([
    { tipo: 'image', url_imagen: '', alt_text: '', es_principal: true },
  ]);
  const [uploadingServiceMedia, setUploadingServiceMedia] = useState<number | null>(null);

  const fetchServicios = async () => {
    try {
      const res = await api.get('/servicios/');
      setServicios(Array.isArray(res.data) ? res.data : res.data.results || []);
    } catch (error) {
      toast.error('Error al cargar servicios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServicios();
  }, []);

  const resetForm = () => {
    setForm({ nombre: '', categoria: 'Fotografía', descripcion: '', disponible: true });
    setTarifas([{ unidad: 'show', precio_unitario: '', cantidad_minima: '1', activa: true }]);
    setMediaItems([{ tipo: 'image', url_imagen: '', alt_text: '', es_principal: true }]);
    setEditingServicio(null);
  };

  const openCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (servicio: any) => {
    setEditingServicio(servicio);
    setForm({
      nombre: servicio.nombre || '',
      categoria: servicio.categoria || 'Fotografía',
      descripcion: servicio.descripcion || '',
      disponible: !!servicio.disponible,
    });
    setTarifas(Array.isArray(servicio.tarifas) && servicio.tarifas.length > 0
      ? servicio.tarifas.map((tarifa: any) => ({
          id: tarifa.id,
          unidad: tarifa.unidad || 'show',
          precio_unitario: String(tarifa.precio_unitario ?? ''),
          cantidad_minima: String(tarifa.cantidad_minima ?? 1),
          activa: tarifa.activa !== false,
        }))
      : [{ unidad: 'show', precio_unitario: '', cantidad_minima: '1', activa: true }]);
    const currentMedia = Array.isArray(servicio.imagenes) && servicio.imagenes.length > 0
      ? servicio.imagenes.map((item: any) => ({
          tipo: item.tipo || (/(\.mp4|\.webm|\.mov|youtube|youtu\.be)/i.test(item.url_imagen || '') ? 'video' : 'image'),
          url_imagen: item.url_imagen || '',
          alt_text: item.alt_text || item.titulo || '',
          es_principal: !!item.es_principal,
        }))
      : [{ tipo: 'image', url_imagen: '', alt_text: '', es_principal: true }];
    setMediaItems(currentMedia);
    setIsModalOpen(true);
  };

  const updateTarifa = (index: number, field: keyof typeof tarifas[number], value: string | boolean) => {
    setTarifas((prev) => prev.map((tarifa, i) => i === index ? { ...tarifa, [field]: value } : tarifa));
  };

  const addTarifa = () => {
    setTarifas((prev) => [...prev, { unidad: 'show', precio_unitario: '', cantidad_minima: '1', activa: true }]);
  };

  const removeTarifa = (index: number) => {
    setTarifas((prev) => prev.filter((_, i) => i !== index));
  };

  const saveTarifasForServicio = async (servicioId: number) => {
    const validTarifas = tarifas.filter((tarifa) => tarifa.precio_unitario.trim() !== '');
    const originalTarifas = Array.isArray(editingServicio?.tarifas) ? editingServicio.tarifas : [];
    const currentIds = new Set(validTarifas.filter((tarifa) => tarifa.id).map((tarifa) => tarifa.id));

    if (editingServicio) {
      await Promise.all(originalTarifas
        .filter((tarifa: any) => tarifa.id && !currentIds.has(tarifa.id))
        .map((tarifa: any) => api.delete(`/tarifas/${tarifa.id}/`)));
    }

    await Promise.all(validTarifas.map((tarifa) => {
      const payload = {
        servicio: servicioId,
        unidad: tarifa.unidad,
        precio_unitario: Number(tarifa.precio_unitario),
        cantidad_minima: Number(tarifa.cantidad_minima) || 1,
        activa: tarifa.activa,
      };
      return tarifa.id
        ? api.patch(`/tarifas/${tarifa.id}/`, payload)
        : api.post('/tarifas/', payload);
    }));
  };

  const updateMediaItem = (index: number, field: keyof typeof mediaItems[number], value: any) => {
    setMediaItems((prev) => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  const handleServiceMediaFile = async (index: number, file?: File) => {
    if (!file) return;
    setUploadingServiceMedia(index);
    try {
      const token = localStorage.getItem('access_token');
      if (!token || token === 'null') {
        toast.error('Tu sesión de administrador expiró. Vuelve a iniciar sesión.');
        return;
      }
      const data = new FormData();
      data.append('archivo', file);
      const response = await axios.post(`${BACKEND_HOST}/api/media-upload/`, data, {
        headers: { Authorization: `Bearer ${token}` },
      });
      updateMediaItem(index, 'url_imagen', response.data.url);
      updateMediaItem(index, 'tipo', file.type.startsWith('video/') ? 'video' : 'image');
      toast.success('Archivo cargado correctamente');
    } catch (error: any) {
      const detail = error?.response?.data?.detail;
      toast.error(detail || (error?.response?.status === 401
        ? 'Tu sesión de administrador expiró. Vuelve a iniciar sesión.'
        : 'No se pudo cargar el archivo. Verifica el formato y el tamaño.'));
    } finally {
      setUploadingServiceMedia(null);
    }
  };

  const addMediaItem = () => {
    setMediaItems((prev) => [...prev, { tipo: 'image', url_imagen: '', alt_text: '', es_principal: false }]);
  };

  const removeMediaItem = (index: number) => {
    setMediaItems((prev) => prev.filter((_, i) => i !== index));
  };

  const saveMediaForServicio = async (servicioId: number, shouldReplaceExisting = false) => {
    const validMedia = mediaItems.filter((item) => item.url_imagen && item.url_imagen.trim());

    if (shouldReplaceExisting && Array.isArray(editingServicio?.imagenes) && editingServicio.imagenes.length > 0) {
      for (const media of editingServicio.imagenes) {
        if (media?.id) {
          await api.delete(`/imagenes/${media.id}/`).catch(() => undefined);
        }
      }
    }

    if (validMedia.length === 0) return;

    for (const [index, item] of validMedia.entries()) {
      await api.post('/imagenes/', {
        servicio: servicioId,
        url_imagen: item.url_imagen.trim(),
        alt_text: item.alt_text || `Media ${index + 1}`,
        es_principal: item.es_principal || index === 0,
        orden: index,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre.trim() || !form.categoria || !form.descripcion.trim()) {
      toast.error('Completa nombre, categoría y descripción');
      return;
    }

    const hasMedia = mediaItems.some((item) => item.url_imagen && item.url_imagen.trim());
    if (!hasMedia) {
      toast.error('Agrega al menos una imagen o video para el servicio');
      return;
    }
    if (tarifas.some((tarifa) => tarifa.precio_unitario.trim() && Number(tarifa.precio_unitario) < 0)) {
      toast.error('El precio no puede ser negativo');
      return;
    }

    try {
      const payload = {
        nombre: form.nombre.trim(),
        categoria: form.categoria,
        descripcion: form.descripcion.trim(),
        disponible: form.disponible,
      };

      let servicioId = editingServicio?.id;

      if (editingServicio) {
        const res = await api.patch(`/servicios/${editingServicio.id}/`, payload);
        servicioId = res.data.id;
        await saveTarifasForServicio(servicioId);
        await saveMediaForServicio(servicioId, true);
        await fetchServicios();
        toast.success('Servicio actualizado');
      } else {
        const res = await api.post('/servicios/', payload);
        servicioId = res.data.id;
        await saveTarifasForServicio(servicioId);
        await saveMediaForServicio(servicioId);
        await fetchServicios();
        toast.success('Servicio creado exitosamente');
      }

      emitDashboardRefresh();
      setIsModalOpen(false);
      resetForm();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.response?.data?.non_field_errors?.[0] || 'No se pudo guardar el servicio';
      toast.error(msg);
    }
  };

  const handleDelete = async (servicio: any) => {
    if (!window.confirm(`¿Deseas eliminar el servicio "${servicio.nombre}"?`)) return;

    try {
      await api.delete(`/servicios/${servicio.id}/`);
      setServicios((prev) => prev.filter((item) => item.id !== servicio.id));
      emitDashboardRefresh();
      toast.success('Servicio eliminado correctamente');
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'No se pudo eliminar el servicio');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-3">
        <div>
          <span className="page-eyebrow mb-3">Catálogo</span>
          <h1 className="page-title text-3xl md:text-4xl">Servicios</h1>
        </div>
        <button
          onClick={openCreateModal}
          className="btn-primary px-6 py-3 text-xs uppercase tracking-widest"
        >
          + Nuevo Servicio
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="glass-card bg-surface/20 border-white/5 col-span-full text-center text-white/60">Cargando...</div>
        ) : servicios.length === 0 ? (
          <div className="glass-card bg-surface/20 border-white/5 col-span-full text-center text-white/50">Sin servicios registrados</div>
        ) : (
          servicios.map((s: any) => (
            <div key={s.id} className="glass-card bg-surface/20 border-white/5 p-5">
              <div className="flex items-start justify-between mb-4 gap-3">
                <div>
                  <h3 className="font-bold text-lg text-white">{s.nombre}</h3>
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-primary">{s.categoria}</span>
                </div>
                <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-widest ${s.disponible ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-500/15 text-slate-300'}`}>
                  {s.disponible ? 'Activo' : 'No disponible'}
                </span>
              </div>
              <p className="text-sm text-white/60 mb-6 leading-relaxed">{s.descripcion}</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => openEditModal(s)} className="flex-1 px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-white/70 hover:text-white transition-colors text-xs">
                  Editar
                </button>
                <button type="button" onClick={() => handleDelete(s)} className="px-3 py-2 rounded-lg border border-red-500/20 bg-red-500/10 text-red-300 hover:bg-red-500/20 transition-colors text-xs">
                  Eliminar
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); resetForm(); }} title={editingServicio ? 'Editar Servicio' : 'Crear Nuevo Servicio'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-white/60 uppercase tracking-widest mb-2">Nombre del Servicio</label>
            <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required type="text" className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary/50 transition-colors" placeholder="Ej. Fotografía de Bodas" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-white/60 uppercase tracking-widest mb-2">Categoría</label>
            <select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} className="w-full bg-surface border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary/50 transition-colors">
              <option value="Fotografía">Fotografía</option>
              <option value="Video">Video</option>
              <option value="Audio">Audio</option>
              <option value="Producción">Producción</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-white/60 uppercase tracking-widest mb-2">Descripción</label>
            <textarea value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} required rows={4} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary/50 transition-colors resize-none" placeholder="Detalles del servicio..."></textarea>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-white/60 uppercase tracking-widest">Precios del servicio</label>
              <button type="button" onClick={addTarifa} className="text-xs text-primary hover:text-primary/80">+ Agregar precio</button>
            </div>
            {tarifas.map((tarifa, index) => (
              <div key={tarifa.id || `new-${index}`} className="rounded-xl border border-white/10 bg-white/5 p-3 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest text-white/50 mb-1">Unidad</label>
                    <select
                      value={tarifa.unidad}
                      onChange={(e) => updateTarifa(index, 'unidad', e.target.value as typeof tarifa.unidad)}
                      className="w-full bg-surface border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-primary/50"
                    >
                      <option value="show">Show</option>
                      <option value="hora">Hora</option>
                      <option value="unidad">Unidad</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest text-white/50 mb-1">Precio</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={tarifa.precio_unitario}
                      onChange={(e) => updateTarifa(index, 'precio_unitario', e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-primary/50"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest text-white/50 mb-1">Cantidad mínima</label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={tarifa.cantidad_minima}
                      onChange={(e) => updateTarifa(index, 'cantidad_minima', e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-primary/50"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <label className="flex items-center gap-2 text-xs text-white/70">
                    <input
                      type="checkbox"
                      checked={tarifa.activa}
                      onChange={(e) => updateTarifa(index, 'activa', e.target.checked)}
                      className="h-4 w-4 accent-primary"
                    />
                    Precio activo
                  </label>
                  {tarifas.length > 1 && (
                    <button type="button" onClick={() => removeTarifa(index)} className="text-xs text-red-300 hover:text-red-200">
                      Quitar precio
                    </button>
                  )}
                </div>
              </div>
            ))}
            <p className="text-[10px] text-white/40">Puedes agregar precios por hora, unidad o show. Deja vacío un precio que no quieras registrar.</p>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-white/60 uppercase tracking-widest">Multimedia del servicio</label>
              <button type="button" onClick={addMediaItem} className="text-xs text-primary hover:text-primary/80">+ Agregar media</button>
            </div>

            {mediaItems.map((item, index) => (
              <div key={`${index}-${item.url_imagen}`} className="rounded-xl border border-white/10 bg-white/5 p-3 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest text-white/50 mb-1">Tipo</label>
                    <select
                      value={item.tipo}
                      onChange={(e) => updateMediaItem(index, 'tipo', e.target.value as 'image' | 'video')}
                      className="w-full bg-surface border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-primary/50"
                    >
                      <option value="image">Imagen</option>
                      <option value="video">Video</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest text-white/50 mb-1">Principal</label>
                    <label className="flex items-center gap-2 h-[42px] rounded-xl border border-white/10 bg-surface px-3 text-sm text-white/70">
                      <input
                        type="checkbox"
                        checked={item.es_principal}
                        onChange={(e) => updateMediaItem(index, 'es_principal', e.target.checked)}
                        className="h-4 w-4 accent-primary"
                      />
                      Destacar esta media
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-white/50 mb-1">Archivo de {item.tipo === 'video' ? 'video' : 'imagen'}</label>
                  <input
                    type="file"
                    accept={item.tipo === 'video' ? 'video/mp4,video/webm,video/quicktime' : 'image/jpeg,image/png,image/webp,image/gif'}
                    onChange={(e) => handleServiceMediaFile(index, e.target.files?.[0])}
                    disabled={uploadingServiceMedia === index}
                    className="topher-file-input w-full mb-2"
                  />
                  <input
                    type="text"
                    value={item.url_imagen}
                    onChange={(e) => updateMediaItem(index, 'url_imagen', e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary/50 transition-colors"
                    placeholder={uploadingServiceMedia === index ? 'Cargando archivo...' : 'O pega una URL externa (opcional)'}
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-white/50 mb-1">Texto alternativo</label>
                  <input
                    type="text"
                    value={item.alt_text}
                    onChange={(e) => updateMediaItem(index, 'alt_text', e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary/50 transition-colors"
                    placeholder="Descripción de la media"
                  />
                </div>

                {mediaItems.length > 1 && (
                  <button type="button" onClick={() => removeMediaItem(index)} className="text-xs text-red-300 hover:text-red-200">Quitar</button>
                )}
              </div>
            ))}
          </div>

          <label className="flex items-center gap-3 text-sm text-white/70">
            <input type="checkbox" checked={form.disponible} onChange={(e) => setForm({ ...form, disponible: e.target.checked })} className="h-4 w-4 accent-primary" />
            Servicio disponible
          </label>
          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={() => { setIsModalOpen(false); resetForm(); }} className="px-6 py-2 rounded-xl text-white/70 hover:bg-white/5 font-semibold transition-colors">Cancelar</button>
            <button type="submit" className="btn-primary px-6 py-2">{editingServicio ? 'Actualizar Servicio' : 'Guardar Servicio'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

const DashboardUsuarios = () => {
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsuarios = async () => {
    try {
      const res = await api.get('/usuarios/');
      const rawUsuarios = Array.isArray(res.data) ? res.data : res.data.results || [];
      setUsuarios(rawUsuarios.map((usuario: any) => ({
        ...usuario,
        status_id: usuario.status_id ?? usuario.status ?? 1,
        role_id: usuario.role_id ?? usuario.role ?? null,
      })));
    } catch (error) {
      toast.error('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsuarios();
  }, []);

  const handleToggleEstado = async (usuario: any) => {
    try {
      const res = await api.patch(`/usuarios/${usuario.id}/toggle_estado/`);
      setUsuarios((prev) => prev.map((u) => u.id === usuario.id ? { ...u, status_id: res.data.status_id } : u));
      toast.success(res.data.detail || 'Estado actualizado');
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'No se pudo actualizar el estado');
    }
  };

  const handleDeleteUsuario = async (usuario: any) => {
    if (!window.confirm(`¿Deseas eliminar al usuario ${usuario.nombre_completo}?`)) return;

    try {
      await api.delete(`/usuarios/${usuario.id}/`);
      setUsuarios((prev) => prev.filter((u) => u.id !== usuario.id));
      toast.success('Usuario eliminado');
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'No se pudo eliminar el usuario');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <span className="page-eyebrow mb-3">Gestión</span>
        <h1 className="page-title text-3xl md:text-4xl">Usuarios</h1>
      </div>

      <div className="glass-card bg-surface/20 border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-4 py-3 text-left font-semibold text-white/45">Nombre</th>
                <th className="px-4 py-3 text-left font-semibold text-white/45">Correo</th>
                <th className="px-4 py-3 text-left font-semibold text-white/45">Rol</th>
                <th className="px-4 py-3 text-left font-semibold text-white/45">Estado</th>
                <th className="px-4 py-3 text-center font-semibold text-white/45">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-white/50">Cargando usuarios...</td></tr>
              ) : usuarios.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-white/50">No hay usuarios registrados.</td></tr>
              ) : (
                usuarios.map((usuario) => (
                  <tr key={usuario.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-white">{usuario.nombre_completo}</div>
                      <div className="text-xs text-white/45">@{usuario.nombre_usuario}</div>
                    </td>
                    <td className="px-4 py-3 text-white/70">{usuario.correo}</td>
                    <td className="px-4 py-3 text-white/70">{usuario.role_nombre || 'Sin rol'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-widest ${usuario.status_id === 1 ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'}`}>
                        {usuario.status_id === 1 ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button type="button" onClick={() => handleToggleEstado(usuario)} className="px-2 py-1 rounded-lg border border-white/10 bg-white/5 text-white/70 hover:text-white transition-colors text-xs">
                          {usuario.status_id === 1 ? 'Desactivar' : 'Activar'}
                        </button>
                        <button type="button" onClick={() => handleDeleteUsuario(usuario)} className="px-2 py-1 rounded-lg border border-red-500/20 bg-red-500/10 text-red-300 hover:bg-red-500/20 transition-colors text-xs">
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const DashboardPersonal = () => {
  const [personal, setPersonal] = useState<any[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({
    usuario: '',
    nombre: '',
    correo: '',
    telefono: '',
    especialidad: '',
    cargo: 'Empleado',
    activo: true,
  });

  const fetchPersonal = async () => {
    try {
      const res = await api.get('/personal/');
      setPersonal(Array.isArray(res.data) ? res.data : res.data.results || []);
    } catch (error) {
      toast.error('Error al cargar personal');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsuarios = async () => {
    try {
      const res = await api.get('/usuarios/');
      setUsuarios(Array.isArray(res.data) ? res.data : res.data.results || []);
    } catch (error) {
      console.error('Error al cargar usuarios para personal', error);
    }
  };

  useEffect(() => {
    fetchPersonal();
    fetchUsuarios();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.nombre.trim() || !form.correo.trim() || !form.especialidad.trim()) {
      toast.error('Completa nombre, correo y especialidad');
      return;
    }

    try {
      const payload = {
        ...form,
        usuario: form.usuario ? Number(form.usuario) : null,
        nombre: form.nombre.trim(),
        correo: form.correo.trim(),
        especialidad: form.especialidad.trim(),
        cargo: form.cargo || 'Empleado',
      };

      const res = await api.post('/personal/', payload);
      setPersonal((prev) => [res.data, ...prev]);
      toast.success('Miembro del equipo creado');
      setForm({ usuario: '', nombre: '', correo: '', telefono: '', especialidad: '', cargo: 'Empleado', activo: true });
      setIsModalOpen(false);
    } catch (error: any) {
      const detail = error?.response?.data;
      const message = typeof detail === 'string'
        ? detail
        : detail?.detail || Object.values(detail || {}).flat().join(' ') || 'No se pudo crear el personal';
      toast.error(message);
    }
  };

  const handleToggleActivo = async (member: any) => {
    try {
      const res = await api.patch(`/personal/${member.id}/toggle_activo/`);
      setPersonal((prev) => prev.map((item) => item.id === member.id ? { ...item, activo: res.data.activo } : item));
      toast.success(res.data.detail || 'Estado actualizado');
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'No se pudo actualizar el estado');
    }
  };

  const handleDelete = async (member: any) => {
    if (!window.confirm(`¿Deseas quitar a ${member.nombre} del equipo?`)) return;
    try {
      await api.delete(`/personal/${member.id}/`);
      setPersonal((prev) => prev.filter((item) => item.id !== member.id));
      toast.success('Miembro eliminado');
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'No se pudo eliminar el miembro');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-3">
        <div>
          <span className="page-eyebrow mb-3">Equipo</span>
          <h1 className="page-title text-3xl md:text-4xl">Personal</h1>
        </div>
        <button type="button" onClick={() => setIsModalOpen(true)} className="btn-primary px-6 py-3 text-xs uppercase tracking-widest">
          + Nuevo miembro
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {loading ? (
          <div className="glass-card bg-surface/20 border-white/5 col-span-full text-center text-white/60 py-8">Cargando personal...</div>
        ) : personal.length === 0 ? (
          <div className="glass-card bg-surface/20 border-white/5 col-span-full text-center text-white/50 py-8">Sin personal registrado.</div>
        ) : (
          personal.map((member) => (
            <div key={member.id} className="glass-card bg-surface/20 border-white/5 p-5">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h3 className="font-bold text-lg text-white">{member.nombre}</h3>
                  <p className="text-xs uppercase tracking-widest text-primary">{member.especialidad}</p>
                </div>
                <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-widest ${member.activo ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-500/15 text-slate-300'}`}>
                  {member.activo ? 'Activo' : 'Inactivo'}
                </span>
              </div>

              <div className="space-y-2 text-sm text-white/60 mb-5">
                <p className="font-medium text-white/80">Cargo: {member.cargo || 'Empleado'}</p>
                <p>{member.correo}</p>
                <p>{member.telefono || 'Sin teléfono'}</p>
                <p>{member.usuario_nombre ? `Usuario: ${member.usuario_nombre}` : 'Sin usuario vinculado'}</p>
              </div>

              <div className="flex gap-2">
                <button type="button" onClick={() => handleToggleActivo(member)} className="flex-1 px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-white/70 hover:text-white transition-colors text-xs">
                  {member.activo ? 'Desactivar' : 'Activar'}
                </button>
                <button type="button" onClick={() => handleDelete(member)} className="px-3 py-2 rounded-lg border border-red-500/20 bg-red-500/10 text-red-300 hover:bg-red-500/20 transition-colors text-xs">
                  Eliminar
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Agregar miembro al equipo">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-white/60 uppercase tracking-widest mb-2">Usuario asociado</label>
              <select value={form.usuario} onChange={(e) => setForm({ ...form, usuario: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary/50 transition-colors">
                <option value="">Sin usuario vinculado</option>
                {usuarios.map((usuario) => (
                  <option key={usuario.id} value={usuario.id} className="bg-background text-white">{usuario.nombre_completo} ({usuario.nombre_usuario})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-white/60 uppercase tracking-widest mb-2">Cargo</label>
              <select value={form.cargo} onChange={(e) => setForm({ ...form, cargo: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary/50 transition-colors">
                <option value="Empleado" className="bg-background text-white">Empleado</option>
                <option value="Gerente" className="bg-background text-white">Gerente</option>
                <option value="Coordinador" className="bg-background text-white">Coordinador</option>
                <option value="Producción" className="bg-background text-white">Producción</option>
                <option value="Diseñador" className="bg-background text-white">Diseñador</option>
                <option value="Soporte" className="bg-background text-white">Soporte</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-white/60 uppercase tracking-widest mb-2">Nombre</label>
            <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required type="text" className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary/50 transition-colors" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-white/60 uppercase tracking-widest mb-2">Correo</label>
              <input value={form.correo} onChange={(e) => setForm({ ...form, correo: e.target.value })} required type="email" className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary/50 transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-white/60 uppercase tracking-widest mb-2">Teléfono</label>
              <input value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} type="text" className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary/50 transition-colors" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-white/60 uppercase tracking-widest mb-2">Especialidad</label>
            <input value={form.especialidad} onChange={(e) => setForm({ ...form, especialidad: e.target.value })} required type="text" className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary/50 transition-colors" />
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2 rounded-xl text-white/70 hover:bg-white/5 font-semibold transition-colors">Cancelar</button>
            <button type="submit" className="btn-primary px-6 py-2">Guardar</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

const DashboardPortafolio = () => {
  const [eventos, setEventos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvento, setEditingEvento] = useState<any | null>(null);
  const [form, setForm] = useState({
    nombre: '',
    fecha_evento: '',
    lugar: '',
    descripcion: '',
    tipo_evento: 'Boda',
    activo: true,
  });
  const [mediaItems, setMediaItems] = useState<Array<{ tipo: 'foto' | 'video'; url_archivo: string; titulo: string; es_principal: boolean }>>([
    { tipo: 'foto', url_archivo: '', titulo: '', es_principal: true },
  ]);
  const [uploadingMedia, setUploadingMedia] = useState<number | null>(null);

  const resolvePortfolioMediaUrl = (url?: string | null) => {
    if (!url || typeof url !== 'string') return '';
    if (/^(https?:|data:|blob:)/i.test(url)) return url;
    return `${BACKEND_HOST}${url.startsWith('/') ? url : `/${url}`}`;
  };

  const fetchEventos = async () => {
    try {
      const res = await api.get('/portafolio/');
      const data = Array.isArray(res.data) ? res.data : res.data.results || [];
      setEventos(data.map((evento: any) => ({
        ...evento,
        multimedia: Array.isArray(evento.multimedia)
          ? evento.multimedia.map((media: any) => ({
              ...media,
              url_archivo: media.url_archivo || media.url_media || media.url || '',
              tipo: media.tipo === 'video' ? 'video' : 'foto',
            })).filter((media: any) => media.url_archivo)
          : [],
      })));
    } catch (err) {
      toast.error('Error al cargar el portafolio');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEventos();
  }, []);

  const resetForm = () => {
    setForm({ nombre: '', fecha_evento: '', lugar: '', descripcion: '', tipo_evento: 'Boda', activo: true });
    setMediaItems([{ tipo: 'foto', url_archivo: '', titulo: '', es_principal: true }]);
    setEditingEvento(null);
  };

  const openCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (evento: any) => {
    setEditingEvento(evento);
    setForm({
      nombre: evento.nombre || '',
      fecha_evento: evento.fecha_evento || '',
      lugar: evento.lugar || '',
      descripcion: evento.descripcion || '',
      tipo_evento: evento.tipo_evento || 'Boda',
      activo: !!evento.activo,
    });
    const currentMedia = Array.isArray(evento.multimedia) && evento.multimedia.length > 0
      ? evento.multimedia.map((item: any) => ({
          id: item.id,
          tipo: item.tipo || 'foto',
          url_archivo: item.url_archivo || item.url_media || '',
          titulo: item.titulo || item.nombre || '',
          es_principal: !!item.es_principal,
        }))
      : [{ tipo: 'foto', url_archivo: '', titulo: '', es_principal: true }];
    setMediaItems(currentMedia);
    setIsModalOpen(true);
  };

  const updateMediaItem = (index: number, field: string, value: any) => {
    setMediaItems((prev) => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  const handleMediaFile = async (index: number, file?: File) => {
    if (!file) return;
    setUploadingMedia(index);
    try {
      const token = localStorage.getItem('access_token');
      if (!token || token === 'null') {
        toast.error('Tu sesión de administrador expiró. Vuelve a iniciar sesión.');
        return;
      }
      const data = new FormData();
      data.append('archivo', file);
      const response = await axios.post(`${BACKEND_HOST}/api/media-upload/`, data, {
        headers: { Authorization: `Bearer ${token}` },
      });
      updateMediaItem(index, 'url_archivo', response.data.url);
      updateMediaItem(index, 'tipo', file.type.startsWith('video/') ? 'video' : 'foto');
      toast.success('Archivo cargado correctamente');
    } catch (error: any) {
      const detail = error?.response?.data?.detail;
      toast.error(detail || (error?.response?.status === 401
        ? 'Tu sesión de administrador expiró. Vuelve a iniciar sesión.'
        : 'No se pudo cargar el archivo. Verifica el formato y el tamaño.'));
    } finally {
      setUploadingMedia(null);
    }
  };

  const addMediaItem = () => {
    setMediaItems((prev) => [...prev, { tipo: 'foto', url_archivo: '', titulo: '', es_principal: false }]);
  };

  const removeMediaItem = (index: number) => {
    setMediaItems((prev) => prev.filter((_, i) => i !== index));
  };

  const saveMediaForEvento = async (eventoId: number, shouldReplaceExisting = false) => {
    const validMedia = mediaItems.filter((item) => item.url_archivo && item.url_archivo.trim());

    if (shouldReplaceExisting && editingEvento?.multimedia?.length) {
      for (const media of editingEvento.multimedia) {
        if (media?.id) {
          await api.delete(`/multimedia/${media.id}/`).catch(() => undefined);
        }
      }
    }

    if (validMedia.length === 0) return;

    for (const [index, item] of validMedia.entries()) {
      await api.post('/multimedia/', {
        portafolio_evento: eventoId,
        tipo: item.tipo,
        url_archivo: item.url_archivo.trim(),
        titulo: item.titulo || `Media ${index + 1}`,
        es_principal: item.es_principal || index === 0,
        orden: index,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre.trim() || !form.fecha_evento || !form.lugar.trim() || !form.descripcion.trim()) {
      toast.error('Completa nombre, fecha, lugar y descripción');
      return;
    }

    const hasMedia = mediaItems.some((item) => item.url_archivo && item.url_archivo.trim());
    if (!hasMedia) {
      toast.error('Agrega al menos una imagen o video para el evento');
      return;
    }

    try {
      const payload = { ...form, nombre: form.nombre.trim(), lugar: form.lugar.trim(), descripcion: form.descripcion.trim() };

      if (editingEvento) {
        const res = await api.patch(`/portafolio/${editingEvento.id}/`, payload);
        await saveMediaForEvento(editingEvento.id, true);
        setEventos((prev) => prev.map((item) => item.id === editingEvento.id ? { ...item, ...res.data } : item));
        toast.success('Evento actualizado');
      } else {
        const res = await api.post('/portafolio/', payload);
        await saveMediaForEvento(res.data.id);
        const refreshed = await api.get('/portafolio/');
        setEventos(Array.isArray(refreshed.data) ? refreshed.data : refreshed.data.results || []);
        toast.success('Evento agregado al portafolio');
      }
      setIsModalOpen(false);
      resetForm();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.response?.data?.non_field_errors?.[0] || 'No se pudo guardar el evento';
      toast.error(msg);
    }
  };

  const handleDelete = async (evento: any) => {
    if (!window.confirm(`¿Deseas eliminar el evento "${evento.nombre}"?`)) return;
    try {
      await api.delete(`/portafolio/${evento.id}/`);
      setEventos((prev) => prev.filter((item) => item.id !== evento.id));
      toast.success('Evento eliminado');
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'No se pudo eliminar el evento');
    }
  };

  const handleToggleActivo = async (evento: any) => {
    try {
      const res = await api.patch(`/portafolio/${evento.id}/`, { activo: !evento.activo });
      setEventos((prev) => prev.map((item) => item.id === evento.id ? { ...item, activo: res.data.activo } : item));
      toast.success(res.data.activo ? 'Evento activado' : 'Evento desactivado');
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'No se pudo cambiar el estado');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-3">
        <div>
          <span className="page-eyebrow mb-3">Creatividad</span>
          <h1 className="page-title text-3xl md:text-4xl">Portafolio</h1>
        </div>
        <button
          onClick={openCreateModal}
          className="btn-primary px-6 py-3 text-xs uppercase tracking-widest"
        >
          + Nuevo Evento
        </button>
      </div>

      {loading ? (
        <div className="glass-card bg-surface/20 border-white/5 p-6 text-white/60">Cargando eventos...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {eventos.length === 0 ? (
            <div className="glass-card bg-surface/20 border-white/5 col-span-full text-white/50 p-6">No hay eventos registrados aún.</div>
          ) : (
            eventos.map((evento: any) => (
              <div key={evento.id} className="glass-card bg-surface/20 border-white/5 p-5">
                <div className="flex items-start justify-between mb-3 gap-3">
                  <h3 className="font-bold text-lg text-white">{evento.nombre}</h3>
                  <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-widest ${evento.activo ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-500/15 text-slate-300'}`}>
                    {evento.activo ? 'Activo' : 'Oculto'}
                  </span>
                </div>
                {evento.multimedia?.length > 0 && (
                  <div className="mb-4 grid grid-cols-3 gap-2">
                    {evento.multimedia.slice(0, 3).map((media: any) => (
                      <div key={media.id || media.url_archivo} className="aspect-square overflow-hidden rounded-lg border border-white/10 bg-black/20">
                        {media.tipo === 'video' ? (
                          <video src={resolvePortfolioMediaUrl(media.url_archivo)} muted playsInline preload="metadata" className="h-full w-full object-cover" />
                        ) : (
                          <img src={resolvePortfolioMediaUrl(media.url_archivo)} alt={media.titulo || evento.nombre} className="h-full w-full object-cover" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-white/60 text-sm mb-3">{evento.descripcion || 'Sin descripción'}</p>
                <div className="space-y-1 text-xs text-white/50 mb-4">
                  <p><strong className="text-white/70">Fecha:</strong> {evento.fecha_evento}</p>
                  <p><strong className="text-white/70">Lugar:</strong> {evento.lugar}</p>
                  <p><strong className="text-white/70">Tipo:</strong> {evento.tipo_evento}</p>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => openEditModal(evento)} className="flex-1 px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-white/70 hover:text-white transition-colors text-xs">
                    Editar
                  </button>
                  <button type="button" onClick={() => handleToggleActivo(evento)} className="flex-1 px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-white/70 hover:text-white transition-colors text-xs">
                    {evento.activo ? 'Ocultar' : 'Mostrar'}
                  </button>
                  <button type="button" onClick={() => handleDelete(evento)} className="px-3 py-2 rounded-lg border border-red-500/20 bg-red-500/10 text-red-300 hover:bg-red-500/20 transition-colors text-xs">
                    Eliminar
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); resetForm(); }} title={editingEvento ? 'Editar Evento del Portafolio' : 'Agregar Evento al Portafolio'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-white/60 uppercase tracking-widest mb-2">Nombre del evento</label>
            <input required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} type="text" className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary/50 transition-colors" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-white/60 uppercase tracking-widest mb-2">Fecha</label>
              <input required value={form.fecha_evento} onChange={(e) => setForm({ ...form, fecha_evento: e.target.value })} type="date" className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary/50 transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-white/60 uppercase tracking-widest mb-2">Tipo</label>
              <select value={form.tipo_evento} onChange={(e) => setForm({ ...form, tipo_evento: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary/50 transition-colors">
                <option value="Boda">Boda</option>
                <option value="Corporativo">Corporativo</option>
                <option value="Concierto">Concierto</option>
                <option value="Festival">Festival</option>
                <option value="Otro">Otro</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-white/60 uppercase tracking-widest mb-2">Lugar</label>
            <input required value={form.lugar} onChange={(e) => setForm({ ...form, lugar: e.target.value })} type="text" className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary/50 transition-colors" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-white/60 uppercase tracking-widest mb-2">Descripción</label>
            <textarea required value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} rows={4} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary/50 transition-colors resize-none" />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-white/60 uppercase tracking-widest">Multimedia</label>
              <button type="button" onClick={addMediaItem} className="text-xs text-primary hover:text-orange-300">+ Agregar media</button>
            </div>

            {mediaItems.map((item, index) => (
              <div key={`${index}-${item.tipo}`} className="rounded-xl border border-white/10 bg-white/5 p-3 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-white/50 uppercase tracking-widest mb-1">Tipo</label>
                    <select
                      value={item.tipo}
                      onChange={(e) => updateMediaItem(index, 'tipo', e.target.value as 'foto' | 'video')}
                      className="w-full bg-surface border border-white/10 rounded-lg p-2 text-white text-sm focus:outline-none"
                    >
                      <option value="foto">Imagen</option>
                      <option value="video">Video</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-semibold text-white/50 uppercase tracking-widest mb-1">Archivo multimedia</label>
                    <input
                      type="file"
                      accept={item.tipo === 'video' ? 'video/mp4,video/webm,video/quicktime' : 'image/jpeg,image/png,image/webp,image/gif'}
                      onChange={(e) => handleMediaFile(index, e.target.files?.[0])}
                      disabled={uploadingMedia === index}
                      className="topher-file-input w-full mb-2"
                    />
                    <input
                      value={item.url_archivo}
                      onChange={(e) => updateMediaItem(index, 'url_archivo', e.target.value)}
                      type="text"
                      placeholder={uploadingMedia === index ? 'Cargando archivo...' : 'O pega una URL externa (opcional)'}
                      className="w-full bg-surface border border-white/10 rounded-lg p-2 text-white text-sm focus:outline-none"
                    />
                    {item.url_archivo && (
                      <div className="mt-2 flex items-center gap-3">
                        <div className="h-14 w-14 overflow-hidden rounded-lg border border-white/10 bg-black/20">
                          {item.tipo === 'video' ? (
                            <video src={resolvePortfolioMediaUrl(item.url_archivo)} muted playsInline preload="metadata" className="h-full w-full object-cover" />
                          ) : (
                            <img src={resolvePortfolioMediaUrl(item.url_archivo)} alt={item.titulo || 'Vista previa'} className="h-full w-full object-cover" />
                          )}
                        </div>
                        <p className="min-w-0 truncate text-[11px] text-emerald-300">Archivo listo para guardar</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 justify-between">
                  <div className="flex-1">
                    <label className="block text-[10px] font-semibold text-white/50 uppercase tracking-widest mb-1">Título</label>
                    <input
                      value={item.titulo}
                      onChange={(e) => updateMediaItem(index, 'titulo', e.target.value)}
                      type="text"
                      placeholder="Opcional"
                      className="w-full bg-surface border border-white/10 rounded-lg p-2 text-white text-sm focus:outline-none"
                    />
                  </div>
                  <label className="flex items-center gap-2 text-xs text-white/60 mt-6">
                    <input
                      type="checkbox"
                      checked={item.es_principal}
                      onChange={(e) => {
                        setMediaItems((prev) => prev.map((prevItem, prevIndex) => {
                          if (prevIndex === index) return { ...prevItem, es_principal: e.target.checked };
                          return { ...prevItem, es_principal: false };
                        }));
                      }}
                      className="h-4 w-4 accent-primary"
                    />
                    Principal
                  </label>
                  {mediaItems.length > 1 && (
                    <button type="button" onClick={() => removeMediaItem(index)} className="mt-6 text-xs text-red-300 hover:text-red-200">Quitar</button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <label className="flex items-center gap-3 text-sm text-white/70">
            <input type="checkbox" checked={form.activo} onChange={(e) => setForm({ ...form, activo: e.target.checked })} className="h-4 w-4 accent-primary" />
            Mostrar en público
          </label>
          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={() => { setIsModalOpen(false); resetForm(); }} className="px-6 py-2 rounded-xl text-white/70 hover:bg-white/5 font-semibold transition-colors">Cancelar</button>
            <button type="submit" className="btn-primary px-6 py-2">{editingEvento ? 'Actualizar evento' : 'Guardar evento'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

const DashboardContactos = () => {
  const [mensajes, setMensajes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [respuestas, setRespuestas] = useState<Record<number, string>>({});
  const [sendingReply, setSendingReply] = useState<number | null>(null);

  const fetchMensajes = async () => {
    try {
      const res = await api.get('/contacto/');
      setMensajes(Array.isArray(res.data) ? res.data : res.data.results || []);
    } catch (error) {
      toast.error('Error al cargar mensajes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMensajes();
    const interval = window.setInterval(() => fetchMensajes(), 10000);
    return () => window.clearInterval(interval);
  }, []);

  const handleMarkRead = async (mensaje: any) => {
    try {
      await api.patch(`/contacto/${mensaje.id}/`, { leido: true });
      setMensajes((prev) => prev.map((item) => item.id === mensaje.id ? { ...item, leido: true } : item));
      toast.success('Mensaje marcado como leído');
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'No se pudo actualizar el mensaje');
    }
  };

  const handleReply = async (mensaje: any) => {
    const respuesta = (respuestas[mensaje.id] || '').trim();
    if (!respuesta) {
      toast.error('Escribe una respuesta antes de enviarla');
      return;
    }
    setSendingReply(mensaje.id);
    try {
      await api.post(`/contacto/${mensaje.id}/responder/`, { mensaje: respuesta });
      setRespuestas((prev) => ({ ...prev, [mensaje.id]: '' }));
      toast.success('Respuesta enviada al cliente');
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'No se pudo enviar la respuesta');
    } finally {
      setSendingReply(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <span className="page-eyebrow mb-3">Comunicación</span>
        <h1 className="page-title text-3xl md:text-4xl">Mensajes</h1>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="glass-card bg-surface/20 border-white/5 p-6 text-white/60 text-center">Cargando mensajes...</div>
        ) : mensajes.length === 0 ? (
          <div className="glass-card bg-surface/20 border-white/5 p-6 text-white/50 text-center">No hay mensajes recibidos.</div>
        ) : (
          mensajes.map((mensaje) => (
            <div key={mensaje.id} className={`glass-card border ${mensaje.leido ? 'border-white/5 bg-surface/20' : 'border-primary/20 bg-primary/5'} p-5`}>
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-white text-lg">{mensaje.nombre_remitente}</h3>
                    {!mensaje.leido && <span className="rounded-full bg-primary/20 text-primary px-2 py-1 text-[10px] uppercase tracking-widest">Nuevo</span>}
                  </div>
                  <p className="text-sm text-white/60">{mensaje.correo_remitente}</p>
                </div>
                <div className="text-xs text-white/45 uppercase tracking-widest">
                  {new Date(mensaje.recibido_en).toLocaleString('es-ES')}
                </div>
              </div>

              <div className="mb-4">
                <p className="text-xs uppercase tracking-widest text-white/45 mb-1">Asunto</p>
                <p className="font-semibold text-white">{mensaje.asunto}</p>
              </div>

              <p className="text-white/70 leading-relaxed whitespace-pre-wrap mb-4">{mensaje.mensaje}</p>

              <div className="border-t border-white/10 pt-4">
                <label className="block text-[10px] uppercase tracking-widest text-white/45 mb-2">
                  Responder al cliente
                </label>
                {mensaje.usuario ? (
                  <>
                    <textarea
                      rows={2}
                      value={respuestas[mensaje.id] || ''}
                      onChange={(event) => setRespuestas((prev) => ({ ...prev, [mensaje.id]: event.target.value }))}
                      placeholder="Escribe una respuesta..."
                      className="w-full rounded-xl border border-white/10 bg-background/60 p-3 text-sm text-white placeholder-white/30 outline-none focus:border-primary/60 resize-none"
                    />
                    <button
                      type="button"
                      disabled={sendingReply === mensaje.id}
                      onClick={() => handleReply(mensaje)}
                      className="btn-primary mt-3 px-4 py-2 text-xs disabled:opacity-50"
                    >
                      {sendingReply === mensaje.id ? 'Enviando...' : 'Enviar respuesta'}
                    </button>
                  </>
                ) : (
                  <p className="text-xs text-white/40">Este mensaje fue enviado como visitante y no tiene una cuenta para recibir respuestas dentro de la plataforma.</p>
                )}
              </div>

              {!mensaje.leido && (
                <button type="button" onClick={() => handleMarkRead(mensaje)} className="btn-primary px-4 py-2 text-xs uppercase tracking-widest">
                  Marcar como leído
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// Dashboard Principal
const Dashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { path: '', label: 'Resumen', icon: Home },
    { path: 'reservas', label: 'Reservas', icon: Calendar },
    { path: 'servicios', label: 'Servicios', icon: Briefcase },
    { path: 'usuarios', label: 'Usuarios', icon: Users },
    { path: 'personal', label: 'Personal', icon: Users },
    { path: 'portafolio', label: 'Portafolio', icon: ImageIcon },
    { path: 'contactos', label: 'Mensajes', icon: MessageSquare },
  ];

  const handleLogout = () => {
    localStorage.clear();
    toast.success("Sesión cerrada");
    navigate('/login');
  };

  useEffect(() => {
    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSidebarOpen(false);
    };

    window.addEventListener('keydown', closeWithEscape);
    return () => window.removeEventListener('keydown', closeWithEscape);
  }, []);

  useEffect(() => {
    if (window.innerWidth < 768 && sidebarOpen) {
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = previousOverflow;
      };
    }
  }, [sidebarOpen]);

  return (
    <div className="min-h-screen bg-background text-white flex overflow-x-hidden">
      <Toaster position="top-right" toastOptions={{
        style: {
          background: '#1f1f22',
          color: '#fff',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '12px'
        }
      }} />
      
      {/* Sidebar */}
      <div className={`fixed md:sticky md:top-0 md:translate-x-0 top-0 left-0 h-screen w-[min(18rem,88vw)] shrink-0 border-r border-white/10 bg-background/95 backdrop-blur-xl transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} z-50 panel-surface rounded-none`}>
        <div className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3 mb-8">
          <Link to="/" className="flex flex-col" onClick={() => setSidebarOpen(false)}>
            <span className="text-2xl font-display font-black tracking-tighter uppercase">Topher</span>
            <span className="text-[8px] font-medium tracking-[0.7em] uppercase text-white/40">Admin</span>
          </Link>
            <button type="button" aria-label="Cerrar menú de administración" onClick={() => setSidebarOpen(false)} className="md:hidden shrink-0 rounded-lg p-2 text-white/60 hover:bg-white/10 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <nav className="space-y-2 px-3 sm:px-4 overflow-y-auto max-h-[calc(100vh-160px)]">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === `/dashboard${item.path ? '/' + item.path : ''}` || 
                           (item.path === '' && location.pathname === '/dashboard/');
            return (
              <Link
                key={item.path}
                to={`/dashboard${item.path ? '/' + item.path : ''}`}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive
                    ? 'bg-primary/20 border border-primary/30 text-primary'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-semibold text-sm">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-6 left-4 right-4">
          <button
            onClick={handleLogout}
            className="logout-button logout-button--full"
            aria-label="Cerrar Sesión"
          >
            <span className="logout-icon"><LogOut className="w-5 h-5" /></span>
            <span className="logout-label">Cerrar Sesión</span>
          </button>
        </div>
      </div>
      {sidebarOpen && (
        <button type="button" aria-label="Cerrar menú al tocar fuera" onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden" />
      )}

      {/* Main Content */}
      <div className="min-w-0 flex-1 w-full max-w-full overflow-hidden flex flex-col h-screen">
        {/* Top Bar */}
        <div className="sticky top-0 bg-background/90 backdrop-blur-xl border-b border-white/10 min-h-20 flex-shrink-0 flex items-center px-4 sm:px-6 z-40">
          <button
            type="button"
            aria-label={sidebarOpen ? 'Cerrar menú de administración' : 'Abrir menú de administración'}
            aria-expanded={sidebarOpen}
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="md:hidden p-2 -ml-2 hover:bg-white/5 rounded-lg transition-colors"
          >
            {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
          <div className="min-w-0 flex-1 flex items-center gap-2 sm:gap-3 ml-3 sm:ml-4">
            <Flame className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-white/80 truncate text-sm sm:text-base">Panel de Administración</h2>
          </div>
        </div>

        {/* Content */}
        <div className="min-w-0 p-3 sm:p-6 lg:p-8 overflow-y-auto flex-1">
          <Routes>
            <Route path="" element={<DashboardResumen />} />
            <Route path="reservas" element={<DashboardReservas />} />
            <Route path="servicios" element={<DashboardServicios />} />
            <Route path="usuarios" element={<DashboardUsuarios />} />
            <Route path="personal" element={<DashboardPersonal />} />
            <Route path="portafolio" element={<DashboardPortafolio />} />
            <Route path="contactos" element={<DashboardContactos />} />
          </Routes>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
