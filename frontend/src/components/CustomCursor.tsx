import React, { useEffect, useRef } from 'react';

const CustomCursor: React.FC = () => {
  const cursorRef = useRef<HTMLDivElement | null>(null);
  const pos = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const cursor = cursorRef.current!;
    const onMove = (e: MouseEvent) => {
      pos.current.x = e.clientX;
      pos.current.y = e.clientY;
      cursor.style.opacity = '1';
    };

    const onLeave = () => {
      cursor.style.opacity = '0';
    };

    const hoverableSelector = 'a, button, .btn-primary, .btn-outline, .glass-card, .btn-3d';

    const onHover = () => {
      cursor.classList.add('cursor--hover');
    };
    const onUnhover = () => {
      cursor.classList.remove('cursor--hover');
    };

    const addHoverListeners = () => {
      document.querySelectorAll(hoverableSelector).forEach(el => {
        el.addEventListener('mouseenter', onHover);
        el.addEventListener('mouseleave', onUnhover);
      });
    };

    const removeHoverListeners = () => {
      document.querySelectorAll(hoverableSelector).forEach(el => {
        el.removeEventListener('mouseenter', onHover);
        el.removeEventListener('mouseleave', onUnhover);
      });
    };

    let raf = () => {
      pos.current.tx += (pos.current.x - pos.current.tx) * 0.15;
      pos.current.ty += (pos.current.y - pos.current.ty) * 0.15;
      cursor.style.transform = `translate3d(${pos.current.tx}px, ${pos.current.ty}px, 0) translate(-50%, -50%)`;
      rafRef.current = requestAnimationFrame(raf);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseleave', onLeave);
    addHoverListeners();
    rafRef.current = requestAnimationFrame(raf);

    // Rebind hover listeners when new elements load
    const observer = new MutationObserver(() => {
      removeHoverListeners();
      addHoverListeners();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseleave', onLeave);
      removeHoverListeners();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      observer.disconnect();
    };
  }, []);

  return <div ref={cursorRef} className="custom-cursor" aria-hidden />;
};

export default CustomCursor;
