import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Video, Maximize2, X, ChevronRight, Loader2 } from 'lucide-react';
import api from '../api/client';

interface Media {
  id: number;
  tipo: 'foto' | 'video';
  url_media: string;
  es_principal: boolean;
}

interface Evento {
  id: number;
  nombre: string;
  descripcion: string;
  categoria: string;
  multimedia: Media[];
}

const Portfolio = () => {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMedia, setSelectedMedia] = useState<string | null>(null);
  const [filter, setFilter] = useState('Todos');

  useEffect(() => {
    api.get('/portafolio/')
      .then(res => setEventos(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const categories = ['Todos', ...new Set(eventos.map(e => e.categoria))];
  const filteredEventos = filter === 'Todos' ? eventos : eventos.filter(e => e.categoria === filter);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-10 h-10 animate-spin text-primary" />
    </div>
  );

  return (
    <section className="py-24 px-6 max-w-7xl mx-auto overflow-hidden">
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        whileInView={{ opacity: 1, x: 0 }}
        className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-8"
      >
        <div>
          <h2 className="text-5xl font-display font-black tracking-tight mb-4 uppercase">
            Nuestro <span className="text-primary">Portafolio</span>
          </h2>
          <div className="h-1.5 w-32 bg-primary rounded-full mb-6" />
          <p className="text-white/40 max-w-md">Explora los momentos más impactantes que hemos creado para nuestros clientes.</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-6 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${
                filter === cat ? 'bg-primary text-white' : 'bg-white/5 hover:bg-white/10 text-white/60'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Grid */}
      <motion.div 
        layout
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        <AnimatePresence>
          {filteredEventos.map((evento) => (
            <motion.div
              key={evento.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              whileHover={{ y: -10 }}
              className="glass-card group relative cursor-pointer overflow-hidden p-0"
              onClick={() => setSelectedMedia(evento.multimedia[0]?.url_media)}
            >
              <div className="aspect-[4/5] overflow-hidden">
                {evento.multimedia?.[0] ? (
                  <img 
                    src={`http://127.0.0.1:8000${evento.multimedia[0].url_media}`} 
                    alt={evento.nombre}
                    className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 scale-110 group-hover:scale-100"
                  />
                ) : (
                  <div className="w-full h-full bg-surface flex items-center justify-center">
                    <Camera className="w-12 h-12 text-white/5" />
                  </div>
                )}
              </div>

              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex flex-col justify-end p-8">
                <span className="text-[10px] font-bold text-primary uppercase tracking-[0.3em] mb-2">{evento.categoria}</span>
                <h3 className="text-2xl font-display font-bold text-white mb-2">{evento.nombre}</h3>
                <p className="text-white/60 text-sm line-clamp-2 mb-4">{evento.descripcion}</p>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/80">
                  Ver galería <ChevronRight className="w-4 h-4 text-primary" />
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {/* Lightbox */}
      <AnimatePresence>
        {selectedMedia && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-6"
            onClick={() => setSelectedMedia(null)}
          >
            <button className="absolute top-10 right-10 p-4 bg-white/5 hover:bg-white/10 rounded-full text-white transition-colors">
              <X className="w-8 h-8" />
            </button>
            <motion.img 
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              src={`http://127.0.0.1:8000${selectedMedia}`} 
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl shadow-primary/20"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};

export default Portfolio;
