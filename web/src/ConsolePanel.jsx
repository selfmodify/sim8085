import { useState, useEffect, useRef } from 'react';
import { PanelHelp } from './PanelHelp.jsx';
import { PopoutWindow } from './PopoutWindow.jsx';
import { KNOWN_PORTS } from './IOPortPanel.jsx';

export function ConsolePanel({ output = '', port = 0, onSetPort, onClear, theme, popoutCrtProps }) {
  const [bodyEl, setBodyEl] = useState(null)
  const panelRef = useRef(null)
  const [poppedOut, setPoppedOut] = useState(() => localStorage.getItem('sim8085_console_popped_out') === 'true')
  const [portBuf, setPortBuf] = useState(() => (port ?? 0).toString(16).toUpperCase().padStart(2,'0'))
  const [height, setHeight] = useState(() => localStorage.getItem('sim8085_console_height') || '')
  const [showAuto, setShowAuto] = useState(false)
  const [autoIndex, setAutoIndex] = useState(-1)

  useEffect(() => { setPortBuf((port ?? 0).toString(16).toUpperCase().padStart(2,'0')) }, [port])

  useEffect(() => {
    localStorage.setItem('sim8085_console_popped_out', String(poppedOut))
  }, [poppedOut])

  useEffect(() => {
    if (bodyEl) bodyEl.scrollTop = bodyEl.scrollHeight
  }, [output, bodyEl])

  function commitPort() {
    const n = parseInt(portBuf.replace(/h$/i,''), 16)
    if (!isNaN(n) && n >= 0 && n <= 255) onSetPort(n & 0xFF)
  }

  function onResizeDown(e) {
    e.preventDefault()
    const startY = e.clientY
    const startH = panelRef.current.getBoundingClientRect().height
    function onMove(ev) {
      const newH = Math.max(60, startH + (startY - ev.clientY))
      panelRef.current.style.flex = `0 0 ${newH}px`
      panelRef.current.style.maxHeight = 'none' // Override CSS max-height constraint
    }
    function onUp() {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      const finalH = panelRef.current.style.flex
      setHeight(finalH)
      try {
        localStorage.setItem('sim8085_console_height', finalH)
      } catch {}
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  const safeOutput = output || ''
  const lines = safeOutput.split('\n')

  const autoMatches = portBuf 
    ? KNOWN_PORTS.filter(p => p.port.startsWith(portBuf) || p.desc.toLowerCase().includes(portBuf.toLowerCase())) 
    : KNOWN_PORTS;

  const headerInput = (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '4px' }}>
      <span className="console-port-label">OUT</span>
      <input className="console-port-input" value={portBuf} maxLength={3}
        onFocus={() => setShowAuto(true)}
        onBlur={() => { commitPort(); setShowAuto(false); setAutoIndex(-1) }}
        onChange={e => { setPortBuf(e.target.value.toUpperCase()); setShowAuto(true); setAutoIndex(-1) }}
        onKeyDown={e => { 
          if (showAuto && autoMatches.length > 0) {
            if (e.key === 'ArrowDown') { e.preventDefault(); setAutoIndex(i => (i + 1) % autoMatches.length) }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setAutoIndex(i => (i - 1 + autoMatches.length) % autoMatches.length) }
            else if (e.key === 'Enter' && autoIndex >= 0) {
              e.preventDefault();
              const p = autoMatches[autoIndex].port;
              setPortBuf(p);
              onSetPort(parseInt(p, 16));
              setShowAuto(false); setAutoIndex(-1);
              e.target.blur();
              return;
            }
          }
          if (e.key === 'Enter') { commitPort(); e.target.blur() }
          if (e.key === 'Escape') { setShowAuto(false); setAutoIndex(-1) }
        }}
        title="Port number (hex) — bytes written here appear as ASCII text" />
      <span className="console-port-label">H</span>
      {showAuto && autoMatches.length > 0 && (
        <div className="ctx-menu" style={{ position: 'absolute', top: '100%', right: 0, minWidth: 160, marginTop: 4, zIndex: 100, maxHeight: 180 }}>
          {autoMatches.map((m, i) => (
            <div key={m.port} ref={el => { if (el && autoIndex === i) el.scrollIntoView({ block: 'nearest' }) }} className="ctx-menu-item" style={{ display: 'flex', gap: '8px', padding: '4px 8px', background: autoIndex === i ? 'var(--bg3)' : undefined, color: autoIndex === i ? 'var(--text)' : undefined }}
              onMouseDown={e => { e.preventDefault(); setPortBuf(m.port); onSetPort(parseInt(m.port, 16)); setShowAuto(false); setAutoIndex(-1); }}>
              <span style={{ color: 'var(--amber)', width: 16 }}>{m.port}</span>
              <span style={{ color: 'var(--text3)', whiteSpace: 'nowrap' }}>{m.desc}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const content = (
      <div className="console-body" ref={setBodyEl} style={poppedOut ? { flex: 1, overflowY: 'auto' } : undefined}>
        {safeOutput === ''
          ? <span className="console-empty">No output yet — use OUT {portBuf}H to print ASCII characters</span>
          : lines.map((line, i) => (
              <div key={i} className="console-line">{line || ' '}</div>
            ))
        }
      </div>
  )

  return (
    <>
      <div className="panel console-panel" ref={!poppedOut ? panelRef : null} style={!poppedOut && height ? { flex: height, maxHeight: 'none' } : undefined}>
        {poppedOut ? (
          <>
            <div className="panel-hd">
              <span><span className="panel-icon">🖥</span>CONSOLE</span>
              <div className="panel-hd-right" style={{ marginLeft: 'auto' }}>
                <PanelHelp panel="CONSOLE" />
              </div>
            </div>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: 'var(--text2)' }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>🪟</div>
              <div style={{ fontSize: 12 }}>Opened in another window.</div>
              <button className="btn btn-xs" style={{ marginTop: 12 }} onClick={() => setPoppedOut(false)}>Bring it back</button>
            </div>
          </>
        ) : (
          <>
            <div className="console-resize-handle" onMouseDown={onResizeDown} />
            <div className="panel-hd">
              <span><span className="panel-icon">🖥</span>CONSOLE</span>
              <div className="panel-hd-right" style={{ marginLeft: 'auto' }}>
                <button className="reg-base-btn" style={{ marginRight: 6 }} onClick={() => setPoppedOut(true)} title="Open in separate window">⧉</button>
                {headerInput}
                <button className="reg-base-btn" onClick={onClear} title="Clear console output">✕</button>
                <PanelHelp panel="CONSOLE" />
              </div>
            </div>
            {content}
          </>
        )}
      </div>
      {poppedOut && (
        <PopoutWindow title="Console - sim8085" theme={theme} onClose={() => setPoppedOut(false)} {...popoutCrtProps}>
          <div className="panel console-panel" style={{ flex: 1, border: 'none', borderRadius: 0, paddingBottom: 0, maxHeight: 'none' }}>
            <div className="panel-hd">
              <span><span className="panel-icon">🖥</span>CONSOLE</span>
              <div className="panel-hd-right" style={{ marginLeft: 'auto' }}>
                {headerInput}
                <button className="reg-base-btn" onClick={onClear} title="Clear console output">✕</button>
                <PanelHelp panel="CONSOLE" />
              </div>
            </div>
            {content}
          </div>
        </PopoutWindow>
      )}
    </>
  )
}