import { useEffect, useRef } from 'react';

const REST_X = 32;
const REST_Y = 28;
const clamp = (value: number) => Math.max(0, Math.min(100, value));

/**
 * Decoración pura: el punto de luz del degradado sigue al cursor dentro de la
 * esfera, que permanece quieta. No recibe eventos, no es focusable y se
 * desactiva en pantallas táctiles o con movimiento reducido.
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

    let rect = sphere.getBoundingClientRect();
    let frame = 0;
    const resizeObserver = new ResizeObserver(() => {
      rect = sphere.getBoundingClientRect();
    });
    resizeObserver.observe(area);

    const onMove = (event: PointerEvent) => {
      const { clientX, clientY } = event;
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (!rect.width || !rect.height) return;
        const x = ((clientX - rect.left) / rect.width) * 100;
        const y = ((clientY - rect.top) / rect.height) * 100;
        sphere.style.setProperty('--sphere-light-x', `${clamp(x).toFixed(1)}%`);
        sphere.style.setProperty('--sphere-light-y', `${clamp(y).toFixed(1)}%`);
      });
    };

    const onLeave = () => {
      sphere.style.setProperty('--sphere-light-x', `${REST_X}%`);
      sphere.style.setProperty('--sphere-light-y', `${REST_Y}%`);
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
