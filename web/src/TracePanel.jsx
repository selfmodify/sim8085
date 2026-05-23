import { useState, useEffect, useRef, useMemo } from 'react';
import { useCollapsible } from './hooks.js';
import { PanelHelp } from './PanelHelp.jsx';
import { hex4, fmtTraceVal, TRACE_REG16 } from './utils.js';
import { PopoutWindow } from './PopoutWindow.jsx';

export function TracePanel({ trace, symbols, onClear, dragHandleProps, dropTargetProps, isDragOver, theme, popoutCrtProps }) {
  const [collapsed, toggleCollapsed] = useCollapsible('trace', true)
  const [poppedOut, setPoppedOut] = useState(() => localStorage.getItem('sim8085_trace_popped_out') === 'true')
  const [bodyEl, setBodyEl] = useState(null)
  
  useEffect(() => {
    if (bodyEl) bodyEl.scrollTop = bodyEl.scrollHeight
  }, [trace, bodyEl])

  useEffect(() => {
    localStorage.setItem('sim8085_trace_popped_out', String(poppedOut))
  }, [poppedOut])

  const addrToLabel = useMemo(() => {
    const m = new Map()
    for (const [name, addr] of Object.entries(symbols || {})) m.set(addr, name)
    return m
  }, [symbols])

  const content = (
      <div className="panel-anim-body trace-body" ref={setBodyEl}>
        {trace.length === 0
          ? <div className="trace-empty">Step through code to record execution</div>
          : trace.map((e, i) => {
            const lbl = addrToLabel.get(e.addr);
            const stripped = e.text.replace(/^[0-9A-Fa-f]{4}\s+(?:[0-9A-Fa-f]{2}\s+)+/, '').trim();
            const mPart = stripped.match(/^([a-zA-Z0-9_]+)(\s+)(.+)$/);
            let opNodes = stripped;
            
            if (mPart) {
              const [, mnem, space, operand] = mPart;
              opNodes = <>{mnem}{space}{operand.split(/([0-9A-Fa-f]{4}H)/).map((part, idx) => {
                if (idx % 2 === 1) {
                  const val = parseInt(part.slice(0, -1), 16);
                  const l = addrToLabel.get(val);
                  if (l) return <span key={idx}>{part} <span style={{ color: 'var(--text3)', fontWeight: 'normal' }}>({l})</span></span>;
                }
                return <span key={idx}>{part}</span>;
              })}</>;
            }

            return (
            <div key={`${e.addr}-${i}`} className="trace-row">
              <span className="trace-addr" title={lbl}>{hex4(e.addr)}</span>
              <span className="trace-text">
                {lbl && <span style={{ color: 'var(--amber)', marginRight: '6px' }}>{lbl}:</span>}
                {opNodes}
              </span>
              {e.changedKeys.length > 0 &&
                <span className="trace-delta">
                  {e.changedKeys.map(k => {
                    const FLAG_SHORT = { flagS:'S', flagZ:'Z', flagAC:'AC', flagP:'P', flagCY:'CY' }
                    const isFlag = !!FLAG_SHORT[k]
                    const is16 = TRACE_REG16.has(k)
                    const name = FLAG_SHORT[k] ?? k.toUpperCase()
                    const val  = isFlag ? e.regs[k] : fmtTraceVal(k, e.regs[k])
                    const color = isFlag ? '#ff8a66' : is16 ? '#c792ea' : '#82aaff'
                    return <span key={k} style={{ color, marginRight: 7 }}>{name}={val}</span>
                  })}
                </span>
              }
            </div>
            )
          })
        }
      </div>
  )

  return (
    <>
      <div className={`panel trace-panel${!poppedOut && isDragOver ? ' drag-over' : ''}`} {...(!poppedOut ? dropTargetProps : {})}>
        {poppedOut ? (
          <>
            <div className="panel-hd" {...dragHandleProps}>
              <span><span className="panel-icon">📜</span>TRACE</span>
              <div className="panel-hd-right">
                <PanelHelp panel="TRACE" />
              </div>
            </div>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: 'var(--text2)', minHeight: 120 }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>🪟</div>
              <div style={{ fontSize: 12 }}>Opened in another window.</div>
              <button className="btn btn-xs" style={{ marginTop: 12 }} onClick={() => setPoppedOut(false)}>Bring it back</button>
            </div>
          </>
        ) : (
          <>
            <div className="panel-hd collapsible" onClick={toggleCollapsed} {...dragHandleProps}>
              <span><span className="panel-icon">📜</span>TRACE</span>
              <div className="panel-hd-right" onClick={e => e.stopPropagation()}>
                <button className="reg-base-btn" style={{ marginRight: 6 }} onClick={() => setPoppedOut(true)} title="Open in separate window">⧉</button>
                <button className="reg-base-btn" onClick={onClear} title="Clear trace">✕</button>
                <PanelHelp panel="TRACE" />
              </div>
              <span className="panel-chevron">{collapsed ? '▶' : '▼'}</span>
            </div>
            {!collapsed && content}
          </>
        )}
      </div>
      {poppedOut && (
        <PopoutWindow title="Trace - sim8085" theme={theme} onClose={() => setPoppedOut(false)} {...popoutCrtProps}>
          <div className="panel trace-panel" style={{ flex: 1, border: 'none', borderRadius: 0, paddingBottom: 0 }}>
            <div className="panel-hd">
              <span><span className="panel-icon">📜</span>TRACE</span>
              <div className="panel-hd-right" onClick={e => e.stopPropagation()}>
                <button className="reg-base-btn" onClick={onClear} title="Clear trace">✕</button>
                <PanelHelp panel="TRACE" />
              </div>
            </div>
            {content}
          </div>
        </PopoutWindow>
      )}
    </>
  )
}