import { useState, useEffect, useRef } from 'react';

export function useLazyPanel() {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.01 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, []);

  return { isVisible, ref };
}

export function LazyBoundary({ children, fallback = null, panelName }) {
  const { isVisible, ref } = useLazyPanel();

  // Once visible, render children directly — a wrapper div here would sit
  // between flex containers and their panels, breaking height propagation.
  if (isVisible) return children;

  return (
    <div ref={ref} style={{ minHeight: '120px', opacity: 0.3 }}>
      {fallback || `Loading ${panelName}...`}
    </div>
  );
}
