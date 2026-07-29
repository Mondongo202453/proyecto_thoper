import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Calendar, Users, Briefcase, Image as ImageIcon,
  MessageSquare, LogOut, Menu, X, Home, Flame, Sparkles, Search, Filter, Eye
} from 'lucide-react';
import { Toaster, toast } from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import api from '../api/client';
import Modal from '../components/Modal';

const DashboardResumen = () => {
  const [stats, setStats] = useState({ total_reservas: 0, pendientes: 0, confirmadas: 0, completadas: 0 });
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/reservas/?limit=1000');
        const data = Array.isArray(res.data) ? res.data : res.data.results || [];
        
        const pend = data.filter((r: any) => r.status_id === 4).length;
        const conf = data.filter((r: any) => r.status_id === 5).length;
        const proc = data.filter((r: any) => r.status_id === 6).length;
        const canc = data.filter((r: any) => r.status_id === 7).length;
        const comp = data.filter((r: any) => r.status_id === 8).length;

        setStats({
          total_reservas: data.length,
          pendientes: pend,
          confirmadas: conf,
          completadas: comp,
        });

        setChartData([
          { name: 'Pendientes', cantidad: pend, fill: '#f59e0b' },
          { name: 'Confirmadas', cantidad: conf, fill: '#10b981' },
          { name: 'En Proceso', cantidad: proc, fill: '#3b82f6' },
          { name: 'Completadas', cantidad: comp, fill: '#8b5cf6' },
          { name: 'Canceladas', cantidad: canc, fill: '#ef4444' },
        ]);
      } catch (err) {
        toast.error("Error al cargar resumen");
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const cards = [
    { label: 'Total Reservas', value: stats.total_reservas, tone: 'from-blue-500/20 to-blue-500/5', icon: Calendar },
    { label: 'Pendientes', value: stats.pendientes, tone: 'from-amber-500/20 to-amber-500/5', icon: Sparkles },
    { label: 'Confirmadas', value: stats.confirmadas, tone: 'from-emerald-500/20 to-emerald-500/5', icon: Flame },
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
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
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
                <YAxis stroke="rgba(255,255,255,0.5)" tick={{fill: 'rgba(255,255,255,0.5)'}} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#1f1f22', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Bar dataKey="cantidad" radius={[4, 4, 0, 0]} />
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
  
  // Modal State
  const [selectedReserva, setSelectedReserva] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const STATUS_LABELS: Record<number, string> = {
    4: 'Pendiente', 5: 'Confirmada', 6: 'En Proceso', 7: 'Cancelada', 8: 'Completada'
  };

  const fetchReservas = async () => {
    try {
      const res = await api.get('/reservas/?limit=100');
      setReservas(Array.isArray(res.data) ? res.data : res.data.results || []);
    } catch (err) {
      toast.error("Error al cargar reservas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReservas();
  }, []);

  const handleStatusChange = async (id: number, newStatusId: number) => {
    try {
      await api.patch(`/reservas/${id}/`, { status_id: newStatusId });
      toast.success("Estado actualizado exitosamente");
      setReservas(reservas.map(r => r.id === id ? { ...r, status_id: newStatusId } : r));
    } catch (error) {
      toast.error("Error al actualizar el estado");
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
          <select 
            className="w-full bg-surface/30 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-white appearance-none focus:outline-none focus:border-primary/50 transition-colors cursor-pointer"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="" className="bg-background text-white">Todos los estados</option>
            {Object.entries(STATUS_LABELS).map(([id, label]) => (
              <option key={id} value={id} className="bg-background text-white">{label}</option>
            ))}
          </select>
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
                      <select
                        value={r.status_id}
                        onChange={(e) => handleStatusChange(r.id, parseInt(e.target.value))}
                        className="px-2 py-1 rounded-lg text-xs font-semibold bg-surface border border-white/20 text-white cursor-pointer focus:outline-none focus:border-primary/50"
                      >
                        {Object.entries(STATUS_LABELS).map(([id, label]) => (
                          <option key={id} value={id}>{label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button 
                        onClick={() => { setSelectedReserva(r); setIsModalOpen(true); }}
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
          </div>
        )}
      </Modal>
    </div>
  );
};

const DashboardServicios = () => {
  const [servicios, setServicios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const fetchServicios = async () => {
      try {
        const res = await api.get('/servicios/');
        setServicios(Array.isArray(res.data) ? res.data : res.data.results || []);
      } finally {
        setLoading(false);
      }
    };
    fetchServicios();
  }, []);

  const handleCrearServicio = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate API call
    setTimeout(() => {
      toast.success("Servicio creado exitosamente (Simulado)");
      setIsModalOpen(false);
    }, 500);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-3">
        <div>
          <span className="page-eyebrow mb-3">Catálogo</span>
          <h1 className="page-title text-3xl md:text-4xl">Servicios</h1>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
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
            <div key={s.id} className="glass-card bg-surface/20 border-white/5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg text-white">{s.nombre}</h3>
                <span className="text-[10px] font-semibold uppercase tracking-widest text-primary">{s.categoria}</span>
              </div>
              <p className="text-sm text-white/60 mb-6 leading-relaxed">{s.descripcion}</p>
              <button className="text-xs font-semibold uppercase tracking-widest text-white/70 hover:text-primary transition-colors">Editar</button>
            </div>
          ))
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Crear Nuevo Servicio">
        <form onSubmit={handleCrearServicio} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-white/60 uppercase tracking-widest mb-2">Nombre del Servicio</label>
            <input required type="text" className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary/50 transition-colors" placeholder="Ej. Fotografía de Bodas" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-white/60 uppercase tracking-widest mb-2">Categoría</label>
            <select className="w-full bg-surface border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary/50 transition-colors">
              <option value="fotografia">Fotografía</option>
              <option value="video">Video</option>
              <option value="audio">Audio</option>
              <option value="produccion">Producción</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-white/60 uppercase tracking-widest mb-2">Descripción</label>
            <textarea required rows={4} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary/50 transition-colors resize-none" placeholder="Detalles del servicio..."></textarea>
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2 rounded-xl text-white/70 hover:bg-white/5 font-semibold transition-colors">Cancelar</button>
            <button type="submit" className="btn-primary px-6 py-2">Guardar Servicio</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

const DashboardUsuarios = () => (
  <div className="glass-card bg-surface/20 border-white/5">
    <span className="page-eyebrow mb-4">Gestión</span>
    <h1 className="page-title text-3xl md:text-4xl mb-4">Usuarios</h1>
    <p className="text-white/60">Gestión de usuarios del sistema.</p>
  </div>
);

const DashboardPersonal = () => (
  <div className="glass-card bg-surface/20 border-white/5">
    <span className="page-eyebrow mb-4">Equipo</span>
    <h1 className="page-title text-3xl md:text-4xl mb-4">Personal</h1>
    <p className="text-white/60">Gestión y asignación de personal.</p>
  </div>
);

const DashboardPortafolio = () => (
  <div className="glass-card bg-surface/20 border-white/5">
    <span className="page-eyebrow mb-4">Creatividad</span>
    <h1 className="page-title text-3xl md:text-4xl mb-4">Portafolio</h1>
    <p className="text-white/60">Gestión de eventos del portafolio.</p>
  </div>
);

const DashboardContactos = () => (
  <div className="glass-card bg-surface/20 border-white/5">
    <span className="page-eyebrow mb-4">Comunicación</span>
    <h1 className="page-title text-3xl md:text-4xl mb-4">Mensajes</h1>
    <p className="text-white/60">Mensajes recibidos del formulario de contacto.</p>
  </div>
);

// Dashboard Principal
const Dashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
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

  return (
    <div className="min-h-screen bg-background text-white flex">
      <Toaster position="top-right" toastOptions={{
        style: {
          background: '#1f1f22',
          color: '#fff',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '12px'
        }
      }} />
      
      {/* Sidebar */}
      <div className={`fixed md:static top-0 left-0 h-screen w-64 border-r border-white/10 bg-background/80 backdrop-blur-xl transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} z-50 panel-surface rounded-none`}>
        <div className="p-6">
          <Link to="/" className="flex flex-col mb-8">
            <span className="text-2xl font-display font-black tracking-tighter uppercase">Topher</span>
            <span className="text-[8px] font-medium tracking-[0.7em] uppercase text-white/40">Admin</span>
          </Link>
        </div>

        <nav className="space-y-2 px-4 overflow-y-auto max-h-[calc(100vh-160px)]">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === `/dashboard${item.path ? '/' + item.path : ''}` || 
                           (item.path === '' && location.pathname === '/dashboard/');
            return (
              <Link
                key={item.path}
                to={`/dashboard${item.path ? '/' + item.path : ''}`}
                onClick={() => {
                  if (window.innerWidth < 768) {
                    setSidebarOpen(false);
                  }
                }}
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
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors border border-red-500/20"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-semibold text-sm">Cerrar Sesión</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 w-full max-w-full overflow-hidden flex flex-col h-screen">
        {/* Top Bar */}
        <div className="sticky top-0 bg-background/80 backdrop-blur-xl border-b border-white/10 h-20 flex-shrink-0 flex items-center px-6 z-40">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="md:hidden p-2 hover:bg-white/5 rounded-lg transition-colors"
          >
            {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
          <div className="flex-1 flex items-center gap-3 ml-4">
            <Flame className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-white/80">Panel de Administración</h2>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 md:p-8 overflow-y-auto flex-1">
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
