import { useEffect, useRef } from 'react';

export function useDeferredUpdate(callback, deps, priority = 'normal') {
  const idleCallbackRef = useRef(null);

  useEffect(() => {
    if (!callback) return;

    const scheduleCallback = () => {
      if ('requestIdleCallback' in window) {
        idleCallbackRef.current = requestIdleCallback(() => {
          callback();
        }, { timeout: priority === 'high' ? 100 : priority === 'low' ? 2000 : 500 });
      } else {
        idleCallbackRef.current = setTimeout(callback, priority === 'high' ? 0 : 100);
      }
    };

    scheduleCallback();

    return () => {
      if (idleCallbackRef.current) {
        if ('cancelIdleCallback' in window) {
          cancelIdleCallback(idleCallbackRef.current);
        } else {
          clearTimeout(idleCallbackRef.current);
        }
      }
    };
  }, deps);
}
