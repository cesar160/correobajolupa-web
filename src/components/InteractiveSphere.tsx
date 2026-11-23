import { useEffect, useRef } from 'react';

const REST_X = 32;
const REST_Y = 28;
// Máximo desplazamiento de la esfera para que no invada el texto del panel ni
// se salga de su contenedor, aunque el cursor esté al otro lado de la ventana.
const MAX_SHIFT = 28;
const clamp = (value: number) => Math.max(0, Math.min(100, value));
const clampUnit = (value: number) => Math.max(-1, Math.min(1, value));

/**
 * Decoración pura: la esfera se desplaza suavemente hacia el cursor, esté donde
 * esté en la ventana, y su punto de luz lo sigue con más precisión. No recibe
 * eventos, no es focusable y se desactiva en táctil o con movimiento reducido.
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

    let areaRect = area.getBoundingClientRect();
    let sphereRect = sphere.getBoundingClientRect();
    let frame = 0;

    const measure = () => {
      areaRect = area.getBoundingClientRect();
      sphereRect = sphere.getBoundingClientRect();
    };
    measure();
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(area);
    window.addEventListener('resize', measure);

    const onMove = (event: PointerEvent) => {
      const { clientX, clientY } = event;
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (!areaRect.width || !sphereRect.width) return;

        // Posición del cursor en toda la ventana, de -1 a 1 desde el centro.
        const vx = clampUnit((clientX / window.innerWidth - 0.5) * 2);
        const vy = clampUnit((clientY / window.innerHeight - 0.5) * 2);
        sphere.style.setProperty('--sphere-x', `${(vx * MAX_SHIFT).toFixed(1)}px`);
        sphere.style.setProperty('--sphere-y', `${(vy * MAX_SHIFT).toFixed(1)}px`);

        // El reflejo sigue al cursor respecto al centro de la esfera.
        const x = ((clientX - sphereRect.left) / sphereRect.width) * 100;
        const y = ((clientY - sphereRect.top) / sphereRect.height) * 100;
        sphere.style.setProperty('--sphere-light-x', `${clamp(x).toFixed(1)}%`);
        sphere.style.setProperty('--sphere-light-y', `${clamp(y).toFixed(1)}%`);
      });
    };

    const onLeave = () => {
      sphere.style.setProperty('--sphere-x', '0px');
      sphere.style.setProperty('--sphere-y', '0px');
      sphere.style.setProperty('--sphere-light-x', `${REST_X}%`);
      sphere.style.setProperty('--sphere-light-y', `${REST_Y}%`);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    window.addEventListener('blur', onLeave);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', measure);
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('blur', onLeave);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className="sphere-area" ref={areaRef}>
      <div className="sphere" ref={sphereRef} />
    </div>
  );
}
