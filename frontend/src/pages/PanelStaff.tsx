import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Flame, Calendar, MapPin, Clock, ChevronRight, User2,
  Loader2, LogOut, AlertCircle, CheckCircle2
} from 'lucide-react';
import api from '../api/client';

const STATUS_COLORS: Record<number, string> = {
  4: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
  5: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
  6: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
  7: 'bg-red-500/10 border-red-500/30 text-red-400',
  8: 'bg-purple-500/10 border-purple-500/30 text-purple-400',
};

const STATUS_LABELS: Record<number, string> = {
  4: 'Pendiente', 5: 'Confirmada', 6: 'En Proceso', 7: 'Cancelada', 8: 'Completada'
};

interface StaffAssignment {
  id: number;
  rol_en_evento: string;
  fecha_asignacion: string;
  confirmado: boolean;
  notas?: string;
  reserva: {
    id: number;
    numero_solicitud: string;
    nombre_evento: string;
    fecha_evento: string;
    hora_evento: string;
    lugar: string;
    municipio: string;
    asistentes: number;
    status_id: number;
    status_nombre?: string;
    servicios_contratados?: any[];
  };
  personal: {
    nombre: string;
    especialidad: string;
  };
}

const PanelStaff = () => {
  const [asignaciones, setAsignaciones] = useState<StaffAssignment[]>([]);
  const [selected, setSelected] = useState<StaffAssignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const userRaw = localStorage.getItem('user');
  const user = userRaw ? JSON.parse(userRaw) : null;

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) { navigate('/login'); return; }
    fetchAsignaciones();
  }, []);

  const fetchAsignaciones = async () => {
    setLoading(true);
    try {
      const res = await api.get('/staff-assignments/');
      const data = Array.isArray(res.data) ? res.data : res.data.results || [];
      // Ordenar por fecha del evento ascendente
      data.sort((a: StaffAssignment, b: StaffAssignment) =>
        new Date(a.reserva.fecha_evento).getTime() - new Date(b.reserva.fecha_evento).getTime()
      );
      setAsignaciones(data);
    } catch {
      setError('No se pudieron cargar tus asignaciones.');
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const esPasado = (fecha: string) => new Date(fecha) < new Date();
  const esProximo = (fecha: string) => {
    const diff = (new Date(fecha).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 7;
  };

  const proximos = asignaciones.filter(a => !esPasado(a.reserva.fecha_evento));
  const pasados = asignaciones.filter(a => esPasado(a.reserva.fecha_evento));

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
          <div className="hidden md:flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
              <User2 className="w-4 h-4 text-primary" />
            </div>
            <div>
              <div className="text-xs font-bold leading-none">{user?.nombre_completo}</div>
              <div className="text-[9px] text-primary uppercase tracking-widest">Personal Staff</div>
            </div>
          </div>
          <button onClick={logout} className="flex items-center gap-2 border border-white/10 px-4 py-2 rounded-xl text-xs font-bold text-red-400 hover:bg-red-500/10 transition-all">
            <LogOut className="w-4 h-4" /> Salir
          </button>
        </div>
      </header>

      <main className="flex-1 pt-28 pb-16 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-10">
            <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-primary">Panel de Personal</span>
            <h1 className="text-4xl md:text-5xl font-display font-black uppercase tracking-tight mt-2 mb-2">
              Mis Asignaciones
            </h1>
            <p className="text-white/40">Aquí puedes ver todos los eventos a los que has sido asignado.</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-10">
            <div className="glass-card p-5 bg-surface/20 border-white/5 text-center">
              <div className="text-2xl font-display font-black text-white">{asignaciones.length}</div>
              <div className="text-[9px] text-white/30 uppercase tracking-widest">Total</div>
            </div>
            <div className="glass-card p-5 bg-surface/20 border-white/5 text-center">
              <div className="text-2xl font-display font-black text-emerald-400">{proximos.length}</div>
              <div className="text-[9px] text-white/30 uppercase tracking-widest">Próximos</div>
            </div>
            <div className="glass-card p-5 bg-surface/20 border-white/5 text-center">
              <div className="text-2xl font-display font-black text-white/40">{pasados.length}</div>
              <div className="text-[9px] text-white/30 uppercase tracking-widest">Realizados</div>
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs py-3 px-4 rounded-xl flex items-center gap-2 mb-6">
              <AlertCircle className="w-4 h-4" /> {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : asignaciones.length === 0 ? (
            <div className="glass-card p-16 bg-surface/20 border-white/5 text-center">
              <Flame className="w-12 h-12 text-primary/30 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">No tienes eventos asignados</h3>
              <p className="text-white/40 text-sm">El administrador te notificará cuando seas asignado a un evento.</p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Próximos eventos */}
              {proximos.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-4">
                    Próximos eventos ({proximos.length})
                  </div>
                  <div className="space-y-3">
                    {proximos.map(a => (
                      <AsignacionCard
                        key={a.id}
                        asignacion={a}
                        esProximo={esProximo(a.reserva.fecha_evento)}
                        onClick={() => setSelected(a)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Historial */}
              {pasados.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-4">
                    Historial ({pasados.length})
                  </div>
                  <div className="space-y-3 opacity-60">
                    {pasados.slice(0, 5).map(a => (
                      <AsignacionCard key={a.id} asignacion={a} esProximo={false} onClick={() => setSelected(a)} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Modal de detalle */}
      {selected && (
        <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-surface border border-white/10 w-full max-w-lg rounded-2xl shadow-2xl animate-fade-in-scale">
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-display font-black uppercase tracking-tight">{selected.reserva.nombre_evento}</h3>
                <span className="text-xs text-primary">{selected.reserva.numero_solicitud}</span>
              </div>
              <button onClick={() => setSelected(null)} className="p-2 hover:bg-white/5 rounded-xl transition-all text-white/40 hover:text-white">✕</button>
            </div>
            <div className="p-6 space-y-5">
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-[9px] font-bold uppercase tracking-widest ${STATUS_COLORS[selected.reserva.status_id]}`}>
                <CheckCircle2 className="w-3 h-3" />
                {selected.reserva.status_nombre || STATUS_LABELS[selected.reserva.status_id]}
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-[10px] text-white/30 uppercase tracking-widest mb-1">Fecha</div>
                  <div className="font-bold flex items-center gap-2"><Calendar className="w-4 h-4 text-primary" />{selected.reserva.fecha_evento}</div>
                </div>
                <div>
                  <div className="text-[10px] text-white/30 uppercase tracking-widest mb-1">Hora</div>
                  <div className="font-bold flex items-center gap-2"><Clock className="w-4 h-4 text-primary" />{selected.reserva.hora_evento}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-[10px] text-white/30 uppercase tracking-widest mb-1">Lugar</div>
                  <div className="font-bold flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" />{selected.reserva.lugar}, {selected.reserva.municipio}</div>
                </div>
                <div>
                  <div className="text-[10px] text-white/30 uppercase tracking-widest mb-1">Tu Rol</div>
                  <div className="font-bold text-primary">{selected.rol_en_evento}</div>
                </div>
                <div>
                  <div className="text-[10px] text-white/30 uppercase tracking-widest mb-1">Especialidad</div>
                  <div className="font-bold">{selected.personal?.especialidad}</div>
                </div>
              </div>

              {selected.notas && (
                <div className="p-4 bg-white/5 rounded-xl">
                  <div className="text-[10px] text-white/30 uppercase tracking-widest mb-2">Notas del evento</div>
                  <p className="text-white/60 text-xs">{selected.notas}</p>
                </div>
              )}

              <div className="pt-4 border-t border-white/5">
                <p className="text-[10px] text-white/30 text-center">
                  Para consultas sobre esta asignación, usa el <Link to="/contacto" className="text-primary hover:underline">formulario de contacto</Link>.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const AsignacionCard = ({
  asignacion, esProximo, onClick
}: { asignacion: StaffAssignment; esProximo: boolean; onClick: () => void }) => (
  <div
    onClick={onClick}
    className={`glass-card p-5 bg-surface/20 border-white/5 cursor-pointer hover:border-primary/20 hover:bg-primary/5 transition-all ${esProximo ? 'ring-1 ring-primary/20' : ''}`}
  >
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-start gap-4">
        <div className={`p-2.5 rounded-xl border flex-shrink-0 ${esProximo ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-white/5 border-white/10 text-white/40'}`}>
          <Calendar className="w-5 h-5" />
        </div>
        <div>
          {esProximo && (
            <span className="inline-block text-[8px] font-bold uppercase tracking-widest bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/20 mb-1">
              Esta semana
            </span>
          )}
          <h4 className="font-bold text-sm">{asignacion.reserva.nombre_evento}</h4>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-white/40 mt-1">
            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{asignacion.reserva.fecha_evento}</span>
            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{asignacion.reserva.municipio}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <span className="text-[9px] font-bold text-primary/70 uppercase tracking-widest hidden md:block">{asignacion.rol_en_evento}</span>
        <ChevronRight className="w-4 h-4 text-white/20" />
      </div>
    </div>
  </div>
);

export default PanelStaff;
