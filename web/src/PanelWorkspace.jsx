import { useState, useRef, useMemo, useEffect } from 'react'
import { ErrorBoundary } from './ErrorBoundary.jsx'
import * as sim from './simProxy.js'
import { PanelHelp } from './PanelHelp.jsx'
import { useCollapsible } from './hooks.js'
import { LazyBoundary } from './useLazyPanel.jsx'
import { RegPanel } from './RegPanel.jsx'
import { PairPanel } from './PairPanel.jsx'
import { FlagPanel } from './FlagPanel.jsx'
import { AsmEditor } from './AsmEditor.jsx'
import { MemPanel } from './MemPanel.jsx'
import { DisasmPanel } from './DisasmPanel.jsx'
import { CallStackPanel } from './CallStackPanel.jsx'
import { WatchPanel } from './WatchPanel.jsx'
import { StackPanel } from './StackPanel.jsx'
import { TracePanel } from './TracePanel.jsx'
import { IOPortPanel } from './IOPortPanel.jsx'
import { ConsolePanel } from './ConsolePanel.jsx'
import { AudioPanel } from './AudioPanel.jsx'
import { MemMapPanel } from './MemMapPanel.jsx'
import { InterruptPanel } from './InterruptPanel.jsx'
import { LedDisplay } from './LedDisplay.jsx'
import { HelpPanel } from './HelpPanel.jsx'
import { PopoutWindow } from './PopoutWindow.jsx'

export function PanelWorkspace({ mobileTab, theme, src, setSrc, srcRef, engine, editorActionsRef, panels, canUndo, canRedo, onHistoryChange, setAppDialog, setHelpInst, formatCode, openConditionDialog, readOnlySource, popoutCrtProps }) {
  const [cursorInst, setCursorInst] = useState(null)
  const gotoLineRef = useRef(null)
  const [disasmFlashReq, setDisasmFlashReq] = useState(null)
  const [memFlashReq,   setMemFlashReq]   = useState(null)

  const [editorCollapsed, toggleEditorCollapsed] = useCollapsible('editor', false)
  const [editorPoppedOut, setEditorPoppedOut] = useState(() => {
    try { return localStorage.getItem('sim8085_editor_popped_out') === 'true' } catch { return false }
  })

  useEffect(() => {
    try { localStorage.setItem('sim8085_editor_popped_out', String(editorPoppedOut)) } catch {}
  }, [editorPoppedOut])
  const [draggedPanel, setDraggedPanel] = useState(null)
  const [dragOverPanel, setDragOverPanel] = useState(null)
  const [rightPanelOrder, setRightPanelOrder] = useState(() => {
    const defaultOrder = ['regs', 'pairs', 'flags', 'ints', 'io', 'memmap', 'audio']
    try {
      const saved = JSON.parse(localStorage.getItem('sim8085_right_panels')) || []
      const missing = defaultOrder.filter(k => !saved.includes(k))
      return saved.concat(missing)
    }
    catch { return defaultOrder }
  })

  const watchedWords = useMemo(() => {
    const list = new Set()
    for (const w of engine.watches) {
      if (w.type === 'reg') {
        list.add(w.key.toUpperCase())
      } else if (w.type === 'mem') {
        list.add(w.addr.toString(16).padStart(4, '0').toUpperCase() + 'H')
        for (const [sym, addr] of Object.entries(engine.symbols || {})) {
          if (addr === w.addr) list.add(sym.toUpperCase())
        }
      }
    }
    return [...list]
  }, [engine.watches, engine.symbols])

  const [centerPanelOrder, setCenterPanelOrder] = useState(() => {
    const defaultOrder = ['stack', 'callstack', 'trace']
    try {
      const saved = JSON.parse(localStorage.getItem('sim8085_center_panels')) || []
      const missing = defaultOrder.filter(k => !saved.includes(k))
      return saved.concat(missing)
    }
    catch { return defaultOrder }
  })

  function getDragProps(id, orderList, setOrderList, storageKey) {
    return {
      dragHandleProps: {
        draggable: true,
        title: "Drag to reorder",
        onDragStart: (e) => {
          setDraggedPanel(id)
          e.dataTransfer.effectAllowed = 'move'
          const panel = e.currentTarget.closest('.panel')
          if (panel) { e.dataTransfer.setDragImage(panel, 20, 20); setTimeout(() => { panel.style.opacity = '0.4' }, 0) }
        },
        onDragEnd: (e) => {
          const panel = e.currentTarget.closest('.panel')
          if (panel) panel.style.opacity = '1'
          setDraggedPanel(null)
          setDragOverPanel(null)
        }
      },
      dropTargetProps: {
        onDragOver: (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (draggedPanel && draggedPanel !== id && orderList.includes(draggedPanel)) setDragOverPanel(id) },
        onDragLeave: (e) => { if (dragOverPanel === id) setDragOverPanel(null) },
        onDrop: (e) => {
          e.preventDefault(); const panel = e.currentTarget.closest('.panel'); if (panel) panel.style.opacity = '1'
          setDragOverPanel(null)
          if (draggedPanel && draggedPanel !== id && orderList.includes(draggedPanel)) {
            setOrderList(prev => {
              const next = [...prev]; const from = next.indexOf(draggedPanel); const to = next.indexOf(id)
              if (from === -1 || to === -1) return prev; next.splice(from, 1); next.splice(to, 0, draggedPanel)
              try { localStorage.setItem(storageKey, JSON.stringify(next)) } catch {}
              return next
            })
          }
          setDraggedPanel(null)
        }
      },
      isDragOver: dragOverPanel === id
    }
  }

  const editorColRef = useRef(null)
  const rightColRef  = useRef(null)
  const memWatchMemRef   = useRef(null)
  const memWatchWatchRef = useRef(null)
  const disasmStackRef   = useRef(null)

  const initialWidths = useMemo(() => {
    const getWidth = (key) => { try { return localStorage.getItem(key) } catch { return undefined } }
    return {
      editor: getWidth('sim8085_col_editor'),
      right: getWidth('sim8085_col_right'),
      memWatch: getWidth('sim8085_memwatch_width'),
      stack: getWidth('sim8085_stack_width'),
      memRow: getWidth('sim8085_mem_row_height'),
      stackHeight: getWidth('sim8085_stack_height'),
      callstackHeight: getWidth('sim8085_callstack_height'),
      traceHeight: getWidth('sim8085_trace_height')
    }
  }, [])

  function onCenterPanelDividerDown(e) {
    e.preventDefault()
    const divider = e.currentTarget
    const panelKey = divider.dataset.panelKey
    const stackContainer = divider.closest('.disasm-trace-stack')
    const panelAbove = stackContainer?.querySelector(`[data-panel-key="${panelKey}"]`)
    if (!panelAbove) return
    const startY = e.clientY
    const startH = panelAbove.getBoundingClientRect().height
    let newH = startH
    function onMove(ev) {
      newH = Math.max(50, startH + (ev.clientY - startY))
      panelAbove.style.flex = `0 0 ${newH}px`
    }
    function onUp() {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  function onWatchConsoleDividerDown(e) {
    e.preventDefault()
    const divider = e.currentTarget
    const watchContainer = divider.closest('.mem-watch-watch')?.querySelector('[data-watch-container]')
    if (!watchContainer) {
      console.warn('Could not find watch container')
      return
    }
    const startY = e.clientY
    const startH = watchContainer.getBoundingClientRect().height
    let newH = startH
    function onMove(ev) {
      newH = Math.max(50, startH + (ev.clientY - startY))
      watchContainer.style.flex = `0 0 ${newH}px`
    }
    function onUp() {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  function onEditorResizeDown(e) {
    e.preventDefault(); const startX = e.clientX; const startW = editorColRef.current.getBoundingClientRect().width
    let newW = startW
    function onMove(ev) { newW = Math.max(180, Math.min(640, startW + (ev.clientX - startX))); editorColRef.current.style.flexBasis = newW + 'px' }
    function onUp() {
      document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp)
      try { localStorage.setItem('sim8085_col_editor', newW + 'px') } catch {}
    }
    document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp)
  }
  function onRightResizeDown(e) {
    e.preventDefault(); const startX = e.clientX; const startW = rightColRef.current.getBoundingClientRect().width
    let newW = startW
    function onMove(ev) { newW = Math.max(160, Math.min(600, startW - (ev.clientX - startX))); rightColRef.current.style.flexBasis = newW + 'px' }
    function onUp() {
      document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp)
      try { localStorage.setItem('sim8085_col_right', newW + 'px') } catch {}
    }
    document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp)
  }
  function onMemWatchDividerDown(e) {
    e.preventDefault(); const startX = e.clientX; const startW = memWatchMemRef.current?.getBoundingClientRect().width || 0
    let newW = startW
    function onMove(ev) { newW = Math.max(80, startW + (ev.clientX - startX)); if(memWatchMemRef.current) memWatchMemRef.current.style.flex = `0 0 ${newW}px` }
    function onUp() {
      document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp)
      try { localStorage.setItem('sim8085_memwatch_width', newW + 'px') } catch {}
    }
    document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp)
  }
  function onDisasmStackDividerDown(e) {
    e.preventDefault(); const startX = e.clientX; const stack = disasmStackRef.current; const startW = stack?.getBoundingClientRect().width || 0
    let newW = startW
    function onMove(ev) { newW = Math.max(100, startW - (ev.clientX - startX)); if(stack) stack.style.flex = `0 0 ${newW}px` }
    function onUp() {
      document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp)
      try { localStorage.setItem('sim8085_stack_width', newW + 'px') } catch {}
    }
    document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp)
  }

  const editorElement = (
    <AsmEditor value={src} onChange={v => { srcRef.current = v; setSrc(v) }} gotoRef={gotoLineRef} editorActionsRef={editorActionsRef}
      onHistoryChange={onHistoryChange}
      onCursorInstruction={setCursorInst} onInstructionDetail={setHelpInst}
      errorLine={engine.errorLine} activeLine={engine.addrLineMap?.get(engine.regs?.pc)} onRunTo={engine.runToAddr} onJumpMem={(addr) => { engine.setMemStart(addr & 0xFFF0); setMemFlashReq({ addr, ts: Date.now() }) }} buildId={engine.buildId} lineAddrRef={engine.lineAddrRef} theme={theme} watchedWords={watchedWords}
      bps={engine.bps} onToggleBp={engine.toggleBp}
      onAddressClick={(addr) => setDisasmFlashReq({ addr, ts: Date.now() })}
        onFormat={formatCode}
        symbols={engine.symbols} />
  );

  return (
    <div className="workspace">
      {/* Editor column */}
      <div className={`col col-editor${mobileTab!=='editor' ? ' mobile-hidden' : ''}`} ref={editorColRef} style={initialWidths.editor ? { flexBasis: initialWidths.editor } : undefined}>
        <div className="panel editor-panel" style={editorCollapsed ? { flex: 'none' } : undefined}>
          <div className="panel-hd collapsible" onClick={toggleEditorCollapsed}>
            <span><span className="panel-icon">✏️</span>EDITOR</span>
            <div className="panel-hd-right" onClick={e => e.stopPropagation()}>
              {!editorPoppedOut && <button className="reg-base-btn" onClick={() => setEditorPoppedOut(true)} title="Open in separate window">⧉</button>}
              <button className="reg-base-btn" onClick={() => editorActionsRef.current?.undo()} disabled={!canUndo} title="Undo typing (Ctrl+Z)">Undo</button>
              <button className="reg-base-btn" onClick={() => editorActionsRef.current?.redo()} disabled={!canRedo} title="Redo typing (Ctrl+Y)">Redo</button>
              <button className="reg-base-btn" onClick={formatCode} title="Auto-format code alignment">Format</button>
              <PanelHelp panel="EDITOR" />
            </div>
            <span className="panel-chevron">{editorCollapsed ? '▶' : '▼'}</span>
          </div>
          {!editorCollapsed && (
            editorPoppedOut ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: 'var(--text2)' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>🪟</div>
                <div>Editor is open in another window.</div>
                <button className="btn" style={{ marginTop: 16 }} onClick={() => setEditorPoppedOut(false)}>Bring it back</button>
              </div>
            ) : (
              editorElement
            )
          )}
        </div>
        <HelpPanel instruction={cursorInst} theme={theme} popoutCrtProps={popoutCrtProps} />
        <LedDisplay leds={engine.leds} theme={theme} popoutCrtProps={popoutCrtProps} />
      </div>
      <div className="col-resize-handle" onMouseDown={onEditorResizeDown} />

      {/* Code + Memory column */}
      <div className={`col col-center${mobileTab!=='code' ? ' mobile-hidden' : ''}`}>
        <div className="disasm-trace-row">
          <DisasmPanel regs={engine.regs} breakpoints={engine.bps} onToggleBp={engine.toggleBp} onClearAllBps={engine.clearAllBps} buildId={engine.buildId} pcFlash={engine.pcFlash}
            onSetCondition={openConditionDialog} onRunTo={engine.runToAddr} symbols={engine.symbols} onJumpMem={(addr) => { engine.setMemStart(addr & 0xFFF0); setMemFlashReq({ addr, ts: Date.now() }) }} hitcnts={engine.hitcnts} maxHit={engine.maxHit} flashReq={disasmFlashReq}
            addrLineMap={engine.addrLineMap}
            onGotoLine={(addr, labelName) => { const ln = engine.addrLineMap.get(addr); if (ln) gotoLineRef.current?.(ln, labelName) }}
            theme={theme} popoutCrtProps={popoutCrtProps} />
          {(panels.stack || panels.callstack || panels.trace) && (
            <>
              <div className="mem-watch-divider" onMouseDown={onDisasmStackDividerDown} />
              <div className="disasm-trace-stack" ref={disasmStackRef} style={initialWidths.stack ? { flex: `0 0 ${initialWidths.stack}` } : undefined}>
                {centerPanelOrder.map((key, idx) => {
                  if (!panels[key]) return null;
                  const dp = getDragProps(key, centerPanelOrder, setCenterPanelOrder, 'sim8085_center_panels')
                  const heightKey = `${key}Height`
                  const panel = key === 'stack' ? <ErrorBoundary><LazyBoundary panelName="Stack"><StackPanel regs={engine.regs} theme={theme} popoutCrtProps={popoutCrtProps} {...dp} /></LazyBoundary></ErrorBoundary>
                    : key === 'callstack' ? <ErrorBoundary><LazyBoundary panelName="Call Stack"><CallStackPanel callStack={engine.callStack} symbols={engine.symbols} onJump={engine.setMemStart} onJumpDisasm={(addr) => setDisasmFlashReq({ addr, ts: Date.now() })} onGotoLine={(addr) => { const ln = engine.addrLineMap?.get(addr); if (ln) gotoLineRef.current?.(ln); }} theme={theme} popoutCrtProps={popoutCrtProps} {...dp} /></LazyBoundary></ErrorBoundary>
                    : key === 'trace' ? <ErrorBoundary><LazyBoundary panelName="Trace"><TracePanel trace={engine.trace} symbols={engine.symbols} onClear={() => engine.setTrace([])} onJumpDisasm={(addr) => setDisasmFlashReq({ addr, ts: Date.now() })} theme={theme} popoutCrtProps={popoutCrtProps} {...dp} /></LazyBoundary></ErrorBoundary>
                    : null
                  const visiblePanels = centerPanelOrder.filter(k => panels[k])
                  const visibleIdx = visiblePanels.indexOf(key)
                  const isLast = visibleIdx === visiblePanels.length - 1
                  const style = isLast ? { flex: '1 1 0', minHeight: 0 } : initialWidths[heightKey] ? { flex: `0 0 ${initialWidths[heightKey]}` } : { flex: '0 0 100px' }
                  return (
                    <>
                      <div key={`panel-${key}`} className="center-panel-container" style={style} data-panel-key={key}>
                        {panel}
                      </div>
                      {!isLast && <div key={`divider-${key}`} className="center-panel-divider" onMouseDown={onCenterPanelDividerDown} data-panel-key={key} />}
                    </>
                  )
                })}
              </div>
            </>
          )}
        </div>
        <div className="mem-watch-row" style={{ height: initialWidths.memRow || '280px' }}>
          <div className="mem-watch-mem" ref={memWatchMemRef} style={initialWidths.memWatch ? { flex: `0 0 ${initialWidths.memWatch}` } : undefined}>
            <MemPanel memStart={engine.memStart} onJump={engine.setMemStart} regs={engine.regs} buildId={engine.buildId} changedAddrs={engine.changedAddrs} programRegion={engine.programRegion} presetAddrs={engine.presetAddrs} onMemoryEdited={() => engine.setBuildId(id => id + 1)} memVisibleRangeRef={engine.memVisibleRangeRef} flashReq={memFlashReq} theme={theme} popoutCrtProps={popoutCrtProps} />
          </div>
          <div className="mem-watch-divider" onMouseDown={onMemWatchDividerDown} />
          <div className="mem-watch-watch" ref={memWatchWatchRef} style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div style={{ flex: '0 0 120px', minHeight: 0, display: 'flex', flexDirection: 'column' }} data-watch-container>
              <LazyBoundary panelName="Watch">
                <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  <WatchPanel watches={engine.watches} symbols={engine.symbols} regs={engine.regs} prevRegs={engine.prevRegs} changedAddrs={engine.changedAddrs} onAdd={w => engine.setWatches(ws => [...ws, w])} onRemove={i => { const w = engine.watches[i]; if (w.type === 'mem' && engine.dataBps.has(w.addr)) { sim.simClearDataBreakpoint(w.addr); engine.setDataBps(prev => { const n = new Set(prev); n.delete(w.addr); return n }) }; engine.setWatches(ws => ws.filter((_,j) => j !== i)) }} dataBps={engine.dataBps} onToggleBreak={engine.toggleDataBp} theme={theme} popoutCrtProps={popoutCrtProps} />
                </div>
              </LazyBoundary>
            </div>
            <div className="center-panel-divider" onMouseDown={onWatchConsoleDividerDown} style={{ background: 'var(--border2)', minHeight: '6px' }} />
            <div style={{ flex: '1 1 0', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <ConsolePanel output={engine.consoleOutput} port={engine.consolePort} onSetPort={engine.changeConsolePort} onClear={() => { sim.simClearConsoleOutput(); engine.setConsoleOutput('') }} theme={theme} popoutCrtProps={popoutCrtProps} />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="col-resize-handle" onMouseDown={onRightResizeDown} />

      {/* Registers column */}
      <div className={`col col-right${mobileTab!=='regs' ? ' mobile-hidden' : ''}`} ref={rightColRef} style={initialWidths.right ? { flexBasis: initialWidths.right } : undefined}>
        {rightPanelOrder.map(key => {
          if (!panels[key]) return null;
          const dp = getDragProps(key, rightPanelOrder, setRightPanelOrder, 'sim8085_right_panels')
          if (key === 'regs')   return <ErrorBoundary key={key}><RegPanel regs={engine.regs} prev={engine.prevRegs} symbols={engine.symbols} onJump={engine.setMemStart} theme={theme} popoutCrtProps={popoutCrtProps} {...dp} /></ErrorBoundary>
          if (key === 'pairs')  return <ErrorBoundary key={key}><LazyBoundary panelName="Pairs"><PairPanel regs={engine.regs} prev={engine.prevRegs} symbols={engine.symbols} onJump={engine.setMemStart} onJumpDisasm={(addr) => setDisasmFlashReq({ addr, ts: Date.now() })} onMemoryEdited={() => engine.setBuildId(id => id + 1)} theme={theme} popoutCrtProps={popoutCrtProps} {...dp} /></LazyBoundary></ErrorBoundary>
          if (key === 'flags')  return <ErrorBoundary key={key}><LazyBoundary panelName="Flags"><FlagPanel regs={engine.regs} theme={theme} popoutCrtProps={popoutCrtProps} {...dp} /></LazyBoundary></ErrorBoundary>
          if (key === 'ints')   return <ErrorBoundary key={key}><LazyBoundary panelName="Interrupts"><InterruptPanel intState={engine.intState} onAssert={engine.assertInterrupt} onDeassert={engine.deassertInterrupt} theme={theme} popoutCrtProps={popoutCrtProps} {...dp} /></LazyBoundary></ErrorBoundary>
          if (key === 'io')     return <ErrorBoundary key={key}><LazyBoundary panelName="I/O"><IOPortPanel outputPorts={engine.outputPorts} inputPresets={engine.inputPresets} onSetInput={engine.setInputPort} onRemoveInput={engine.removeInputPort} keyQueue={engine.keyQueue} onEnqueueKeys={engine.enqueueKeys} onClearKeyQueue={engine.clearKeyQueue} sid={engine.sid} sod={engine.sod} onSetSID={v => { sim.simSetSID(v); engine.setSid(v); }} theme={theme} popoutCrtProps={popoutCrtProps} {...dp} /></LazyBoundary></ErrorBoundary>
          if (key === 'memmap') return <ErrorBoundary key={key}><LazyBoundary panelName="Memory Map"><MemMapPanel regs={engine.regs} programRegion={engine.programRegion} presetAddrs={engine.presetAddrs} symbols={engine.symbols} onJump={engine.setMemStart} onJumpDisasm={(addr) => setDisasmFlashReq({ addr, ts: Date.now() })} onGotoLine={(addr) => { const ln = engine.addrLineMap?.get(addr); if (ln) gotoLineRef.current?.(ln); }} theme={theme} popoutCrtProps={popoutCrtProps} {...dp} /></LazyBoundary></ErrorBoundary>
          if (key === 'audio')  return <ErrorBoundary key={key}><LazyBoundary panelName="Audio"><AudioPanel outputPorts={engine.outputPorts} running={engine.running} onShowDialog={setAppDialog} theme={theme} popoutCrtProps={popoutCrtProps} {...dp} /></LazyBoundary></ErrorBoundary>
          return null
        })}
      </div>

      {editorPoppedOut && (
        <PopoutWindow title="Editor - sim8085" theme={theme} onClose={() => setEditorPoppedOut(false)} {...popoutCrtProps}>
          <div className="panel" style={{ flex: 1, border: 'none', borderRadius: 0 }}>
            <div className="panel-hd" style={{ flexShrink: 0 }}>
              <span><span className="panel-icon">✏️</span>EDITOR</span>
              <div className="panel-hd-right">
                <button className="reg-base-btn" onClick={() => editorActionsRef.current?.undo()} disabled={!canUndo} title="Undo typing (Ctrl+Z)">Undo</button>
                <button className="reg-base-btn" onClick={() => editorActionsRef.current?.redo()} disabled={!canRedo} title="Redo typing (Ctrl+Y)">Redo</button>
                <button className="reg-base-btn" onClick={formatCode} title="Auto-format code alignment">Format</button>
                <PanelHelp panel="EDITOR" />
              </div>
            </div>
            {editorElement}
          </div>
        </PopoutWindow>
      )}
    </div>
  )
}