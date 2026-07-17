import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Calendar, Users, Briefcase, Image,
  MessageSquare, LogOut, Menu, X, Home, Flame, Sparkles
} from 'lucide-react';
import api from '../api/client';

const DashboardResumen = () => {
  const [stats, setStats] = useState({ total_reservas: 0, pendientes: 0, confirmadas: 0, completadas: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/reservas/?limit=1000');
        const data = Array.isArray(res.data) ? res.data : res.data.results || [];
        setStats({
          total_reservas: data.length,
          pendientes: data.filter((r: any) => r.status_id === 4).length,
          confirmadas: data.filter((r: any) => r.status_id === 5).length,
          completadas: data.filter((r: any) => r.status_id === 8).length,
        });
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
      )}
    </div>
  );
};

const DashboardReservas = () => {
  const [reservas, setReservas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReservas = async () => {
      try {
        const res = await api.get('/reservas/');
        setReservas(Array.isArray(res.data) ? res.data : res.data.results || []);
      } finally {
        setLoading(false);
      }
    };
    fetchReservas();
  }, []);

  const STATUS_LABELS: Record<number, string> = {
    4: 'Pendiente', 5: 'Confirmada', 6: 'En Proceso', 7: 'Cancelada', 8: 'Completada'
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <span className="page-eyebrow mb-3">Operación</span>
          <h1 className="page-title text-3xl md:text-4xl">Reservas</h1>
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
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-white/50">Cargando...</td></tr>
              ) : reservas.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-white/50">Sin reservas</td></tr>
              ) : (
                reservas.slice(0, 20).map((r: any) => (
                  <tr key={r.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="px-4 py-3 text-white/70">{r.numero_solicitud}</td>
                    <td className="px-4 py-3 text-white/80">{r.nombre_evento}</td>
                    <td className="px-4 py-3 text-white/70">{r.fecha_evento}</td>
                    <td className="px-4 py-3 text-white/70">{r.usuario?.nombre_completo || 'N/A'}</td>
                    <td className="px-4 py-3">
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/20">
                        {STATUS_LABELS[r.status_id] || 'Desconocido'}
                      </span>
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

const DashboardServicios = () => {
  const [servicios, setServicios] = useState([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-3">
        <div>
          <span className="page-eyebrow mb-3">Catálogo</span>
          <h1 className="page-title text-3xl md:text-4xl">Servicios</h1>
        </div>
        <button className="btn-primary px-6 py-3 text-xs uppercase tracking-widest">
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
    </div>
  );
};

const DashboardUsuarios = () => {
  return (
    <div className="glass-card bg-surface/20 border-white/5">
      <span className="page-eyebrow mb-4">Gestión</span>
      <h1 className="page-title text-3xl md:text-4xl mb-4">Usuarios</h1>
      <p className="text-white/60">Gestión de usuarios del sistema.</p>
    </div>
  );
};

const DashboardPersonal = () => {
  return (
    <div className="glass-card bg-surface/20 border-white/5">
      <span className="page-eyebrow mb-4">Equipo</span>
      <h1 className="page-title text-3xl md:text-4xl mb-4">Personal</h1>
      <p className="text-white/60">Gestión y asignación de personal.</p>
    </div>
  );
};

const DashboardPortafolio = () => {
  return (
    <div className="glass-card bg-surface/20 border-white/5">
      <span className="page-eyebrow mb-4">Creatividad</span>
      <h1 className="page-title text-3xl md:text-4xl mb-4">Portafolio</h1>
      <p className="text-white/60">Gestión de eventos del portafolio.</p>
    </div>
  );
};

const DashboardContactos = () => {
  return (
    <div className="glass-card bg-surface/20 border-white/5">
      <span className="page-eyebrow mb-4">Comunicación</span>
      <h1 className="page-title text-3xl md:text-4xl mb-4">Mensajes</h1>
      <p className="text-white/60">Mensajes recibidos del formulario de contacto.</p>
    </div>
  );
};

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
    { path: 'portafolio', label: 'Portafolio', icon: Image },
    { path: 'contactos', label: 'Mensajes', icon: MessageSquare },
  ];

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background text-white flex">
      {/* Sidebar */}
      <div className={`fixed md:static top-0 left-0 h-screen w-64 border-r border-white/10 bg-background/80 backdrop-blur-xl transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} z-50 panel-surface rounded-none`}>
        <div className="p-6">
          <Link to="/" className="flex flex-col mb-8">
            <span className="text-2xl font-display font-black tracking-tighter uppercase">Topher</span>
            <span className="text-[8px] font-medium tracking-[0.7em] uppercase text-white/40">Admin</span>
          </Link>
        </div>

        <nav className="space-y-2 px-4">
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
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors border border-red-500/20"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-semibold text-sm">Cerrar Sesión</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1">
        {/* Top Bar */}
        <div className="sticky top-0 bg-background/80 backdrop-blur-xl border-b border-white/10 h-20 flex items-center px-6 z-40">
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
        <div className="p-8">
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
