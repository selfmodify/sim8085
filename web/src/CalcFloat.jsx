import { useState, useRef } from 'react';

const CALC_BASES = [
  { key: 'dec', label: 'DEC', radix: 10, maxLen:  5, placeholder: '65535',            allowed: /^[0-9]$/,     sep: true },
  { key: 'hex', label: 'HEX', radix: 16, maxLen:  4, placeholder: 'FFFF',             allowed: /^[0-9A-Fa-f]$/ },
  { key: 'oct', label: 'OCT', radix:  8, maxLen:  6, placeholder: '177777',           allowed: /^[0-7]$/ },
  { key: 'bin', label: 'BIN', radix:  2, maxLen: 16, placeholder: '1111111111111111', allowed: /^[01]$/ },
]
const EMPTY_VALS = { bin: '', oct: '', dec: '', hex: '' }

export function CalcFloat({ onClose, onPopout, isPoppedOut }) {
  const [vals, setVals] = useState(EMPTY_VALS)
  const [pos,  setPos]  = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('sim8085_calc_pos'));
      if (saved && typeof saved.x === 'number' && typeof saved.y === 'number') return saved;
    } catch {}
    return { x: Math.max(0, window.innerWidth / 2 - 120), y: 100 }
  })
  const posRef = useRef(pos)

  function filterKey(e, allowed) {
    if (e.key.length === 1 && !allowed.test(e.key)) e.preventDefault()
  }

  function update(key, raw) {
    const { radix } = CALC_BASES.find(b => b.key === key)
    const input = key === 'hex' ? raw.toUpperCase() : raw
    if (input === '') { setVals(EMPTY_VALS); return }
    const n = parseInt(input, radix)
    if (isNaN(n) || n < 0 || n > 0xFFFF) { setVals(v => ({ ...v, [key]: input })); return }
    setVals({ bin: n.toString(2), oct: n.toString(8), dec: String(n), hex: n.toString(16).toUpperCase(), [key]: input })
  }

  function onDragDown(e) {
    if (isPoppedOut) return
    if (e.target.closest('button')) return
    
    const isTouch = e.type === 'touchstart'
    const clientX = isTouch ? e.touches[0].clientX : e.clientX
    const clientY = isTouch ? e.touches[0].clientY : e.clientY
    const ox = clientX - posRef.current.x, oy = clientY - posRef.current.y
    
    function onMove(ev) {
      const cx = ev.type === 'touchmove' ? ev.touches[0].clientX : ev.clientX
      const cy = ev.type === 'touchmove' ? ev.touches[0].clientY : ev.clientY
      const p = { x: cx - ox, y: Math.max(0, cy - oy) }
      posRef.current = p; setPos(p)
    }
    function onUp() { 
      document.removeEventListener(isTouch ? 'touchmove' : 'mousemove', onMove)
      document.removeEventListener(isTouch ? 'touchend' : 'mouseup', onUp)
      localStorage.setItem('sim8085_calc_pos', JSON.stringify(posRef.current));
    }
    if (isTouch) {
      document.addEventListener('touchmove', onMove, { passive: false }); document.addEventListener('touchend', onUp)
    } else {
      e.preventDefault()
      document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp)
    }
  }

  const wrapperClass = isPoppedOut ? 'calc-window' : 'calc-float'
  const wrapperStyle = isPoppedOut ? {} : { left: pos.x, top: pos.y }

  return (
    <div className={wrapperClass} style={wrapperStyle}>
      <div className="calc-float-hd" onMouseDown={onDragDown} onTouchStart={onDragDown} style={{ cursor: isPoppedOut ? 'default' : 'move', touchAction: 'none' }}>
        <span><span className="panel-icon">🖩</span>CALCULATOR</span>
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center', marginLeft: 'auto' }}>
          {!isPoppedOut && onPopout && (
            <button className="reg-base-btn mobile-hidden" onClick={onPopout} title="Open in separate window">⧉</button>
          )}
          {onClose && (
            <button className="calc-float-close" onClick={onClose} title="Close">✕</button>
          )}
        </div>
      </div>
      <div className="calc-body">
        {CALC_BASES.map(({ key, label, maxLen, placeholder, allowed, sep }, i) => (
          <div key={key} className="calc-row" style={i === 1 ? { marginTop: 8 } : undefined}>
            <span className="calc-lbl">{label}</span>
            <input className="calc-input" value={vals[key]} maxLength={maxLen}
              placeholder={placeholder} spellCheck={false}
              onKeyDown={e => filterKey(e, allowed)}
              onChange={e => update(key, e.target.value)}
              onFocus={e => e.target.select()} />
          </div>
        ))}
      </div>
    </div>
  )
}