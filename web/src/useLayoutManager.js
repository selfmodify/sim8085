import { useState, useCallback } from 'react';

const DEFAULT_PANELS = { regs:true, pairs:true, flags:false, ints:true, io:true, memmap:false, ppi:true, pit:false, audio:false, stack:true, callstack:true, trace:true };

export function useLayoutManager() {
  const [panels, setPanels] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('sim8085_panels'));
      return { ...DEFAULT_PANELS, ...saved };
    } catch {
      return DEFAULT_PANELS;
    }
  });

  const togglePanel = useCallback((key) => {
    setPanels(p => {
      const next = { ...p, [key]: !p[key] };
      try {
        localStorage.setItem('sim8085_panels', JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const [ppiPos, setPpiPos] = useState(() => {
    try { const p = JSON.parse(localStorage.getItem('sim8085_ppi_pos')); if (p && typeof p.x === 'number') return p; } catch {}
    return { x: Math.max(0, Math.round((window.innerWidth / 2 + 50) / 20) * 20), y: 100 }
  });
  const [pitPos, setPitPos] = useState(() => {
    try { const p = JSON.parse(localStorage.getItem('sim8085_pit_pos')); if (p && typeof p.x === 'number') return p; } catch {}
    return { x: Math.max(0, Math.round((window.innerWidth / 2 - 350) / 20) * 20), y: 100 }
  });
  const [ledPos, setLedPos] = useState(() => {
    try { const p = JSON.parse(localStorage.getItem('sim8085_led_pos')); if (p && typeof p.x === 'number') return p; } catch {}
    return { x: Math.max(0, Math.round((window.innerWidth / 2 - 150) / 20) * 20), y: 360 }
  });

  return {
    panels, setPanels, togglePanel,
    ppiPos, setPpiPos, pitPos, setPitPos, ledPos, setLedPos,
  };
}