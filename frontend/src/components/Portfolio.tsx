import React, { useEffect, useState } from 'react';
import { Camera, X, ChevronRight, Loader2 } from 'lucide-react';
import api, { BACKEND_HOST } from '../api/client';

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

const localEventos: Evento[] = [
  {
    id: 1001,
    nombre: 'Revelación de género con confeti rosa',
    descripcion: 'Celebración privada con un montaje premium de globos y humo.',
    categoria: 'Revelaciones',
    multimedia: [{ id: 1, tipo: 'foto', url_media: '/img/imagen1.jpg', es_principal: true }],
  },
  {
    id: 1002,
    nombre: 'Celebración con humo y luces',
    descripcion: 'Atmósfera festiva y profesional con efectos especiales en vivo.',
    categoria: 'Revelaciones',
    multimedia: [{ id: 2, tipo: 'foto', url_media: '/img/img1.jpg', es_principal: true }],
  },
  {
    id: 1003,
    nombre: 'Montaje sobre camión con decoración',
    descripcion: 'Evento móvil con detalles de producción y efectos visuales.',
    categoria: 'Revelaciones',
    multimedia: [{ id: 3, tipo: 'foto', url_media: '/img/img2.jpg', es_principal: true }],
  },
  {
    id: 1004,
    nombre: 'Artista en escenario con fuego',
    descripcion: 'Performance en vivo con pirotecnia y público entusiasta.',
    categoria: 'Shows',
    multimedia: [{ id: 4, tipo: 'foto', url_media: '/img/img3.jpg', es_principal: true }],
  },
  {
    id: 1005,
    nombre: 'Noche de concierto con flamas',
    descripcion: 'Producción nocturna con efectos de fuego y sonido profesional.',
    categoria: 'Shows',
    multimedia: [{ id: 5, tipo: 'foto', url_media: '/img/whatsapp-1.jpeg', es_principal: true }],
  },
  {
    id: 1006,
    nombre: 'Eventos íntimos con efecto de chispa',
    descripcion: 'Momentos especiales con pirotecnia de control para artistas y parejas.',
    categoria: 'Shows',
    multimedia: [{ id: 6, tipo: 'foto', url_media: '/img/whatsapp-2.jpeg', es_principal: true }],
  },
  {
    id: 1007,
    nombre: 'Presentación con humo y público',
    descripcion: 'Escenario donde cada detalle crea un ambiente memorable.',
    categoria: 'Shows',
    multimedia: [{ id: 7, tipo: 'foto', url_media: '/img/imagen2.jpg', es_principal: true }],
  },
  {
    id: 1008,
    nombre: 'Fiesta en vivo con atmósfera intensa',
    descripcion: 'Experiencias de alto impacto con efectos visuales y sonoros.',
    categoria: 'Shows',
    multimedia: [{ id: 8, tipo: 'foto', url_media: '/img/imagen3.jpg', es_principal: true }],
  },
];

const Portfolio = () => {
  const [eventos, setEventos] = useState<Evento[]>(localEventos);
  const [loading, setLoading] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<string | null>(null);
  const [filter, setFilter] = useState('Todos');

  useEffect(() => {
    setLoading(true);
    api.get('/portafolio/')
      .then(res => {
        const data = Array.isArray(res.data) ? res.data : res.data.results || [];
        if (data.length > 0) {
          const existingIds = new Set(localEventos.map(evento => evento.id));
          const merged = [
            ...localEventos,
            ...data.filter((evento: Evento) => !existingIds.has(evento.id)),
          ];
          setEventos(merged);
        }
      })
      .catch(() => {
        // Usar imágenes locales si el backend no responde o no hay datos
      })
      .finally(() => setLoading(false));
  }, []);

  const resolveMediaUrl = (mediaUrl: string) => {
    if (mediaUrl.startsWith('http')) return mediaUrl;
    if (mediaUrl.startsWith('/img/') || mediaUrl.startsWith('img/')) return mediaUrl;
    return `${BACKEND_HOST}${mediaUrl}`;
  };

  const categories = ['Todos', ...new Set(eventos.map(e => e.categoria))];
  const filteredEventos = filter === 'Todos' ? eventos : eventos.filter(e => e.categoria === filter);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-10 h-10 animate-spin text-primary" />
    </div>
  );

  return (
    <section className="min-h-screen py-24 px-6 max-w-7xl mx-auto overflow-hidden">
      <div 
        className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-8 animate-slide-up"
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
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEventos.map((evento) => (
          <div
            key={evento.id}
            className="glass-card group relative cursor-pointer overflow-hidden p-0 transition-all duration-300 hover:-translate-y-2 animate-fade-in-scale"
            onClick={() => setSelectedMedia(evento.multimedia[0]?.url_media)}
          >
              <div className="aspect-[4/5] overflow-hidden">
                {evento.multimedia?.[0] ? (
                  <img 
                    src={resolveMediaUrl(evento.multimedia[0].url_media)} 
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
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {selectedMedia && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-6 animate-fade-in cursor-zoom-out"
          onClick={() => setSelectedMedia(null)}
        >
          <button className="absolute top-10 right-10 p-4 bg-white/5 hover:bg-white/10 rounded-full text-white transition-colors">
            <X className="w-8 h-8" />
          </button>
          <img 
            src={selectedMedia ? resolveMediaUrl(selectedMedia) : ''} 
            className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl shadow-primary/20 animate-fade-in-scale"
          />
        </div>
      )}
    </section>
  );
};

export default Portfolio;
