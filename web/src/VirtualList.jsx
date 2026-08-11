import { useState, useEffect, useRef, useMemo } from 'react';

export function VirtualList({
  items,
  itemHeight,
  renderItem,
  containerHeight,
  overscan = 3
}) {
  const [scrollTop, setScrollTop] = useState(0);
  const [actualHeight, setActualHeight] = useState(containerHeight || 300);
  const containerRef = useRef(null);

  const visibleRange = useMemo(() => {
    const startIdx = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIdx = Math.min(
      items.length,
      Math.ceil((scrollTop + actualHeight) / itemHeight) + overscan
    );
    return { startIdx, endIdx, offsetY: startIdx * itemHeight };
  }, [scrollTop, itemHeight, actualHeight, items.length, overscan]);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(() => {
      const height = containerRef.current?.clientHeight;
      if (height) setActualHeight(height);
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const handleScroll = (e) => {
    setScrollTop(e.target.scrollTop);
  };

  const visibleItems = items.slice(visibleRange.startIdx, visibleRange.endIdx);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      style={{
        height: '100%',
        overflow: 'auto',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <div style={{ height: items.length * itemHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${visibleRange.offsetY}px)` }}>
          {visibleItems.map((item, idx) => {
            const actualIdx = visibleRange.startIdx + idx;
            return (
              <div key={actualIdx} style={{ height: itemHeight }}>
                {renderItem(item, actualIdx)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
