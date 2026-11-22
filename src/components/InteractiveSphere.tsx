import { useEffect, useRef } from 'react';

/**
 * Decoración pura: sigue al puntero unos pocos píxels dentro de su área.
 * No recibe eventos, no es focusable y se desactiva en pantallas táctiles
 * o cuando la persona pide movimiento reducido.
 */
export function InteractiveSphere() {
  const areaRef = useRef<HTMLDivElement>(null);
  const sphereRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const area = areaRef.current;
    const sphere = sphereRef.current;
    if (!area || !sphere) return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let rect = area.getBoundingClientRect();
    let frame = 0;
    const resizeObserver = new ResizeObserver(() => {
      rect = area.getBoundingClientRect();
    });
    resizeObserver.observe(area);

    const onMove = (event: PointerEvent) => {
      const { clientX, clientY } = event;
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (!rect.width || !rect.height) return;
        const x = (clientX - rect.left) / rect.width - 0.5;
        const y = (clientY - rect.top) / rect.height - 0.5;
        // ±16 px: suficiente para notar el seguimiento sin mover el layout.
        sphere.style.setProperty('--sphere-x', `${(x * 32).toFixed(1)}px`);
        sphere.style.setProperty('--sphere-y', `${(y * 32).toFixed(1)}px`);
      });
    };

    const onLeave = () => {
      sphere.style.setProperty('--sphere-x', '0px');
      sphere.style.setProperty('--sphere-y', '0px');
    };

    area.addEventListener('pointermove', onMove);
    area.addEventListener('pointerleave', onLeave);

    return () => {
      resizeObserver.disconnect();
      area.removeEventListener('pointermove', onMove);
      area.removeEventListener('pointerleave', onLeave);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className="sphere-area" ref={areaRef}>
      <div className="sphere" ref={sphereRef} />
    </div>
  );
}
