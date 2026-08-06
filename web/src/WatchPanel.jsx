import { useState, useEffect, useRef, useMemo, memo } from 'react';
import * as sim from './simProxy.js';
import { PanelHelp } from './PanelHelp.jsx';
import { hex4, fmtWord, fmtByte, BASE_CYCLE } from './utils.js';
import { useSimulator } from './SimulatorContext.jsx';
import { PopoutWindow } from './PopoutWindow.jsx';

const PAIR_KEYS = { bc: ['b','c'], de: ['d','e'], hl: ['h','l'] };
const REG_NAMES = new Set(['a','b','c','d','e','h','l','pc','sp','flags','bc','de','hl']);

function getWatchInfo(w, regs) {
  if (w.type === 'reg') {
    const p = PAIR_KEYS[w.key];
    if (p) return { v: (regs[p[0]] << 8) | regs[p[1]], editable: true, kind: 'reg16' };
    return { v: regs[w.key] ?? 0, editable: true, kind: 'reg8' };
  }
  if (w.type === 'mem') {
    return { v: sim.simReadByte(w.addr), editable: true, kind: 'mem8', addr: w.addr };
  }
  if (w.type === 'expr') {
    const s = w.expr.toLowerCase();
    const memMatch = s.match(/^mem\[\s*(.*?)\s*\]$/);
    if (memMatch) {
      const inner = memMatch[1].replace(/\s+/g, '');
      const mathMatch = inner.match(/^([a-z0-9]+)([+-])([0-9a-f]+h?)$/);
      let baseStr = inner;
      let offset = 0;
      if (mathMatch) {
        baseStr = mathMatch[1];
        offset = parseInt(mathMatch[3].replace(/h$/, ''), 16);
        if (mathMatch[2] === '-') offset = -offset;
      }
      let addr;
      if (PAIR_KEYS[baseStr]) {
        addr = (regs[PAIR_KEYS[baseStr][0]] << 8) | regs[PAIR_KEYS[baseStr][1]];
      } else if (REG_NAMES.has(baseStr)) {
        addr = regs[baseStr];
      } else if (/^[0-9a-f]+h?$/.test(baseStr)) {
        addr = parseInt(baseStr.replace(/h$/, ''), 16);
      } else {
        return { v: 'ERR', editable: false };
      }
      const finalAddr = (addr + offset) & 0xFFFF;
      return { v: sim.simReadByte(finalAddr), editable: true, kind: 'mem8', addr: finalAddr };
    }
    return { v: 'ERR', editable: false };
  }
  return { v: 0, editable: false };
}

const WatchRow = memo(function WatchRow({ watch, info, changed, isBrk, isEditing, editValue, onStartEdit, onCommitEdit, onCancelEdit, onSetEditValue, onRemove, onToggleBreak, addrToLabel, regBase }) {
  const editInputRef = useRef(null);
  useEffect(() => {
    if (isEditing && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [isEditing]);

  const v = info.v;
  const isErr = v === 'ERR';
  const isWord = (watch.type === 'reg' && ['pc','sp','bc','de','hl'].includes(watch.key)) || (watch.type === 'expr' && v > 0xFF);
  const isEditable = info.editable && !isErr;

  const label = watch.type === 'reg' ? watch.key.toUpperCase() : watch.type === 'mem' ? hex4(watch.addr) + 'H' : watch.expr;
  const sym = watch.type === 'mem' ? addrToLabel.get(watch.addr) : null;

  return (
    <div className={`watch-row${changed ? ' changed' : ''}`}>
      <span className="watch-label" title={sym ? `${label} (${sym})` : label}>
        {label}
        {sym && <span style={{ color: 'var(--text3)', fontWeight: 'normal' }}> ({sym})</span>}
      </span>
      {isErr ? (
        <span className="watch-val" style={{ color: 'var(--red)' }}>ERR</span>
      ) : isEditing ? (
        <input
          ref={editInputRef}
          className="watch-input"
          style={{ width: isWord ? 52 : 36, padding: '1px 4px', margin: '0 4px', flex: 'none' }}
          value={editValue}
          onChange={e => onSetEditValue(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') onCommitEdit();
            if (e.key === 'Escape') onCancelEdit();
          }}
          onBlur={onCommitEdit}
        />
      ) : (<>
        <span className="watch-val"
          style={isEditable ? { cursor: 'pointer' } : {}}
          onDoubleClick={() => isEditable && onStartEdit()}
          title={isEditable ? 'Double-click to edit' : undefined}
        >{isWord ? fmtWord(v, regBase) : fmtByte(v, regBase)}</span>
        {(regBase||'hex') === 'hex' && <span className="watch-dec">{v}</span>}
      </>)}
      {watch.type === 'mem' && (
        <button className={`watch-brk${isBrk ? ' active' : ''}`}
          title={isBrk ? 'Break on write: ON — click to disable' : 'Break on write: OFF — click to enable'}
          onClick={() => onToggleBreak?.(watch.addr)}>W</button>
      )}
      <button className="watch-rm" onClick={onRemove}>✕</button>
    </div>
  );
}, (prev, next) => {
  if (prev.info.v !== next.info.v) return false;
  if (prev.changed !== next.changed) return false;
  if (prev.isBrk !== next.isBrk) return false;
  if (prev.isEditing !== next.isEditing) return false;
  if (prev.isEditing && next.isEditing && prev.editValue !== next.editValue) return false;
  if (prev.regBase !== next.regBase) return false;
  if (prev.watch !== next.watch) return false;
  if (prev.addrToLabel !== next.addrToLabel) return false;
  return true;
});

export function WatchPanel({ watches, symbols, regs, prevRegs, changedAddrs, onAdd, onRemove, dataBps, onToggleBreak, theme, popoutCrtProps }) {
  const { regBase, onRegBase, onEdit } = useSimulator()
  const panelRef = useRef(null)
  const [poppedOut, setPoppedOut] = useState(() => localStorage.getItem('sim8085_watch_popped_out') === 'true')
  const [input, setInput] = useState('')
  const [editingIndex, setEditingIndex] = useState(-1)
  const [editValue, setEditValue] = useState('')

  useEffect(() => {
    localStorage.setItem('sim8085_watch_popped_out', String(poppedOut))
  }, [poppedOut])

  const addrToLabel = useMemo(() => {
    const m = new Map()
    for (const [name, addr] of Object.entries(symbols || {})) m.set(addr, name)
    return m
  }, [symbols])

  function commitEdit() {
    if (editingIndex < 0) return
    const w = watches[editingIndex]
    const info = getWatchInfo(w, regs)
    
    if (info.editable) {
      const parsed = parseInt(editValue.replace(/h$/i, ''), regBase === 'dec' ? 10 : 16)
      if (!isNaN(parsed)) {
        if (info.kind === 'reg16') {
          if (w.key === 'pc' || w.key === 'sp') {
            sim.simWriteReg(w.key, parsed & 0xFFFF)
          } else {
            const p = PAIR_KEYS[w.key]
            const v = parsed & 0xFFFF
            sim.simWriteReg(p[0], v >> 8)
            sim.simWriteReg(p[1], v & 0xFF)
          }
        } else if (info.kind === 'reg8') {
          sim.simWriteReg(w.key, parsed & 0xFF)
        } else if (info.kind === 'mem8') {
          sim.simWriteByte(info.addr, parsed & 0xFF)
        }
        onEdit?.()
      }
    }
    setEditingIndex(-1)
  }

  function addWatch() {
    const s = input.trim().toLowerCase()
    if (!s) return
    if (REG_NAMES.has(s)) {
      if (!watches.find(w => w.type === 'reg' && w.key.toLowerCase() === s))
        onAdd({ type: 'reg', key: s })
    } else {
      if (/^[0-9a-f]+h?$/i.test(s)) {
        const addr = parseInt(s.replace(/h$/i,''), 16)
        onAdd({ type: 'mem', addr: addr & 0xFFFF })
      } else {
        if (!watches.find(w => w.type === 'expr' && w.expr.toLowerCase() === s))
          onAdd({ type: 'expr', expr: input.trim() })
      }
    }
    setInput('')
  }

  function onResizeDown(e) {
    e.preventDefault()
    const startY = e.clientY
    const targetEl = panelRef.current.closest('.mem-watch-row') || panelRef.current
    const startH = targetEl.getBoundingClientRect().height
    function onMove(ev) {
      targetEl.style.height = Math.max(80, startH + (startY - ev.clientY)) + 'px'
    }
    function onUp() {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      try {
        localStorage.setItem('sim8085_mem_row_height', targetEl.style.height)
      } catch {}
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  const content = (
    <>
      <div className="watch-add-row">
        <input className="watch-input" value={input} placeholder="A  BC  0200H  mem[HL]…"
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addWatch()} />
        <button className="btn btn-xs" onClick={addWatch}>+</button>
      </div>
      <div className="watch-body" style={poppedOut ? { flex: 1, overflowY: 'auto' } : undefined}>
        {watches.length === 0
          ? <div className="watch-empty">Type a register or address above</div>
          : watches.map((watch, i) => {
              const info = getWatchInfo(watch, regs);
              const isBrk = watch.type === 'mem' && dataBps?.has(watch.addr);
              let changed = false;
              if (watch.type === 'reg' && prevRegs) {
                const p = PAIR_KEYS[watch.key];
                if (p) {
                  const prevV = (prevRegs[p[0]] << 8) | prevRegs[p[1]];
                  changed = info.v !== prevV;
                } else {
                  changed = info.v !== prevRegs[watch.key];
                }
              } else if (info.kind === 'mem8' && info.addr !== undefined) {
                changed = changedAddrs?.has(info.addr);
              }

              return (
                <WatchRow key={watch.type === 'reg' ? `reg-${watch.key}` : watch.type === 'mem' ? `mem-${watch.addr}` : `expr-${watch.expr}`}
                  watch={watch} info={info} changed={changed} isBrk={isBrk}
                  isEditing={editingIndex === i} editValue={editValue}
                  onStartEdit={() => { setEditingIndex(i); setEditValue(regBase === 'dec' ? info.v.toString(10) : info.v.toString(16).toUpperCase()); }}
                  onCommitEdit={commitEdit} onCancelEdit={() => setEditingIndex(-1)} onSetEditValue={setEditValue}
                  onRemove={() => onRemove(i)} onToggleBreak={onToggleBreak}
                  addrToLabel={addrToLabel} regBase={regBase} />
              )
            })
        }
      </div>
    </>
  )

  return (
    <>
      <div className="panel watch-panel" ref={!poppedOut ? panelRef : null}>
        {poppedOut ? (
          <>
            <div className="panel-hd">
              <span><span className="panel-icon">👁</span>WATCH</span>
              <div className="panel-hd-right">
                <PanelHelp panel="WATCH" />
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
            {!poppedOut && <div className="watch-resize-handle" onMouseDown={onResizeDown} />}
            <div className="panel-hd">
              <span><span className="panel-icon">👁</span>WATCH</span>
              <div className="panel-hd-right">
                <button className="reg-base-btn" style={{ marginRight: 6 }} onClick={() => setPoppedOut(true)} title="Open in separate window">⧉</button>
                <button className="reg-base-btn" onClick={() => onRegBase(BASE_CYCLE[(BASE_CYCLE.indexOf(regBase)+1)%3])}
                  title="Toggle display: hex / dec / bin">{(regBase||'hex').toUpperCase()}</button>
                <PanelHelp panel="WATCH" />
              </div>
            </div>
            {content}
          </>
        )}
      </div>
      {poppedOut && (
        <PopoutWindow title="Watch - sim8085" theme={theme} onClose={() => setPoppedOut(false)} {...popoutCrtProps}>
          <div className="panel watch-panel" style={{ flex: 1, border: 'none', borderRadius: 0, paddingBottom: 0 }}>
            <div className="panel-hd">
              <span><span className="panel-icon">👁</span>WATCH</span>
              <div className="panel-hd-right">
                <button className="reg-base-btn" onClick={() => onRegBase(BASE_CYCLE[(BASE_CYCLE.indexOf(regBase)+1)%3])}
                  title="Toggle display: hex / dec / bin">{(regBase||'hex').toUpperCase()}</button>
                <PanelHelp panel="WATCH" />
              </div>
            </div>
            {content}
          </div>
        </PopoutWindow>
      )}
    </>
  )
}