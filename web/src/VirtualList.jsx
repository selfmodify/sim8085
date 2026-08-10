import { useState, useEffect, useRef, useMemo } from 'react';

export function VirtualList({
  items,
  itemHeight,
  renderItem,
  containerHeight,
  overscan = 3
}) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef(null);

  const visibleRange = useMemo(() => {
    const startIdx = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIdx = Math.min(
      items.length,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );
    return { startIdx, endIdx, offsetY: startIdx * itemHeight };
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan]);

  const handleScroll = (e) => {
    setScrollTop(e.target.scrollTop);
  };

  const visibleItems = items.slice(visibleRange.startIdx, visibleRange.endIdx);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      style={{
        height: containerHeight,
        overflow: 'auto',
        position: 'relative'
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
