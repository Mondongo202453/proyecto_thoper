import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Camera, X, ChevronLeft, ChevronRight, Play } from 'lucide-react';
import api, { BACKEND_HOST } from '../api/client';

interface Media {
  id: number;
  tipo: 'foto' | 'video';
  url_media: string;
  thumbnail_url?: string | null;
  es_principal: boolean;
  orden?: number;
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
  const [selectedMedia, setSelectedMedia] = useState<Media | null>(null);
  const [filter, setFilter] = useState('Todos');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    if (!selectedMedia) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [selectedMedia]);

  useEffect(() => {
    api.get('/portafolio/')
      .then(res => {
        const data: Evento[] = (Array.isArray(res.data) ? res.data : res.data.results || []).map((evento: any) => ({
          ...evento,
          categoria: evento.categoria || evento.tipo_evento || 'Eventos',
          multimedia: (evento.multimedia || [])
            .map((media: any): Media => {
              const url = media.url_media || media.url_archivo || media.url || '';
              const tipo = String(media.tipo || '').toLowerCase();
              const extension = url.split(/[?#]/, 1)[0].split('.').pop()?.toLowerCase();
              return {
                ...media,
                tipo: tipo === 'video' || ['mp4', 'webm', 'mov', 'm4v', 'ogv'].includes(extension || '')
                  ? 'video'
                  : 'foto',
                url_media: url,
              };
            })
            .filter((media: Media) => media.url_media)
            .sort((a: Media, b: Media) =>
              Number(b.es_principal) - Number(a.es_principal)
              || (a.orden ?? 0) - (b.orden ?? 0)
              || a.id - b.id
            ),
        }));
        setEventos(data);
        setLoadError('');
      })
      .catch((error: unknown) => {
        console.error('No se pudo cargar el portafolio:', error);
        setLoadError('No pudimos cargar el portafolio. Intenta actualizar la página.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const resolveMediaUrl = (mediaUrl?: string | null) => {
    if (!mediaUrl || typeof mediaUrl !== 'string') return '/img/imagen1.jpg';
    if (/^(https?:|data:|blob:)/i.test(mediaUrl)) return mediaUrl;
    if (mediaUrl.startsWith('/img/') || mediaUrl.startsWith('img/')) return mediaUrl;
    return `${BACKEND_HOST}${mediaUrl.startsWith('/') ? mediaUrl : `/${mediaUrl}`}`;
  };

  const categories = ['Todos', ...new Set(eventos.map(e => e.categoria))];
  const filteredEventos = filter === 'Todos' ? eventos : eventos.filter(e => e.categoria === filter);
  const abrirEvento = (evento: Evento) => {
    if (evento.multimedia[0]) setSelectedMedia(evento.multimedia[0]);
  };
  const navegarGaleria = (direction: -1 | 1) => {
    if (!selectedMedia) return;
    const evento = eventos.find((item) => item.multimedia.some((media) => media.id === selectedMedia.id));
    if (!evento || evento.multimedia.length < 2) return;
    const currentIndex = evento.multimedia.findIndex((media) => media.id === selectedMedia.id);
    const nextIndex = (currentIndex + direction + evento.multimedia.length) % evento.multimedia.length;
    setSelectedMedia(evento.multimedia[nextIndex]);
  };

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

      {loading ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3" aria-label="Cargando portafolio">
          {[1, 2, 3].map((item) => (
            <div key={item} className="aspect-[4/5] animate-pulse rounded-2xl border border-white/5 bg-white/[0.03]" />
          ))}
        </div>
      ) : loadError ? (
        <div role="alert" className="rounded-2xl border border-red-400/20 bg-red-400/5 px-6 py-12 text-center text-sm text-red-200">
          {loadError}
        </div>
      ) : filteredEventos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 px-6 py-16 text-center">
          <Camera className="mx-auto mb-4 h-10 w-10 text-white/25" />
          <h3 className="text-lg font-semibold text-white/75">Aún no hay eventos en esta categoría</h3>
          <p className="mt-2 text-sm text-white/40">Cuando publiquemos nuevos eventos, aparecerán aquí.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 items-stretch gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredEventos.map((evento) => {
            const portada = evento.multimedia[0];
            const tieneVideo = portada?.tipo === 'video';
            return (
              <article
                key={evento.id}
                className="glass-card group relative flex h-full cursor-pointer flex-col overflow-hidden transition-all duration-300 hover:-translate-y-2 animate-fade-in-scale"
                role={evento.multimedia.length > 0 ? 'button' : undefined}
                tabIndex={evento.multimedia.length > 0 ? 0 : undefined}
                aria-label={evento.multimedia.length > 0 ? `Abrir portafolio: ${evento.nombre}` : undefined}
                onClick={() => abrirEvento(evento)}
                onKeyDown={(event) => {
                  if (evento.multimedia.length > 0 && (event.key === 'Enter' || event.key === ' ')) {
                    event.preventDefault();
                    abrirEvento(evento);
                  }
                }}
              >
                <div className="relative aspect-[4/5] flex-shrink-0 overflow-hidden bg-black/30">
                  {portada ? (
                    tieneVideo ? (
                      <video
                        src={resolveMediaUrl(portada.url_media)}
                        poster={portada.thumbnail_url ? resolveMediaUrl(portada.thumbnail_url) : undefined}
                        muted
                        autoPlay
                        loop
                        playsInline
                        preload="metadata"
                        aria-label={`Vista previa de video: ${evento.nombre}`}
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <img
                        src={resolveMediaUrl(portada.url_media)}
                        alt={evento.nombre}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover grayscale transition-transform duration-700 group-hover:scale-105 group-hover:grayscale-0"
                      />
                    )
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Camera className="h-12 w-12 text-white/20" />
                    </div>
                  )}
                  {tieneVideo && (
                    <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/65 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-white">
                      <Play className="h-3 w-3 fill-current" /> Video
                    </span>
                  )}
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/95 via-black/10 to-transparent opacity-80 transition-opacity duration-300 group-hover:opacity-100" />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 p-6 sm:p-8">
                    <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.3em] text-primary">{evento.categoria}</span>
                    <h3 className="mb-2 text-xl font-bold text-white sm:text-2xl">{evento.nombre}</h3>
                    {evento.descripcion && <p className="mb-4 line-clamp-2 text-sm text-white/65">{evento.descripcion}</p>}
                    <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/85">
                      {evento.multimedia.length > 1 ? 'Ver galería' : tieneVideo ? 'Ver video' : 'Ver imagen'}
                      <ChevronRight className="h-4 w-4 text-primary" />
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Lightbox */}
      {selectedMedia && createPortal(
        <div
          className="fixed inset-0 z-[100] h-[100dvh] w-full overflow-y-auto overscroll-contain bg-black/95 backdrop-blur-xl flex items-center justify-center p-3 sm:p-6 animate-fade-in cursor-zoom-out"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedMedia(null);
          }}
        >
          <div role="dialog" aria-modal="true" aria-label="Vista ampliada del portafolio" className="relative flex min-h-0 max-w-full items-center justify-center">
          <button
            type="button"
            aria-label="Cerrar imagen ampliada"
            onClick={() => setSelectedMedia(null)}
            className="absolute right-2 top-2 z-10 rounded-full bg-black/60 p-3 text-white transition-colors hover:bg-white/10 sm:-right-4 sm:-top-4"
          >
            <X className="w-8 h-8" />
          </button>
          {selectedMedia.tipo === 'video' ? (
            <video
              src={resolveMediaUrl(selectedMedia.url_media)}
              controls
              autoPlay
              poster={selectedMedia.thumbnail_url ? resolveMediaUrl(selectedMedia.thumbnail_url) : undefined}
              playsInline
              preload="auto"
              className="max-h-[calc(100dvh-2rem)] max-w-full rounded-2xl shadow-2xl shadow-primary/20 animate-fade-in-scale sm:max-h-[90vh]"
            />
          ) : (
            <img 
              src={resolveMediaUrl(selectedMedia.url_media)}
              alt="Imagen ampliada del portafolio"
              decoding="async"
              className="max-h-[calc(100dvh-2rem)] max-w-full object-contain rounded-2xl shadow-2xl shadow-primary/20 animate-fade-in-scale sm:max-h-[90vh]"
            />
          )}
          {(() => {
            const selectedEvent = eventos.find((evento) =>
              evento.multimedia.some((media) => media.id === selectedMedia.id)
            );
            if (!selectedEvent || selectedEvent.multimedia.length < 2) return null;
            return (
              <>
                <button
                  type="button"
                  aria-label="Medio anterior"
                  onClick={() => navegarGaleria(-1)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/70 p-3 text-white transition-colors hover:bg-white/15 sm:-left-16"
                >
                  <ChevronLeft className="h-7 w-7" />
                </button>
                <button
                  type="button"
                  aria-label="Medio siguiente"
                  onClick={() => navegarGaleria(1)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/70 p-3 text-white transition-colors hover:bg-white/15 sm:-right-16"
                >
                  <ChevronRight className="h-7 w-7" />
                </button>
                <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/70 px-3 py-1 text-xs text-white/80">
                  {selectedEvent.multimedia.findIndex((media) => media.id === selectedMedia.id) + 1} / {selectedEvent.multimedia.length}
                </span>
              </>
            );
          })()}
          </div>
        </div>,
        document.body
      )}
    </section>
  );
};

export default Portfolio;
