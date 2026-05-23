import { useState, useEffect, useRef } from 'react';
import { EXAMPLES } from './examples.js';

export function ExampleMenu({ onLoad }) {
  const [open, setOpen]           = useState(false)
  const [activeCat, setActiveCat] = useState(null)
  const [pos, setPos]             = useState({ top: 0, left: 0 })
  const btnRef  = useRef(null)
  const dropRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const handler = e => {
      if (!btnRef.current?.contains(e.target) && !dropRef.current?.contains(e.target)) {
        setOpen(false); setActiveCat(null)
      }
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('touchstart', handler)
    return () => { document.removeEventListener('mousedown', handler); document.removeEventListener('touchstart', handler) }
  }, [open])

  const toggle = () => {
    if (!open) {
      const r = btnRef.current.getBoundingClientRect()
      setPos({ top: r.bottom + 4, left: Math.min(r.left, window.innerWidth - 230) })
    }
    setOpen(o => !o)
  }

  return (
    <>
      <style>{`
        .example-menu-dropdown .exmenu-cat:hover,
        .example-menu-dropdown .exmenu-cat.exmenu-cat-active,
        .example-menu-dropdown .exmenu-sub-item:hover {
          color: var(--accent);
        }
      `}</style>
      <button ref={btnRef} className="btn exmenu-trigger" onClick={toggle}>
        Examples <span className="exmenu-chevron">{open ? '▴' : '▾'}</span>
      </button>
      {open && (
        <>
          <div className="mobile-backdrop" onClick={(e) => { e.stopPropagation(); setOpen(false); setActiveCat(null); }} style={{ zIndex: 9998 }} />
          <div ref={dropRef} className="exmenu-dropdown example-menu-dropdown" style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999 }}>
          <div className="mobile-menu-hd" onClick={(e) => { e.stopPropagation(); setOpen(false); setActiveCat(null); }}>
            <span>Examples</span>
            <span className="close-icon">✕</span>
          </div>
          {Object.entries(EXAMPLES).map(([cat, programs], i) => (
            <div key={cat}>
              {['Basic', 'Memory', 'I/O'].includes(cat) && <hr className="exmenu-sep" />}
              <div className={`exmenu-cat${activeCat === cat ? ' exmenu-cat-active' : ''}`} onMouseEnter={() => setActiveCat(cat)} onClick={() => setActiveCat(activeCat === cat ? null : cat)}>
                <span>{cat}</span><span className="exmenu-arrow">▶</span>
                {activeCat === cat && (
                  <div className="exmenu-sub" onClick={e => e.stopPropagation()}>
                  {Object.keys(programs).map((name, idx) => {
                      if (name.startsWith('---')) {
                        const title = name.replace(/^--- ?/, '');
                      return title ? (
                        <div key={name} style={{ display: 'flex', flexDirection: 'column' }}>
                          {idx > 0 && <hr className="exmenu-sep" style={{ marginTop: 4, marginBottom: 4 }} />}
                          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', padding: '2px 14px 2px', letterSpacing: 1, textTransform: 'uppercase' }}>{title}</div>
                        </div>
                      ) : <hr key={name} className="exmenu-sep" />;
                      }
                      return <button key={name} className="exmenu-sub-item" onClick={() => { onLoad(`${cat}::${name}`); setOpen(false); setActiveCat(null) }}>{name}</button>
                    })}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        </>
      )}
    </>
  )
}