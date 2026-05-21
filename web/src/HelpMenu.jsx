import { useState, useEffect, useRef } from 'react';

export function HelpMenu({ onShowWelcome, onShowShortcuts, onManageGithub }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = e => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="bmenu-wrap bmenu-mobile-hide help-menu-wrap" ref={wrapRef} style={{ display: 'flex', alignItems: 'center' }}>
      <style>{`
        .help-menu-wrap .exmenu-sub-item:hover {
          color: var(--accent);
        }
      `}</style>
      <button className="btn" onClick={() => setOpen(o => !o)}>
        ❓ Help {open ? '▴' : '▾'}
      </button>
      {open && (
        <div className="exmenu-dropdown" style={{ right: 0, left: 'auto', top: 'calc(100% + 5px)', minWidth: '200px' }} onClick={() => setOpen(false)}>
          <button className="exmenu-sub-item" onClick={onShowWelcome}>📖 Welcome guide</button>
          <button className="exmenu-sub-item" onClick={onShowShortcuts}>⌨ Keyboard shortcuts</button>
          <hr className="exmenu-sep" />
          <button className="exmenu-sub-item" onClick={() => window.open('https://github.com/selfmodify/sim8085/discussions', '_blank')}>💬 Ask a Question</button>
          <button className="exmenu-sub-item" onClick={onManageGithub}>🔑 Manage GitHub API Token</button>
          <hr className="exmenu-sep" />
          <button className="exmenu-sub-item" onClick={() => window.open('./privacy.html', '_blank')}>🔒 Privacy Policy</button>
          <button className="exmenu-sub-item" onClick={() => window.open('./terms.html', '_blank')}>📜 Terms of Service</button>
        </div>
      )}
    </div>
  );
}