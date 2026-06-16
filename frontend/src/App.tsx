import React from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { Flame, Star, Camera, Phone, Menu, X, ChevronRight, Play, Mail } from 'lucide-react';

import Services from './components/Services';
import BookingForm from './components/BookingForm';
import Portfolio from './components/Portfolio';
import Login from './pages/Login';
import Register from './pages/Register';
import RecuperarPassword from './pages/RecuperarPassword';
import Contacto from './pages/Contacto';
import MisReservas from './pages/MisReservas';
import PanelStaff from './pages/PanelStaff';
import Dashboard from './pages/Dashboard';
import PrivateRoute from './components/PrivateRoute';
import Perfil from './pages/Perfil';

// --- COMPONENTS ---

const Footer = () => (
  <footer className="py-20 px-6 border-t border-white/5 bg-background">
    <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 w-full">
      <div className="md:col-span-2">
        <div className="flex flex-col mb-6">
          <span className="text-4xl font-display font-black tracking-tighter uppercase leading-none">
            Topher
          </span>
          <div className="h-[1px] w-full bg-white/20 my-1" />
          <span className="text-[10px] font-medium tracking-[0.8em] uppercase text-white/60">
            Producciones
          </span>
        </div>
        <p className="text-white/40 max-w-sm mb-8">
          Líderes en efectos especiales y pirotecnia profesional para los eventos más exigentes de Colombia.
        </p>
      </div>
      <div>
        <h4 className="font-bold mb-6 uppercase tracking-widest text-xs text-white/30">Navegación</h4>
        <ul className="space-y-4 text-sm">
          <li><Link to="/" className="hover:text-primary transition-colors">Inicio</Link></li>
          <li><Link to="/servicios" className="hover:text-primary transition-colors">Servicios</Link></li>
          <li><Link to="/portafolio" className="hover:text-primary transition-colors">Portafolio</Link></li>
          <li><Link to="/solicitud" className="hover:text-primary transition-colors">Contacto</Link></li>
        </ul>
      </div>
      <div>
        <h4 className="font-bold mb-6 uppercase tracking-widest text-xs text-white/30">Contacto</h4>
        <ul className="space-y-4 text-sm text-white/60">
          <li className="flex items-center gap-2"><Phone className="w-4 h-4 text-primary" /> +57 300 000 0000</li>
          <li className="flex items-center gap-2"><Mail className="w-4 h-4 text-primary" /> contacto@topher.com</li>
          <li>Medellín, Antioquia</li>
        </ul>
      </div>
    </div>
    <div className="max-w-7xl mx-auto w-full mt-10 pt-8 border-t border-white/5 text-center text-[8px] uppercase tracking-[0.5em] text-white/10">
      © {new Date().getFullYear()} Topher Producciones - Medellín, Colombia.
    </div>
  </footer>
);

const Navbar = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isAuthenticated, setIsAuthenticated] = React.useState(!!localStorage.getItem('access_token'));
  const location = useLocation();

  // Actualizar autenticación cuando cambia en otra pestaña o en el mismo tab
  React.useEffect(() => {
    const handleStorage = () => setIsAuthenticated(!!localStorage.getItem('access_token'));
    window.addEventListener('storage', handleStorage);
    // También verificar al cambiar de ruta y cerrar menú móvil
    setIsAuthenticated(!!localStorage.getItem('access_token'));
    setIsOpen(false); // Cerrar menú al navegar (evita crash AnimatePresence)
    return () => window.removeEventListener('storage', handleStorage);
  }, [location]);

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    window.location.href = '/';
  };

  const isActive = (path: string) => location.pathname === path ? 'text-primary' : 'text-white/60';

  return (
    <nav className="fixed top-0 left-0 right-0 z-[100] bg-background/40 backdrop-blur-xl border-b border-white/5">
      <div className="max-w-7xl mx-auto px-6 h-24 flex items-center justify-between">
        <Link to="/" className="flex flex-col group">
          <span className="text-3xl font-display font-black tracking-tighter uppercase leading-none group-hover:text-primary transition-colors">
            Topher
          </span>
          <div className="h-[1px] w-full bg-white/20 my-0.5 group-hover:bg-primary transition-colors" />
          <span className="text-[7px] font-medium tracking-[0.7em] uppercase text-white/40 group-hover:text-white transition-colors">
            Producciones
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-12">
          <Link to="/" className={`text-[10px] font-bold uppercase tracking-widest hover:text-primary transition-colors ${isActive('/')}`}>Inicio</Link>
          <Link to="/servicios" className={`text-[10px] font-bold uppercase tracking-widest hover:text-primary transition-colors ${isActive('/servicios')}`}>Servicios</Link>
          <Link to="/portafolio" className={`text-[10px] font-bold uppercase tracking-widest hover:text-primary transition-colors ${isActive('/portafolio')}`}>Portafolio</Link>
          <Link to="/solicitud" className={`text-[10px] font-bold uppercase tracking-widest hover:text-primary transition-colors ${isActive('/solicitud')}`}>Solicitud</Link>
        </div>

        <div className="hidden md:flex items-center gap-6">
          {isAuthenticated ? (
            <>
              <Link to="/dashboard" className="text-[10px] font-bold uppercase tracking-widest border border-primary/25 px-6 py-2.5 rounded-full bg-primary/10 hover:bg-primary/20 transition-all text-primary">Dashboard</Link>
              <button onClick={logout} className="text-[10px] font-bold uppercase tracking-widest border border-white/10 px-6 py-2.5 rounded-full hover:bg-white/5 transition-all">Salir</button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-[10px] font-bold uppercase tracking-widest hover:text-primary transition-colors">Ingresar</Link>
              <Link to="/registro" className="btn-primary py-2.5 text-[10px]">Registrarse</Link>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button className="md:hidden p-2" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Nav */}
      <div 
        className={`md:hidden fixed inset-0 top-24 bg-background z-50 p-8 flex flex-col gap-8 transition-all duration-300 ease-out ${
          isOpen ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4 pointer-events-none'
        }`}
      >
        <Link to="/" onClick={() => setIsOpen(false)} className="text-2xl font-bold uppercase tracking-widest">Inicio</Link>
        <Link to="/servicios" onClick={() => setIsOpen(false)} className="text-2xl font-bold uppercase tracking-widest">Servicios</Link>
        <Link to="/portafolio" onClick={() => setIsOpen(false)} className="text-2xl font-bold uppercase tracking-widest">Portafolio</Link>
        <Link to="/solicitud" onClick={() => setIsOpen(false)} className="text-2xl font-bold uppercase tracking-widest">Solicitud</Link>
        <div className="mt-auto flex flex-col gap-4">
          {isAuthenticated ? (
            <>
              <Link to="/dashboard" onClick={() => setIsOpen(false)} className="text-center py-4 border border-primary/20 rounded-xl text-primary bg-primary/10">Dashboard</Link>
              <button onClick={logout} className="btn-primary py-4">Salir</button>
            </>
          ) : (
            <>
              <Link to="/login" onClick={() => setIsOpen(false)} className="text-center py-4 border border-white/10 rounded-xl">Ingresar</Link>
              <Link to="/registro" onClick={() => setIsOpen(false)} className="btn-primary py-4">Registrarse</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/40 to-background z-10" />
      <div className="max-w-7xl mx-auto px-6 relative z-20 text-center">
        <div className="animate-fade-in-scale">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-bold uppercase tracking-[0.4em] text-primary mb-12">
            Professional Pyrotechnics
          </span>
          <h1 className="text-7xl md:text-9xl font-display font-black tracking-tighter mb-12 leading-[0.85] uppercase">
            Ignite <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-600">
              Your Vision
            </span>
          </h1>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mt-12">
            <Link to="/solicitud" className="btn-primary flex items-center gap-3 px-10 py-5 text-sm uppercase tracking-widest">
              Solicitar <ChevronRight className="w-5 h-5" />
            </Link>
            <Link to="/servicios" className="group flex items-center gap-3 text-sm font-bold uppercase tracking-widest text-white/60 hover:text-white transition-colors">
              Explorar Catálogo <div className="w-10 h-[1px] bg-white/20 group-hover:w-16 group-hover:bg-primary transition-all" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

// --- MAIN APP ---

const App = () => {
  const location = useLocation();
  const isDashboard = location.pathname.startsWith('/dashboard');
  const isStaffPanel = location.pathname.startsWith('/panel-staff');
  const isMisReservas = location.pathname.startsWith('/mis-reservas');
  
  const hideLayout = isDashboard || isStaffPanel || isMisReservas;

  return (
    <div className="min-h-screen bg-background text-white flex flex-col">
      {!hideLayout && <Navbar />}
      <main className={`flex-grow ${hideLayout ? '' : 'pt-24'}`}>
        <Routes>
          <Route path="/" element={<Hero />} />
          <Route path="/servicios" element={<div className="py-12"><Services /></div>} />
          <Route path="/portafolio" element={<div className="py-12"><Portfolio /></div>} />
          <Route path="/solicitud" element={<div className="py-12"><BookingForm /></div>} />
          <Route path="/contacto" element={<Contacto />} />
          
          <Route path="/login" element={<Login />} />
          <Route path="/registro" element={<Register />} />
          <Route path="/recuperar-password" element={<RecuperarPassword />} />
            <Route path="/perfil" element={<PrivateRoute><Perfil /></PrivateRoute>} />
          
          {/* Rutas protegidas por Rol */}
          <Route path="/mis-reservas/*" element={
            <PrivateRoute allowedRoles={[2]}>
              <MisReservas />
            </PrivateRoute>
          } />
          
          <Route path="/panel-staff/*" element={
            <PrivateRoute allowedRoles={[3]}>
              <PanelStaff />
            </PrivateRoute>
          } />

          <Route path="/dashboard/*" element={
            <PrivateRoute allowedRoles={[1]}>
              <Dashboard />
            </PrivateRoute>
          } />

          <Route path="*" element={<div className="pt-40 text-center min-h-screen">Página no encontrada</div>} />
        </Routes>
      </main>
      {!hideLayout && <Footer />}
    </div>
  );
};

export default App;
