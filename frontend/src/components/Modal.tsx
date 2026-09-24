import React from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="topher-modal-title"
            className="relative w-full max-w-2xl panel-surface p-0 overflow-hidden rounded-3xl border border-white/10 shadow-[0_24px_90px_rgba(0,0,0,0.65)] flex flex-col max-h-[min(90vh,760px)]"
          >
            <div className="relative p-5 sm:p-6 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-primary/10 via-surface/70 to-surface/40">
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-[0.28em] text-primary mb-1">Topher Producciones</span>
                <h2 id="topher-modal-title" className="text-xl sm:text-2xl font-display font-bold text-white">{title}</h2>
              </div>
              <button
                onClick={onClose}
                aria-label="Cerrar ventana"
                className="p-2.5 text-white/50 hover:text-white hover:bg-primary/15 hover:text-primary rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 sm:p-6 overflow-y-auto bg-gradient-to-b from-surface/80 to-background/80">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default Modal;
