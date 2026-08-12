import { useState, useEffect, useRef, useMemo, memo } from 'react';
import { useCollapsible } from './hooks.js';
import { PanelHelp } from './PanelHelp.jsx';
import { hex4, fmtTraceVal, TRACE_REG16 } from './utils.js';
import { PopoutWindow } from './PopoutWindow.jsx';
import { VirtualList } from './VirtualList.jsx';

const TraceRow = memo(function TraceRow({ e, lbl, addrToLabel, onJumpDisasm }) {
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
    <div className="trace-row" onClick={() => onJumpDisasm?.(e.addr)} style={{ cursor: 'pointer' }} title="Click to jump disassembly here">
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
}, (prev, next) => {
  if (prev.e !== next.e) return false;
  if (prev.lbl !== next.lbl) return false;
  if (prev.addrToLabel !== next.addrToLabel) return false;
  return true;
});

export function TracePanel({ trace, symbols, onClear, onJumpDisasm, dragHandleProps, dropTargetProps, isDragOver, theme, popoutCrtProps }) {
  const [collapsed, toggleCollapsed] = useCollapsible('trace', true)
  const [poppedOut, setPoppedOut] = useState(() => { try { return localStorage.getItem('sim8085_trace_popped_out') === 'true' } catch { return false } })
  const [bodyEl, setBodyEl] = useState(null)

  useEffect(() => {
    if (bodyEl && trace.length > 0) {
      const scrollDelay = requestAnimationFrame(() => {
        const virtualListContainer = bodyEl.querySelector('[style*="overflow"]');
        if (virtualListContainer) virtualListContainer.scrollTop = virtualListContainer.scrollHeight;
      })
      return () => cancelAnimationFrame(scrollDelay)
    }
  }, [trace.length, bodyEl])

  useEffect(() => {
    try { localStorage.setItem('sim8085_trace_popped_out', String(poppedOut)) } catch {}
  }, [poppedOut])

  const addrToLabel = useMemo(() => {
    const m = new Map()
    for (const [name, addr] of Object.entries(symbols || {})) m.set(addr, name)
    return m
  }, [symbols])

  function exportTrace() {
    if (trace.length === 0) return;
    const lines = ['Address,Instruction,Changes'];
    for (const e of trace) {
      const addr = hex4(e.addr) + 'H';
      const stripped = e.text.replace(/^[0-9A-Fa-f]{4}\s+(?:[0-9A-Fa-f]{2}\s+)+/, '').trim();
      const text = stripped.replace(/"/g, '""');
      const changes = e.changedKeys.map(k => {
        const FLAG_SHORT = { flagS:'S', flagZ:'Z', flagAC:'AC', flagP:'P', flagCY:'CY' };
        const isFlag = !!FLAG_SHORT[k];
        const is16 = TRACE_REG16.has(k);
        const name = FLAG_SHORT[k] ?? k.toUpperCase();
        const val  = isFlag ? e.regs[k] : fmtTraceVal(k, e.regs[k]);
        return `${name}=${val}`;
      }).join(' ');
      lines.push(`${addr},"${text}","${changes}"`);
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'sim8085_trace.csv';
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  }

  const content = (
      <div className="panel-anim-body trace-body" ref={setBodyEl} style={{ display: 'flex', flexDirection: 'column', position: 'relative', flex: '1 1 0', minHeight: 0 }}>
        {trace.length === 0
          ? <div className="trace-empty">Step through code to record execution</div>
          : <VirtualList
              items={trace}
              itemHeight={18}
              renderItem={(e, idx) => {
                const lbl = addrToLabel.get(e.addr);
                return <TraceRow key={`${e.addr}-${idx}`} e={e} lbl={lbl} addrToLabel={addrToLabel} onJumpDisasm={onJumpDisasm} />
              }}
              overscan={3}
            />
        }
      </div>
  )

  return (
    <>
      <div className={`panel trace-panel${!poppedOut && isDragOver ? ' drag-over' : ''}`} data-collapsed={!poppedOut && collapsed} {...(!poppedOut ? dropTargetProps : {})}>
        {poppedOut ? (
          <>
            <div className="panel-hd" {...dragHandleProps}>
              <span><span className="panel-icon">📜</span>TRACE</span>
              <div className="panel-hd-right">
                <button className="reg-base-btn" style={{ marginRight: 6 }} onClick={exportTrace} disabled={trace.length === 0} title="Export trace to CSV">⬇ CSV</button>
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
                <button className="reg-base-btn" style={{ marginRight: 6 }} onClick={exportTrace} disabled={trace.length === 0} title="Export trace to CSV">⬇ CSV</button>
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
                <button className="reg-base-btn" style={{ marginRight: 6 }} onClick={exportTrace} disabled={trace.length === 0} title="Export trace to CSV">⬇ CSV</button>
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