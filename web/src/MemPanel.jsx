import { useState, useEffect, useRef, useMemo, memo, useCallback } from 'react';
import * as sim from './simProxy.js';
import { PanelHelp } from './PanelHelp.jsx';
import { hex2, hex4 } from './utils.js';
import { useSimulator } from './SimulatorContext.jsx';
import { PopoutWindow } from './PopoutWindow.jsx';
import { useDebounce } from './useDebounce.jsx';

const PAIR_KEYS = { bc: ['b','c'], de: ['d','e'], hl: ['h','l'] };
const REG_NAMES = new Set(['a','b','c','d','e','h','l','pc','sp','flags','bc','de','hl']);

function parseAddrExpr(s, regs) {
  if (!s) return NaN;
  s = s.toLowerCase().replace(/\s+/g, '');
  const mathMatch = s.match(/^([a-z0-9]+)([+-])([0-9a-f]+h?)$/);
  let baseStr = s;
  let offset = 0;
  if (mathMatch) {
    baseStr = mathMatch[1];
    offset = parseInt(mathMatch[3].replace(/h$/, ''), 16);
    if (mathMatch[2] === '-') offset = -offset;
  }
  let addr;
  if (PAIR_KEYS[baseStr]) addr = (regs[PAIR_KEYS[baseStr][0]] << 8) | regs[PAIR_KEYS[baseStr][1]];
  else if (REG_NAMES.has(baseStr)) addr = regs[baseStr];
  else if (/^[0-9a-f]+h?$/.test(baseStr)) addr = parseInt(baseStr.replace(/h$/, ''), 16);
  else return NaN;
  
  return (addr + offset) & 0xFFFF;
}

const MemRow = memo(function MemRow({
  row, base, COLS, mem, regsPc, regsSp, cursor, programRegion, presetAddrs,
  searchMatches, searchIdx, searchMatchSet, previewRange, flashAddr, changedAddrs,
  editing, editBuf, setEditBuf, commit, setEditing, setCursor
}) {
  let ascii = ''
  return (
    <tr key={row}>
      <td className="mem-row-addr">{hex4(base)}</td>
      {Array.from({length:COLS},(_,col)=>{
        const addr = base + col
        const val  = mem[row*COLS+col] ?? 0
        const isPC     = addr === regsPc
        const isSP     = addr === regsSp
        const isCursor = addr === cursor
        const isCode     = !isPC && !isSP && programRegion && addr >= programRegion.start && addr < programRegion.end
        const isPreset   = !isPC && !isSP && !isCode && presetAddrs?.has(addr)
        const isMatchCur = searchMatches.length > 0 && addr === searchMatches[searchIdx]
        const isMatch    = !isMatchCur && searchMatchSet.has(addr)
        const isFillPrev = !isPC && !isSP && !isMatchCur && !isMatch && previewRange && addr >= previewRange.start && addr <= previewRange.end
        const isFlash    = addr === flashAddr
        ascii += (val >= 0x20 && val <= 0x7E) ? String.fromCharCode(val) : '.'
        if (editing === addr)
          return (
            <td key={col} className="mem-cell editing">
              <input autoFocus maxLength={2} value={editBuf}
                onChange={e=>setEditBuf(e.target.value.toUpperCase())}
                onFocus={e => e.target.select()}
                onBlur={()=>commit(addr,editBuf)}
                onKeyDown={e=>{if(e.key==='Enter')commit(addr,editBuf);if(e.key==='Escape')setEditing(null)}}
              />
            </td>
          )
        return (
          <td key={col}
            className={`mem-cell${isPC?' mem-pc':''}${isSP?' mem-sp':''}${isCode?' mem-code':''}${isPreset?' mem-preset':''}${isCursor?' mem-cursor':''}${val?' mem-nz':''}${changedAddrs?.has(addr)?' mem-diff':''}${isMatchCur?' mem-match-cur':''}${isMatch?' mem-match':''}${isFillPrev?' mem-fill-prev':''}${isFlash?' mem-flash':''}`}
            title={`${hex4(addr)}: ${hex2(val)}H = ${val}`}
            onClick={()=>setCursor(addr)}
            onDoubleClick={()=>{setEditing(addr);setEditBuf(hex2(val))}}
          >{hex2(val)}</td>
        )
      })}
      <td className="mem-cell-ascii mobile-hidden" style={{ paddingLeft: 16, letterSpacing: '1px', opacity: 0.6, whiteSpace: 'pre' }}>{ascii}</td>
    </tr>
  )
}, (prev, next) => {
  if (prev.base !== next.base || prev.COLS !== next.COLS) return false;
  const rowStart = next.base;
  const rowEnd = next.base + next.COLS - 1;
  const wasInRow = (addr) => addr >= rowStart && addr <= rowEnd;
  
  if (wasInRow(prev.regsPc) || wasInRow(next.regsPc)) if (prev.regsPc !== next.regsPc) return false;
  if (wasInRow(prev.regsSp) || wasInRow(next.regsSp)) if (prev.regsSp !== next.regsSp) return false;
  if (wasInRow(prev.cursor) || wasInRow(next.cursor)) if (prev.cursor !== next.cursor) return false;
  if (wasInRow(prev.flashAddr) || wasInRow(next.flashAddr)) if (prev.flashAddr !== next.flashAddr) return false;
  if (wasInRow(prev.editing) || wasInRow(next.editing)) {
    if (prev.editing !== next.editing) return false;
    if (prev.editBuf !== next.editBuf) return false;
  }
  
  if (prev.searchIdx !== next.searchIdx) {
    const prevMatch = prev.searchMatches[prev.searchIdx];
    const nextMatch = next.searchMatches[next.searchIdx];
    if (wasInRow(prevMatch) || wasInRow(nextMatch)) return false;
  }
  if (prev.searchMatchSet !== next.searchMatchSet) {
    for (let i = 0; i < next.COLS; i++) {
      if (prev.searchMatchSet.has(next.base + i) !== next.searchMatchSet.has(next.base + i)) return false;
    }
  }
  
  const ppr = prev.previewRange;
  const npr = next.previewRange;
  if (ppr !== npr) {
    const wasInPrev = ppr && (rowEnd >= ppr.start && rowStart <= ppr.end);
    const isInNext  = npr && (rowEnd >= npr.start && rowStart <= npr.end);
    if (wasInPrev || isInNext) return false;
  }
  
  if (prev.programRegion !== next.programRegion) return false;
  
  if (prev.changedAddrs !== next.changedAddrs) {
    for (let i = 0; i < next.COLS; i++) {
      if (prev.changedAddrs?.has(next.base + i) !== next.changedAddrs?.has(next.base + i)) return false;
    }
  }
  
  if (prev.presetAddrs !== next.presetAddrs) {
    for (let i = 0; i < next.COLS; i++) {
      if (prev.presetAddrs?.has(next.base + i) !== next.presetAddrs?.has(next.base + i)) return false;
    }
  }

  for (let i = 0; i < next.COLS; i++) {
    if (prev.mem[prev.row * prev.COLS + i] !== next.mem[next.row * next.COLS + i]) return false;
  }
  return true;
});

export function MemPanel({ memStart, onJump, regs, buildId, changedAddrs, programRegion, presetAddrs, onMemoryEdited, memVisibleRangeRef, flashReq, theme, popoutCrtProps }) {
  const { onShowDialog } = useSimulator()
  const memCacheRef = useRef(null) // { buildId, data: Uint8Array } — avoid re-fetching 64KB on each search
  const [mem, setMem] = useState(new Uint8Array(128))
  const [poppedOut, setPoppedOut] = useState(() => {
    try {
      return localStorage.getItem('sim8085_mem_popped_out') === 'true'
    } catch {
      return false
    }
  })
  const [followPC, setFollowPC] = useState(false)
  const [flashAddr, setFlashAddr] = useState(null)
  const [editing, setEditing] = useState(null)
  const [editBuf, setEditBuf] = useState('')
  const [rows, setRows] = useState(8)
  const [addrBuf, setAddrBuf] = useState(hex4(memStart))
  const [cursor, setCursor] = useState(memStart)
  const [showSearch, setShowSearch] = useState(false)
  const [showFill, setShowFill]     = useState(false)
  const [showExport, setShowExport] = useState(false)
  const [searchVal, setSearchVal]   = useState('')
  const [searchMatches, setSearchMatches] = useState([])
  const [searchIdx, setSearchIdx]   = useState(0)
  const [fillFrom, setFillFrom]     = useState('')
  const [fillTo, setFillTo]         = useState('')
  const [fillVal, setFillVal]       = useState('')
  const [exportFrom, setExportFrom] = useState('')
  const [exportTo, setExportTo]     = useState('')
  const [searchRan, setSearchRan]   = useState(false)
  const addrFocused = useRef(false)
  const [COLS, setCols] = useState(16)
  const [scrollEl, setScrollEl] = useState(null)
  const panelRef  = useRef(null)

  const isScrolling = useRef(false)
  const scrollTimeout = useRef(null)

  const debouncedSearch = useDebounce(runSearch, 300)

  function handleScroll(e) {
    isScrolling.current = true
    if (scrollTimeout.current) clearTimeout(scrollTimeout.current)
    scrollTimeout.current = setTimeout(() => { isScrolling.current = false }, 150)

    const row = Math.floor(e.target.scrollTop / 20)
    const newMemStart = Math.max(0, Math.min(0x10000 - COLS, row * COLS))
    if (newMemStart !== memStart) {
      setFollowPC(false)
      onJump(newMemStart)
    }
  }

  useEffect(() => {
    return () => { if (scrollTimeout.current) clearTimeout(scrollTimeout.current) }
  }, [])

  useEffect(() => {
    if (!scrollEl || isScrolling.current) return
    const targetTop = (memStart / COLS) * 20
    if (Math.abs(scrollEl.scrollTop - targetTop) > 2) {
      scrollEl.scrollTop = targetTop
    }
  }, [memStart, COLS, scrollEl])

  useEffect(() => {
    try {
      localStorage.setItem('sim8085_mem_popped_out', String(poppedOut))
    } catch {}
  }, [poppedOut])

  const searchMatchSet  = useMemo(() => new Set(searchMatches), [searchMatches])
  const previewRange = useMemo(() => {
    let fromStr, toStr
    if (showFill) { fromStr = fillFrom; toStr = fillTo }
    else if (showExport) { fromStr = exportFrom; toStr = exportTo }
    else return null
    const from = parseAddrExpr(fromStr, regs), to = parseAddrExpr(toStr, regs)
    if (isNaN(from) || isNaN(to)) return null
    const start = Math.min(from, to) & 0xFFFF
    const end   = Math.min(Math.max(from, to) & 0xFFFF, 0xFFFF)
    return { start, end }
  }, [showFill, fillFrom, fillTo, showExport, exportFrom, exportTo, regs])

  useEffect(() => { if (!addrFocused.current) setAddrBuf(hex4(memStart)) }, [memStart])

  useEffect(() => {
    if (memVisibleRangeRef) {
      memVisibleRangeRef.current = { start: memStart, len: COLS * rows }
    }
  }, [memStart, rows, COLS, memVisibleRangeRef])

  function manualJump(addr) {
    setFollowPC(false)
    onJump(addr)
  }

  useEffect(() => {
    if (!followPC) return
    const visEnd = memStart + COLS * rows - 1
    if (regs.pc < memStart || regs.pc > visEnd) {
      onJump((regs.pc >> 4) << 4)
    }
  }, [regs.pc, followPC, memStart, rows, COLS, onJump])

  // When viewport jumps externally (address input, ◀/▶), clamp cursor into view
  useEffect(() => {
    setCursor(c => {
      const visEnd = memStart + COLS * rows - 1
      return (c < memStart || c > visEnd) ? memStart : c
    })
  }, [memStart, rows, COLS])

  useEffect(() => {
    if (flashReq?.addr === undefined) return
    setFlashAddr(flashReq.addr)
    const t = setTimeout(() => setFlashAddr(null), 1400)
    return () => clearTimeout(t)
  }, [flashReq])

  useEffect(() => {
    if (!scrollEl) return
    const ro = new ResizeObserver(([e]) => {
      // Add +1 overscan row to prevent empty gaps while scrolling between fractions of a row
      setRows(r => { const n = Math.max(2, Math.ceil((e.contentRect.height - 22) / 20) + 1); return n !== r ? n : r })
      setCols(c => {
        if (!poppedOut) return 16;
        const w = e.contentRect.width;
        if (w >= 1600) return 64;
        if (w >= 850) return 32;
        return 16;
      })
    })
    ro.observe(scrollEl)
    return () => ro.disconnect()
  }, [scrollEl, poppedOut])

  function onHandleMouseDown(e) {
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

  function refresh() { setMem(sim.simGetMemory(memStart, COLS * rows)) }
  useEffect(refresh, [memStart, regs.pc, rows, COLS, buildId])

  function commit(addr, raw) {
    const v = parseInt(raw, 16)
    if (!isNaN(v)) {
      sim.simWriteByte(addr, v)
      onMemoryEdited?.()
    }
    setEditing(null)
    refresh()
  }

  function moveCursor(delta) {
    const next = Math.max(0, Math.min(0xFFFF, cursor + delta))
    setCursor(next)
    const visEnd = memStart + COLS * rows - 1
    if (next < memStart) {
      manualJump((next >> 4) << 4)
    } else if (next > visEnd) {
      manualJump(Math.max(0, ((next >> 4) << 4) - COLS * (rows - 1)))
    }
  }

  function onPanelKey(e) {
    if (addrFocused.current || editing !== null) return
    const pageSize = COLS * rows
    if (e.key === 'ArrowUp')    { e.preventDefault(); moveCursor(-COLS) }
    if (e.key === 'ArrowDown')  { e.preventDefault(); moveCursor(+COLS) }
    if (e.key === 'ArrowLeft')  { e.preventDefault(); moveCursor(-1) }
    if (e.key === 'ArrowRight') { e.preventDefault(); moveCursor(+1) }
    if (e.key === 'PageUp')     { e.preventDefault(); moveCursor(-pageSize) }
    if (e.key === 'PageDown')   { e.preventDefault(); moveCursor(+pageSize) }
  }

  function runSearch() {
    const v = parseInt(searchVal, 16)
    if (isNaN(v)) return
    if (!memCacheRef.current || memCacheRef.current.buildId !== buildId) {
      memCacheRef.current = { buildId, data: sim.simGetMemory(0, 0x10000) }
    }
    const allMem = memCacheRef.current.data
    const byte = v & 0xFF
    const matches = []
    for (let i = 0; i < allMem.length; i++) {
      if (allMem[i] === byte) matches.push(i)
    }
    setSearchMatches(matches)
    setSearchIdx(0)
    setSearchRan(true)
    if (matches.length > 0) manualJump(matches[0] & 0xFFF0)
  }

  function searchNav(dir) {
    if (searchMatches.length === 0) return
    const idx = (searchIdx + dir + searchMatches.length) % searchMatches.length
    setSearchIdx(idx)
    manualJump(searchMatches[idx] & 0xFFF0)
  }

  function runFill() {
    const from = parseAddrExpr(fillFrom, regs)
    const to   = parseAddrExpr(fillTo, regs)
    const val  = parseInt(fillVal, 16)
    if (isNaN(from) || isNaN(to) || isNaN(val)) return
    const start = Math.min(from, to) & 0xFFFF
    const end   = Math.min(Math.max(from, to) & 0xFFFF, 0xFFFF)
    for (let a = start; a <= end; a++) sim.simWriteByte(a, val & 0xFF)
    refresh()
    onMemoryEdited?.()
  }

  function runExport() {
    const from = parseAddrExpr(exportFrom, regs)
    const to   = parseAddrExpr(exportTo, regs)
    if (isNaN(from) || isNaN(to)) return
    const start = Math.min(from, to) & 0xFFFF
    const end   = Math.min(Math.max(from, to) & 0xFFFF, 0xFFFF)
    const len = end - start + 1
    const buf = sim.simGetMemory(start, len)
    const blob = new Blob([buf], { type: 'application/octet-stream' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `memory_${hex4(start)}-${hex4(end)}.bin`
    document.body.appendChild(a); a.click()
    document.body.removeChild(a); URL.revokeObjectURL(url)
  }

  function clearMemory() {
    onShowDialog?.({
      type: 'confirm',
      title: 'Clear Memory',
      message: 'Clear all memory? This will overwrite everything with 00H.',
      confirmText: 'Clear',
      onConfirm: () => {
        for (let i = 0; i <= 0xFFFF; i++) sim.simWriteByte(i, 0)
        refresh()
        onMemoryEdited?.()
      }
    })
  }

  const fullHeader = (
    <div className="panel-hd">
      <span><span className="panel-icon">💾</span>MEMORY</span>
      <div className="panel-hd-right" style={{ marginLeft: 'auto' }}>
      <span className="mem-ctrl">
        <button className={`mem-btn${followPC ? ' mem-btn-active' : ''}`} style={{ width: 42 }}
          title={followPC ? 'Following PC — click to unlock' : 'Not following PC — click to lock'}
          onClick={() => setFollowPC(f => !f)}>
          {followPC ? 'PC↓' : 'PC·'}
        </button>
        <button className="mem-btn" title="Back 4 pages" onClick={() => manualJump(Math.max(0, memStart - COLS*rows*4))}>«</button>
        <button className="mem-btn" onClick={() => manualJump(Math.max(0, memStart - COLS*rows))}>◀</button>
        <input
          className="mem-cur-addr"
          value={addrBuf}
          spellCheck={false}
          style={{ width: addrBuf.length > 4 ? `${addrBuf.length + 1}ch` : 44 }}
          onChange={e => setAddrBuf(e.target.value.toUpperCase())}
          onFocus={e => { addrFocused.current = true; e.target.select() }}
          onBlur={() => { addrFocused.current = false; setAddrBuf(hex4(memStart)) }}
          onKeyDown={e => {
            if (e.key === 'Enter') { const v = parseAddrExpr(addrBuf, regs); if (!isNaN(v)) manualJump(v & 0xFFF0); e.target.blur() }
            if (e.key === 'Escape') { setAddrBuf(hex4(memStart)); e.target.blur() }
          }}
        />
      <button className="mem-btn" onClick={() => manualJump(Math.min(0xFFF0, memStart + COLS*rows))}>▶</button>
      <button className="mem-btn" title="Forward 4 pages" onClick={() => manualJump(Math.min(0xFFF0, memStart + COLS*rows*4))}>»</button>
      </span>
      <span className="mem-hd-secondary">
        <span style={{width:8, flexShrink:0}} />
        <button className={`mem-btn${showSearch ? ' mem-btn-active' : ''}`}
          title="Find byte in memory (toggle)"
          onClick={() => { setShowSearch(s => !s); setShowFill(false); setShowExport(false) }}>🔍</button>
        <button className={`mem-btn${showFill ? ' mem-btn-active' : ''}`}
          title="Fill memory range (toggle)"
          onClick={() => { setShowFill(s => !s); setShowSearch(false); setShowExport(false) }}>⊞</button>
        <button className={`mem-btn${showExport ? ' mem-btn-active' : ''}`}
          title="Export memory range (toggle)"
          onClick={() => { setShowExport(s => !s); setShowSearch(false); setShowFill(false) }}>⬇</button>
        <button className="mem-btn" title="Clear all memory" onClick={clearMemory}>🗑</button>
        {!poppedOut && <button className="reg-base-btn" style={{ marginLeft: 6 }} onClick={() => setPoppedOut(true)} title="Open in separate window">⧉</button>}
        <PanelHelp panel="MEMORY" wide />
      </span>
      </div>
    </div>
  )

  const content = (
    <>
      {showSearch && (
        <div className="mem-toolbar mem-toolbar-search">
          <span className="mem-toolbar-lbl">FIND</span>
          <input className="mem-toolbar-input" placeholder="FF" maxLength={2} style={{width:36}}
            autoFocus
            value={searchVal}
            onChange={e => { setSearchVal(e.target.value.toUpperCase()); setSearchRan(false); debouncedSearch() }}
            onKeyDown={e => { if (e.key === 'Enter') runSearch() }}
          />
          <button className="mem-btn" onClick={runSearch}>Search</button>
          {searchMatches.length > 0 && <>
            <button className="mem-btn" onClick={() => searchNav(-1)}>◀</button>
            <button className="mem-btn" onClick={() => searchNav(+1)}>▶</button>
            <span className="mem-toolbar-count">{searchIdx+1}/{searchMatches.length}</span>
          </>}
          {searchRan && searchMatches.length === 0 && <span className="mem-toolbar-count">no match</span>}
        </div>
      )}
      {showFill && (
        <div className="mem-toolbar mem-toolbar-fill">
          <span className="mem-toolbar-lbl">FILL</span>
          <input className="mem-toolbar-input" placeholder="0000, HL…" style={{width:76}}
            autoFocus
            value={fillFrom} onChange={e => setFillFrom(e.target.value.toUpperCase())} title="Start address" />
          <span className="mem-toolbar-lbl">–</span>
          <input className="mem-toolbar-input" placeholder="00FF, SP-2…" style={{width:76}}
            value={fillTo} onChange={e => setFillTo(e.target.value.toUpperCase())} title="End address" />
          <span className="mem-toolbar-lbl">with value</span>
          <input className="mem-toolbar-input" placeholder="00" maxLength={2} style={{width:30}}
            value={fillVal} onChange={e => setFillVal(e.target.value.toUpperCase())} title="Fill value" />
          <button className="mem-btn" onClick={runFill}>Fill range</button>
        </div>
      )}
      {showExport && (
        <div className="mem-toolbar mem-toolbar-fill">
          <span className="mem-toolbar-lbl">EXPORT</span>
          <input className="mem-toolbar-input" placeholder="0000, HL…" style={{width:76}}
            autoFocus
            value={exportFrom} onChange={e => setExportFrom(e.target.value.toUpperCase())} title="Start address" />
          <span className="mem-toolbar-lbl">–</span>
          <input className="mem-toolbar-input" placeholder="00FF, SP-2…" style={{width:76}}
            value={exportTo} onChange={e => setExportTo(e.target.value.toUpperCase())} title="End address" />
          <button className="mem-btn" onClick={runExport}>Download .bin</button>
        </div>
      )}
      <div className="mem-scroll" ref={setScrollEl} onScroll={handleScroll}>
        <table className="mem-tbl">
          <thead style={{ position: 'sticky', top: 0, zIndex: 2, background: 'var(--bg1)' }}>
            <tr>
              <th className="mem-th-addr"></th>
              {Array.from({length:COLS},(_,i)=><th key={i} className="mem-th">{hex2(i)}</th>)}
              <th className="mem-th-ascii mobile-hidden" style={{ paddingLeft: 16, textAlign: 'left' }}>ASCII</th>
            </tr>
          </thead>
          <tbody>
            {memStart > 0 && (
              <tr style={{ height: (memStart / COLS) * 20 }}>
                <td colSpan={COLS + 2} style={{ padding: 0, border: 0 }} />
              </tr>
            )}
            {Array.from({length:rows},(_,row)=>{
              const base = memStart + row*COLS
              if (base >= 0x10000) return null
              return (
                <MemRow
                  key={base} row={row} base={base} COLS={COLS} mem={mem}
                  regsPc={regs.pc} regsSp={regs.sp} cursor={cursor}
                  programRegion={programRegion} presetAddrs={presetAddrs}
                  searchMatches={searchMatches} searchIdx={searchIdx} searchMatchSet={searchMatchSet}
                  previewRange={previewRange} flashAddr={flashAddr} changedAddrs={changedAddrs}
                  editing={editing} editBuf={editBuf} setEditBuf={setEditBuf}
                  commit={commit} setEditing={setEditing} setCursor={setCursor}
                />
              )
            })}
            {memStart + rows * COLS < 0x10000 && (
              <tr style={{ height: ((0x10000 - memStart - rows * COLS) / COLS) * 20 }}>
                <td colSpan={COLS + 2} style={{ padding: 0, border: 0 }} />
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="jump-row">
        <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)', margin: 'auto 6px auto 2px' }}>JUMP TO:</span>
        <button className="mem-btn" style={memStart === (regs.pc & 0xFFF0) ? { borderColor: 'var(--amber)', color: 'var(--amber)' } : undefined} onClick={() => manualJump(regs.pc & 0xFFF0)}>PC</button>
        <button className="mem-btn" style={memStart === (regs.sp & 0xFFF0) ? { borderColor: 'var(--amber)', color: 'var(--amber)' } : undefined} onClick={() => manualJump(regs.sp & 0xFFF0)}>SP</button>
        <button className="mem-btn" style={memStart === 0x0100 ? { borderColor: 'var(--amber)', color: 'var(--amber)' } : undefined} onClick={() => manualJump(0x0100)}>100H</button>
        <button className="mem-btn" style={memStart === 0x0200 ? { borderColor: 'var(--amber)', color: 'var(--amber)' } : undefined} onClick={() => manualJump(0x0200)}>200H</button>
      </div>
      <div className="mem-legend">
        <span className="legend-pc">■</span> PC &nbsp;
        <span className="legend-sp">■</span> SP &nbsp;
        <span className="legend-code">■</span> Code &nbsp;
        <span className="legend-preset">■</span> Data &nbsp;
        <span className="legend-tip">double-click to edit · click + ↑↓ PgUp/Dn to scroll</span>
      </div>
    </>
  )

  return (
    <>
      <div className="panel mem-panel" ref={!poppedOut ? panelRef : null} tabIndex={!poppedOut ? 0 : undefined} onKeyDown={!poppedOut ? onPanelKey : undefined}>
        <div className="mem-resize-handle" onMouseDown={onHandleMouseDown} />
        {poppedOut ? (
          <>
            <div className="panel-hd">
              <span><span className="panel-icon">💾</span>MEMORY</span>
              <div className="panel-hd-right" style={{ marginLeft: 'auto' }}>
                <PanelHelp panel="MEMORY" wide />
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
            {fullHeader}
            {content}
          </>
        )}
      </div>
      {poppedOut && (
        <PopoutWindow title="Memory - sim8085" theme={theme} onClose={() => setPoppedOut(false)} {...popoutCrtProps}>
          <div className="panel mem-panel" style={{ flex: 1, border: 'none', borderRadius: 0 }} ref={panelRef} tabIndex={0} onKeyDown={onPanelKey}>
            {fullHeader}
            {content}
          </div>
        </PopoutWindow>
      )}
    </>
  )
}