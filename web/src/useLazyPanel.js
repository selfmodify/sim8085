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

  return (
    <div ref={ref}>
      {isVisible ? children : fallback || <div style={{ minHeight: '200px', opacity: 0.3 }}>Loading {panelName}...</div>}
    </div>
  );
}
