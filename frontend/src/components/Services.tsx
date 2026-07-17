import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Flame, ShoppingCart, Loader2, X, Clock, Package, ChevronRight } from 'lucide-react';
import api, { BACKEND_HOST } from '../api/client';

export interface Servicio {
  id: number;
  nombre: string;
  descripcion: string;
  categoria_nombre: string;
  imagenes: { url_imagen: string; es_principal: boolean }[];
  tarifas: { id: number; unidad: string; precio_unitario: string }[];
}

const localServicios: Servicio[] = [
  {
    id: 1001,
    nombre: 'Máquina de Humo Profesional',
    descripcion: 'Genera atmósferas densas y controladas para shows, sesiones fotográficas y lanzamientos de productos.',
    categoria_nombre: 'Maquinaria',
    imagenes: [{ url_imagen: '/img/gemini-1.png', es_principal: true }],
    tarifas: [
      { id: 1, unidad: 'Por evento', precio_unitario: '1200' },
      { id: 2, unidad: 'Por hora', precio_unitario: '350' },
    ],
  },
  {
    id: 1002,
    nombre: 'Máquina de Chispas Frías',
    descripcion: 'Efecto seguro y espectacular para tarimas, conciertos y presentaciones en interiores.',
    categoria_nombre: 'Efectos',
    imagenes: [{ url_imagen: '/img/gemini-2.png', es_principal: true }],
    tarifas: [
      { id: 3, unidad: 'Por evento', precio_unitario: '980' },
      { id: 4, unidad: 'Por 30 min', precio_unitario: '520' },
    ],
  },
  {
    id: 1003,
    nombre: 'Máquina de Burbuja & CO2',
    descripcion: 'Ambientación visual única con burbujas y columnas de CO2 para grandes celebraciones.',
    categoria_nombre: 'Maquinaria',
    imagenes: [{ url_imagen: '/img/gemini-3.png', es_principal: true }],
    tarifas: [
      { id: 5, unidad: 'Por evento', precio_unitario: '1100' },
      { id: 6, unidad: 'Por hora', precio_unitario: '380' },
    ],
  },
  {
    id: 1004,
    nombre: 'Control de Iluminación Inteligente',
    descripcion: 'Sistemas de luces dinámicas para crear ambientes impactantes y sincronizados con tu música.',
    categoria_nombre: 'Producción',
    imagenes: [{ url_imagen: '/img/gemini-4.png', es_principal: true }],
    tarifas: [
      { id: 7, unidad: 'Por evento', precio_unitario: '1400' },
      { id: 8, unidad: 'Por hora', precio_unitario: '420' },
    ],
  },
  {
    id: 1005,
    nombre: 'Generador de Vapor Frío',
    descripcion: 'Efecto de niebla suave que intensifica cualquier escenario sin comprometer la seguridad.',
    categoria_nombre: 'Maquinaria',
    imagenes: [{ url_imagen: '/img/gemini-5.png', es_principal: true }],
    tarifas: [
      { id: 9, unidad: 'Por evento', precio_unitario: '900' },
      { id: 10, unidad: 'Por hora', precio_unitario: '320' },
    ],
  },
  {
    id: 1006,
    nombre: 'Equipo de Proyección LED',
    descripcion: 'Pantallas y consolas para mostrar contenido en vivo con control total de colores y movimientos.',
    categoria_nombre: 'Producción',
    imagenes: [{ url_imagen: '/img/gemini-6.png', es_principal: true }],
    tarifas: [
      { id: 11, unidad: 'Por evento', precio_unitario: '1300' },
      { id: 12, unidad: 'Por hora', precio_unitario: '410' },
    ],
  },
];

const Services = () => {
  const [servicios, setServicios] = useState<Servicio[]>(localServicios);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState<Servicio | null>(null);

  const resolveImageUrl = (url: string) => {
    if (url.startsWith('http')) return url;
    if (url.startsWith('/img/') || url.startsWith('img/')) return url;
    return `${BACKEND_HOST}${url}`;
  };

  useEffect(() => {
    api.get('/servicios/')
      .then(res => {
        const data = Array.isArray(res.data) ? res.data : res.data.results || [];
        if (data.length > 0) {
          setServicios(data);
        }
      })
      .catch(err => {
        console.error(err);
        setServicios(localServicios);
      })
      .finally(() => setLoading(false));
  }, []);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-10 h-10 animate-spin text-primary" />
    </div>
  );

  return (
    <section className="min-h-screen py-24 px-6 max-w-7xl mx-auto overflow-hidden">
      <div className="mb-16">
        <span className="text-primary font-bold text-xs uppercase tracking-[0.4em] mb-4 block animate-slide-up">
          Experiencias Únicas
        </span>
        <h2 className="text-5xl font-display font-black tracking-tight mb-4 uppercase">
          Nuestros <span className="text-gradient">Servicios</span>
        </h2>
        <p className="max-w-2xl text-white/60 leading-relaxed">
          Desde grandes shows hasta experiencias íntimas, cada servicio se diseña con seguridad, ritmo y estética premium.
        </p>
        <div className="flex flex-wrap items-center gap-3 mt-6">
          <div className="h-1.5 w-24 bg-primary rounded-full" />
          <span className="text-[10px] uppercase tracking-[0.35em] text-white/30">ejecución impecable • montaje profesional • impacto visual</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-slide-up">
        {servicios.map((servicio) => (
          <div
            key={servicio.id}
            className="glass-card group hover:bg-surface/60 transition-all duration-300 hover:-translate-y-2 cursor-pointer"
            onClick={() => setSelectedService(servicio)}
          >
            <div className="relative aspect-[16/10] rounded-[1.25rem] overflow-hidden mb-6 bg-surface/50 border border-white/5">
              {servicio.imagenes?.[0] ? (
                <img 
                  src={resolveImageUrl(servicio.imagenes[0].url_imagen)} 
                  alt={servicio.nombre}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
                />              ) : (
                <div className="flex flex-col items-center justify-center h-full opacity-20">
                  <Flame className="w-16 h-16 mb-2" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Topher Spec</span>
                </div>
              )}
              <div className="absolute top-4 left-4">
                <span className="px-3 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-bold uppercase tracking-widest text-primary">
                  {servicio.categoria_nombre}
                </span>
              </div>
            </div>

            <h3 className="text-2xl font-bold mb-3 group-hover:text-primary transition-colors">{servicio.nombre}</h3>
            <p className="text-white/50 text-sm mb-8 line-clamp-3 leading-relaxed">
              {servicio.descripcion}
            </p>

            <div className="flex items-center justify-between mt-auto pt-6 border-t border-white/5">
              <div>
                <span className="text-[10px] text-white/30 block uppercase tracking-widest mb-1">Inversión desde</span>
                <span className="text-xl font-display font-black text-white">
                  ${parseFloat(servicio.tarifas[0]?.precio_unitario || '0').toLocaleString()}
                </span>
              </div>
              <div className="bg-primary/10 group-hover:bg-primary text-primary group-hover:text-white p-3 rounded-2xl transition-all duration-300">
                <ChevronRight className="w-6 h-6" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Service Detail Modal */}
      {selectedService && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedService(null);
          }}
        >
          <div 
            className="glass-card max-w-4xl w-full bg-surface/80 p-0 overflow-hidden grid grid-cols-1 md:grid-cols-2 h-full md:h-auto md:max-h-[85vh] animate-slide-up"
          >
              <div className="relative h-64 md:h-full bg-background">
                {selectedService.imagenes?.[0] ? (
                 <img src={resolveImageUrl(selectedService.imagenes[0].url_imagen)} className="w-full h-full object-cover" />
                ) : (
                   <div className="w-full h-full flex items-center justify-center bg-surface"><Flame className="w-20 h-20 text-white/10" /></div>
                )}
                <button onClick={() => setSelectedService(null)} className="md:hidden absolute top-4 right-4 bg-black/50 p-2 rounded-full"><X /></button>
              </div>
              
              <div className="p-8 md:p-12 overflow-y-auto">
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <span className="text-primary font-bold text-xs uppercase tracking-widest mb-2 block">{selectedService.categoria_nombre}</span>
                    <h2 className="text-4xl font-display font-black uppercase leading-none">{selectedService.nombre}</h2>
                  </div>
                  <button onClick={() => setSelectedService(null)} className="hidden md:block text-white/20 hover:text-white transition-colors"><X className="w-8 h-8" /></button>
                </div>

                <p className="text-white/60 mb-10 text-lg leading-relaxed">{selectedService.descripcion}</p>

                <div className="space-y-6 mb-10">
                  <div className="flex items-center gap-4 text-sm">
                    <div className="bg-primary/20 p-2 rounded-lg"><Clock className="w-5 h-5 text-primary" /></div>
                    <span>Tiempo estimado de ejecución: <b>Depende del montaje</b></span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="bg-primary/20 p-2 rounded-lg"><Package className="w-5 h-5 text-primary" /></div>
                    <span>Incluye: <b>Personal técnico y equipos profesionales</b></span>
                  </div>
                </div>

                <div className="bg-white/5 p-6 rounded-2xl mb-10 border border-white/5">
                  <h4 className="font-bold mb-4 uppercase tracking-widest text-xs text-white/40">Tarifas Disponibles</h4>
                  {selectedService.tarifas.map(t => (
                    <div key={t.id} className="flex justify-between items-center py-3 border-b border-white/5 last:border-0">
                      <span className="font-medium">{t.unidad}</span>
                      <span className="text-primary font-bold">${parseFloat(t.precio_unitario).toLocaleString()}</span>
                    </div>
                  ))}
                </div>

                <Link to="/solicitud" onClick={() => setSelectedService(null)} className="btn-primary w-full py-5 text-center flex items-center justify-center gap-3 text-lg">
                  Cotizar este servicio <ShoppingCart className="w-6 h-6" />
                </Link>
              </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default Services;
