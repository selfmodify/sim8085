import { useState, useEffect } from 'react';
import * as sim from './simProxy.js';
import { useCollapsible } from './hooks.js';
import { PanelHelp } from './PanelHelp.jsx';
import { PopoutWindow } from './PopoutWindow.jsx';
import { useSimulator } from './SimulatorContext.jsx';

export function FlagPanel({ regs, dragHandleProps, dropTargetProps, isDragOver, theme, popoutCrtProps }) {
  const { onEdit, onShowDialog } = useSimulator()
  const [collapsed, toggleCollapsed] = useCollapsible('flags', false)
  const [poppedOut, setPoppedOut] = useState(() => localStorage.getItem('sim8085_flags_popped_out') === 'true')

  useEffect(() => {
    localStorage.setItem('sim8085_flags_popped_out', String(poppedOut))
  }, [poppedOut])

  const FLAGS = [
    { label:'S',  key:'flagS',  bit: 7, title:'Sign — result was negative' },
    { label:'Z',  key:'flagZ',  bit: 6, title:'Zero — result was zero' },
    { label:'AC', key:'flagAC', bit: 4, title:'Auxiliary Carry — carry from bit 3' },
    { label:'P',  key:'flagP',  bit: 2, title:'Parity — even number of 1-bits' },
    { label:'CY', key:'flagCY', bit: 0, title:'Carry — result overflowed' },
  ]

  function handleFlagClick(f) {
    const doToggle = () => {
      const currentFlags = regs.flags ?? 0;
      const newFlags = currentFlags ^ (1 << f.bit);
      sim.simSetRegisters({ flags: newFlags });
      onEdit();
    };

    if (!localStorage.getItem('sim8085_flag_warn')) {
      onShowDialog?.({
        type: 'confirm',
        title: 'Manual Flag Edit',
        message: 'Warning: Modifying flags manually can cause unexpected program execution behavior. Proceed?',
        confirmText: 'Toggle Flag',
        onConfirm: () => {
          localStorage.setItem('sim8085_flag_warn', '1');
          doToggle();
        }
      });
    } else {
      doToggle();
    }
  }

  const content = (
    <div className="panel-anim-body flags-row">
      {FLAGS.map(f => (
        <div key={f.key} className={`flag${regs[f.key] ? ' flag-on' : ''}`} title={f.title + ' (Click to toggle)'} style={{ cursor: 'pointer' }} onClick={() => handleFlagClick(f)}>
          <div className="flag-lbl">{f.label}</div>
          <div className="flag-val">{regs[f.key]}</div>
        </div>
      ))}
    </div>
  )

  return (
    <>
      <div className={`panel flag-panel${!poppedOut && isDragOver ? ' drag-over' : ''}`} {...(!poppedOut ? dropTargetProps : {})}>
        {poppedOut ? (
          <>
            <div className="panel-hd" {...dragHandleProps}>
              <span><span className="panel-icon">🚩</span>FLAGS</span>
              <div className="panel-hd-right" style={{ marginLeft: 'auto' }}>
                <PanelHelp panel="FLAGS" />
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
              <span><span className="panel-icon">🚩</span>FLAGS</span>
              <div className="panel-hd-right" onClick={e => e.stopPropagation()} style={{ marginLeft: 'auto' }}>
                <button className="reg-base-btn" style={{ marginRight: 6 }} onClick={() => setPoppedOut(true)} title="Open in separate window">⧉</button>
                <PanelHelp panel="FLAGS" />
              </div>
              <span className="panel-chevron">{collapsed ? '▶' : '▼'}</span>
            </div>
            {!collapsed && content}
          </>
        )}
      </div>
      {poppedOut && (
        <PopoutWindow title="Flags - sim8085" theme={theme} onClose={() => setPoppedOut(false)} {...popoutCrtProps}>
          <div className="panel flag-panel" style={{ flex: 1, border: 'none', borderRadius: 0, paddingBottom: 0 }}>
            <div className="panel-hd">
              <span><span className="panel-icon">🚩</span>FLAGS</span>
              <div className="panel-hd-right" onClick={e => e.stopPropagation()} style={{ marginLeft: 'auto' }}>
                <PanelHelp panel="FLAGS" />
              </div>
            </div>
            {content}
          </div>
        </PopoutWindow>
      )}
    </>
  )
}