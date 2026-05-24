import { useState, useMemo, useEffect, useRef } from 'react';
import { INST_HELP } from './instHelp.js';

const CATEGORIES = [
  {
    name: 'Data Transfer',
    mnemonics: ['LDA', 'LDAX', 'LHLD', 'LXI', 'MOV', 'MVI', 'PCHL', 'POP', 'PUSH', 'SHLD', 'SPHL', 'STA', 'STAX', 'XCHG', 'XTHL']
  },
  {
    name: 'Arithmetic',
    mnemonics: ['ACI', 'ADC', 'ADD', 'ADI', 'DAA', 'DAD', 'DCR', 'DCX', 'INR', 'INX', 'SBB', 'SBI', 'SUB', 'SUI']
  },
  {
    name: 'Logic & Bitwise',
    mnemonics: ['ANA', 'ANI', 'CMA', 'CMC', 'CMP', 'CPI', 'ORA', 'ORI', 'RAL', 'RAR', 'RLC', 'RRC', 'STC', 'XRA', 'XRI']
  },
  {
    name: 'Branching',
    mnemonics: ['CALL', 'CC', 'CM', 'CNC', 'CNZ', 'CP', 'CPE', 'CPO', 'CZ', 'JC', 'JM', 'JMP', 'JNC', 'JNZ', 'JP', 'JPE', 'JPO', 'JZ', 'RC', 'RET', 'RM', 'RNC', 'RNZ', 'RP', 'RPE', 'RPO', 'RST', 'RZ']
  },
  {
    name: 'I/O & Control',
    mnemonics: ['DI', 'EI', 'HLT', 'IN', 'NOP', 'OUT', 'RIM', 'SIM']
  },
  {
    name: 'Assembler Directives',
    mnemonics: ['ASSERT', 'DB', 'DS', 'DW', 'EQU', 'KICKOFF', 'ORG', 'SETBYTE', 'SETWORD']
  },
  {
    name: 'Undocumented',
    mnemonics: ['ARHL', 'DSUB', 'JK', 'LDHI', 'LDSI', 'LHLX', 'RDEL', 'RSTV', 'SHLX']
  }
];

const UNDOCUMENTED_MNEMONICS = new Set(CATEGORIES.find(c => c.name === 'Undocumented')?.mnemonics || []);
const DIRECTIVE_MNEMONICS = new Set(CATEGORIES.find(c => c.name === 'Assembler Directives')?.mnemonics || []);
const ALL_MNEMONICS = new Set(CATEGORIES.flatMap(c => c.mnemonics));
const REGS = new Set(['A','B','C','D','E','H','L','M','SP','PSW','BC','DE','HL']);
const ASM_DATA = new Set(['DB','DW','DS']);
const ASM_DIRECTIVES = new Set(['ORG','EQU']);

function highlightText(text, query) {
  if (!query || !text) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  return parts.map((part, i) => 
    part.toLowerCase() === query.toLowerCase() 
      ? <span key={i} style={{ backgroundColor: 'var(--tint-amber)', color: 'var(--amber)', borderRadius: '2px' }}>{part}</span> 
      : part
  );
}

export function highlightAsm(text, searchQuery) {
  if (!text) return null;
  // Tokenizer: 1:Comment 2:Number 3:String 4:Label 5:Word 6:Punctuation/Whitespace
  const ASM_RE = /(;.*)|(\b[0-9A-Fa-f]+[Hh]\b|\b[01]+[Bb]\b|\b[0-9]+\b)|("[^"]*"|'[^']*')|([A-Za-z_][A-Za-z0-9_]*:)|([A-Za-z_][A-Za-z0-9_]*)|([^A-Za-z0-9_;"']+)/g;
  
  const parts = [];
  let m;
  let i = 0;
  while ((m = ASM_RE.exec(text)) !== null) {
    let style = {};
    if (m[1]) {
      style = { color: 'var(--syn-comment)', fontStyle: 'italic' };
    } else if (m[2]) {
      style = { color: 'var(--syn-number)' };
    } else if (m[3]) {
      style = { color: 'var(--syn-string)' };
    } else if (m[4]) {
      style = { color: 'var(--syn-label)' };
    } else if (m[5]) {
      const word = m[5].toUpperCase();
      if (ASM_DATA.has(word)) style = { color: 'var(--syn-data)', fontWeight: '600' };
      else if (ASM_DIRECTIVES.has(word)) style = { color: 'var(--syn-directive)' };
      else if (DIRECTIVE_MNEMONICS.has(word)) style = { color: 'var(--syn-pseudo)', fontWeight: '600' };
      else if (ALL_MNEMONICS.has(word)) style = { color: 'var(--syn-keyword)', fontWeight: '600' };
      else if (REGS.has(word)) style = { color: 'var(--syn-register)' };
    }
    parts.push(<span key={i++} style={style}>{highlightText(m[0], searchQuery)}</span>);
  }
  return parts;
}

function InstructionCard({ mnemonic, inst, searchQuery }) {
  const isUndoc = UNDOCUMENTED_MNEMONICS.has(mnemonic);
  const isDir = DIRECTIVE_MNEMONICS.has(mnemonic);
  return (
    <div className="challenge-card" style={{ cursor: 'default' }}>
      <div className="challenge-title" style={{ color: isUndoc ? 'var(--amber)' : 'var(--blue)' }}>
        <span>{highlightText(mnemonic, searchQuery)}</span>
        {isUndoc && <span title="Undocumented Intel 8085 instruction" style={{ fontSize: '9px', padding: '2px 4px', background: 'var(--tint-amber)', color: 'var(--amber)', borderRadius: '2px', lineHeight: 1, fontWeight: 700, letterSpacing: '0.5px', cursor: 'help' }}>UNDOCUMENTED</span>}
        {isDir && <span title="Assembler directive (pseudo-operation)" style={{ fontSize: '9px', padding: '2px 4px', background: 'var(--tint-blue-code)', color: 'var(--blue)', borderRadius: '2px', lineHeight: 1, fontWeight: 700, letterSpacing: '0.5px', cursor: 'help' }}>DIRECTIVE</span>}
      </div>
      <div className="challenge-desc" style={{ marginBottom: '12px', color: 'var(--text)' }}>
        {highlightText(inst.brief, searchQuery)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px', fontFamily: 'var(--mono)', color: 'var(--text2)', marginBottom: '12px' }}>
        <div>Flags: <span style={{ color: 'var(--text)' }}>{highlightText(inst.flags, searchQuery)}</span></div>
        <div>Bytes: <span style={{ color: 'var(--text)' }}>{highlightText(String(inst.bytes), searchQuery)}</span></div>
        <div style={{ gridColumn: 'span 2' }}>Cycles: <span style={{ color: 'var(--text)' }}>{highlightText(String(inst.cycles), searchQuery)}</span></div>
      </div>
      <div className="challenge-desc" style={{ whiteSpace: 'pre-wrap', color: 'var(--text3)', marginBottom: '12px' }}>
        {inst.desc}
      </div>
      <div style={{ padding: '8px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '3px', fontFamily: 'var(--mono)', fontSize: '11px', whiteSpace: 'pre-wrap', color: 'var(--text)' }}>
        {highlightAsm(inst.ex, searchQuery)}
      </div>
    </div>
  );
}

function InstructionRow({ mnemonic, inst, searchQuery, expandToggle }) {
  const isUndoc = UNDOCUMENTED_MNEMONICS.has(mnemonic);
  const isDir = DIRECTIVE_MNEMONICS.has(mnemonic);
  const [expanded, setExpanded] = useState(false);
  
  useEffect(() => {
    if (expandToggle && expandToggle.id > 0) {
      setExpanded(expandToggle.state);
    }
  }, [expandToggle]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', borderBottom: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', padding: '8px 16px', alignItems: 'center', transition: 'background 0.1s', cursor: 'pointer', background: expanded ? 'var(--bg2)' : 'transparent' }}
           onClick={() => setExpanded(!expanded)}
           onMouseEnter={e => e.currentTarget.style.background = 'var(--bg2)'}
           onMouseLeave={e => e.currentTarget.style.background = expanded ? 'var(--bg2)' : 'transparent'}>
        <div className="inst-row-left">
          <div style={{ width: '115px', display: 'flex', alignItems: 'center', gap: '6px', color: isUndoc ? 'var(--amber)' : 'var(--blue)', fontWeight: 'bold', fontFamily: 'var(--mono)', flexShrink: 0 }}>
            <span>{highlightText(mnemonic, searchQuery)}</span>
            {isUndoc && <span title="Undocumented Intel 8085 instruction" style={{ fontSize: '9px', padding: '2px 4px', background: 'var(--tint-amber)', color: 'var(--amber)', borderRadius: '2px', lineHeight: 1, fontWeight: 700, letterSpacing: '0.5px', cursor: 'help' }}>UNDOC</span>}
            {isDir && <span title="Assembler directive (pseudo-operation)" style={{ fontSize: '9px', padding: '2px 4px', background: 'var(--tint-blue-code)', color: 'var(--blue)', borderRadius: '2px', lineHeight: 1, fontWeight: 700, letterSpacing: '0.5px', cursor: 'help' }}>DIR</span>}
          </div>
          <div className="inst-row-desc">{highlightText(inst.brief, searchQuery)}</div>
          <div className="inst-row-stats">
            <div style={{ width: '130px', color: 'var(--text2)', fontSize: '11px', fontFamily: 'var(--mono)', flexShrink: 0 }}>Flags: <span style={{ color: 'var(--text)' }}>{highlightText(inst.flags, searchQuery)}</span></div>
            <div style={{ width: '64px', color: 'var(--text2)', fontSize: '11px', fontFamily: 'var(--mono)', flexShrink: 0 }}>Bytes: <span style={{ color: 'var(--text)' }}>{highlightText(String(inst.bytes), searchQuery)}</span></div>
            <div style={{ width: '80px', color: 'var(--text2)', fontSize: '11px', fontFamily: 'var(--mono)', flexShrink: 0 }}>Cycles: <span style={{ color: 'var(--text)' }}>{highlightText(String(inst.cycles), searchQuery)}</span></div>
          </div>
        </div>
        <div style={{ color: 'var(--text3)', fontSize: '14px', flexShrink: 0, width: '12px', textAlign: 'right', opacity: 0.7 }}>{expanded ? '▴' : '▾'}</div>
      </div>
      
      {expanded && (
        <div className="inst-row-expanded">
          <div className="challenge-desc" style={{ whiteSpace: 'pre-wrap', color: 'var(--text3)', marginBottom: '12px', fontSize: '13px', lineHeight: 1.5 }}>
            {highlightText(inst.desc, searchQuery)}
          </div>
          <div style={{ padding: '8px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '3px', fontFamily: 'var(--mono)', fontSize: '11px', whiteSpace: 'pre-wrap', color: 'var(--text)' }}>
            {highlightAsm(inst.ex, searchQuery)}
          </div>
        </div>
      )}
    </div>
  );
}

export function InstructionsView() {
  const [activeTab, setActiveTab] = useState('logical');
  const [layout, setLayout] = useState(() => localStorage.getItem('sim8085_inst_layout') || 'card');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandToggle, setExpandToggle] = useState({ state: false, id: 0 });
  const scrollRef = useRef(null);
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    localStorage.setItem('sim8085_inst_layout', layout);
  }, [layout]);
  
  // Flatten, deduplicate, group by starting letter, and sort all mnemonics alphabetically
  const groupedAlphabetical = useMemo(() => {
    const sorted = Array.from(new Set(CATEGORIES.flatMap(c => c.mnemonics))).sort();
    const groups = [];
    for (const mnem of sorted) {
      const letter = mnem[0].toUpperCase();
      let group = groups.find(g => g.letter === letter);
      if (!group) {
        group = { letter, mnemonics: [] };
        groups.push(group);
      }
      group.mnemonics.push(mnem);
    }
    return groups;
  }, []);

  // Filter categories based on search query (deep scan all fields)
  const filteredCategories = useMemo(() => {
    if (!searchQuery) return CATEGORIES;
    const q = searchQuery.toLowerCase();
    return CATEGORIES.map(c => ({
      ...c,
      mnemonics: c.mnemonics.filter(m => {
        const inst = INST_HELP[m];
        return m.toLowerCase().includes(q) || 
               (inst?.brief || '').toLowerCase().includes(q) ||
               (inst?.desc || '').toLowerCase().includes(q) ||
               (inst?.flags || '').toLowerCase().includes(q) ||
               String(inst?.bytes || '').toLowerCase().includes(q) ||
               String(inst?.cycles || '').toLowerCase().includes(q);
      })
    })).filter(c => c.mnemonics.length > 0);
  }, [searchQuery]);

  // Filter alphabetical groups based on search query (deep scan all fields)
  const filteredAlphabetical = useMemo(() => {
    if (!searchQuery) return groupedAlphabetical;
    const q = searchQuery.toLowerCase();
    return groupedAlphabetical.map(g => ({
      ...g,
      mnemonics: g.mnemonics.filter(m => {
        const inst = INST_HELP[m];
        return m.toLowerCase().includes(q) || 
               (inst?.brief || '').toLowerCase().includes(q) ||
               (inst?.desc || '').toLowerCase().includes(q) ||
               (inst?.flags || '').toLowerCase().includes(q) ||
               String(inst?.bytes || '').toLowerCase().includes(q) ||
               String(inst?.cycles || '').toLowerCase().includes(q);
      })
    })).filter(g => g.mnemonics.length > 0);
  }, [searchQuery, groupedAlphabetical]);

  return (
    <div className="challenges-view" ref={scrollRef} onScroll={e => setShowTop(e.target.scrollTop > 400)}>
      <style>{`
        .inst-row-left { display: flex; flex: 1; align-items: center; min-width: 0; gap: 16px; }
        .inst-row-desc { flex: 1; color: var(--text); font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding-right: 16px; }
        .inst-row-stats { display: flex; gap: 16px; }
        .inst-row-expanded { padding: 12px 16px 16px 147px; background: transparent; border-top: 1px dashed var(--border); }
        
        @media (max-width: 850px) {
          .inst-row-left { flex-wrap: wrap; align-items: flex-start; gap: 6px 0; padding-right: 8px; }
          .inst-row-desc { flex-basis: 100%; order: 3; white-space: normal; padding-right: 0; padding-top: 2px; }
          .inst-row-stats { order: 2; flex: 1; flex-wrap: wrap; gap: 8px 16px; align-items: center; justify-content: flex-start; }
          .inst-row-stats > div { width: auto !important; }
          .inst-row-expanded { padding-left: 16px !important; }
        }
        .inst-top-btn { position: fixed; bottom: 32px; right: 32px; z-index: 100; width: 44px; height: 44px; border-radius: 50%; padding: 0; justify-content: center; font-size: 18px; box-shadow: var(--shadow-pop); opacity: 0; pointer-events: none; margin-bottom: -10px; transition: opacity 0.2s, margin-bottom 0.2s, background 0.12s, transform 0.06s; }
        .inst-top-btn.show { opacity: 1; pointer-events: auto; margin-bottom: 0; }
      `}</style>
      <div className="challenges-container">
        <div className="challenges-header">
          <h1>INSTRUCTION REFERENCE</h1>
          <p>Complete Intel 8085 instruction set and assembler directives.</p>
          <div className="view-tabs" style={{ marginLeft: 0, marginTop: '24px', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button className={`view-tab${activeTab === 'logical' ? ' active' : ''}`} onClick={() => setActiveTab('logical')}>Logical Groups</button>
              <button className={`view-tab${activeTab === 'sorted' ? ' active' : ''}`} onClick={() => setActiveTab('sorted')}>Alphabetical</button>
            </div>
            
            <input 
              type="text" 
              className="chat-input" 
              placeholder="Search instructions..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ width: '240px', marginLeft: 'auto', padding: '6px 10px', fontSize: '13px' }}
            />

            {layout === 'list' && (
              <div style={{ display: 'flex', gap: '6px', marginRight: '6px', borderRight: '1px solid var(--border)', paddingRight: '12px' }}>
                <button className="view-tab" onClick={() => setExpandToggle({ state: true, id: Date.now() })}>Expand All</button>
                <button className="view-tab" onClick={() => setExpandToggle({ state: false, id: Date.now() })}>Collapse All</button>
              </div>
            )}

            <div style={{ display: 'flex', gap: '6px' }}>
              <button className={`view-tab${layout === 'card' ? ' active' : ''}`} onClick={() => setLayout('card')}>▤ Cards</button>
              <button className={`view-tab${layout === 'list' ? ' active' : ''}`} onClick={() => setLayout('list')}>☰ List</button>
            </div>
          </div>
        </div>

        {activeTab === 'logical' && filteredCategories.length === 0 && (
          <div style={{ color: 'var(--text3)', textAlign: 'center', padding: '40px', fontStyle: 'italic' }}>No instructions match "{searchQuery}"</div>
        )}
        
        {activeTab === 'logical' && filteredCategories.map(category => (
          <div key={category.name} style={{ marginBottom: '32px' }}>
            <div 
              className="t-panel-hd" 
              style={{ marginBottom: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '6px', fontSize: '14px', color: 'var(--text)' }}
            >
              {category.name.toUpperCase()}
            </div>
            <div className={layout === 'card' ? 'challenge-grid' : ''} style={layout === 'list' ? { background: 'var(--bg1)', border: '1px solid var(--border)', borderBottom: 'none', borderRadius: 'var(--radius-lg)', overflow: 'hidden' } : {}}>
              {category.mnemonics.map(mnemonic => {
                const inst = INST_HELP[mnemonic];
                if (!inst) return null;
                return layout === 'card'
                  ? <InstructionCard key={mnemonic} mnemonic={mnemonic} inst={inst} searchQuery={searchQuery} />
                  : <InstructionRow key={mnemonic} mnemonic={mnemonic} inst={inst} searchQuery={searchQuery} expandToggle={expandToggle} />;
              })}
            </div>
          </div>
        ))}

        {activeTab === 'sorted' && filteredAlphabetical.length === 0 && (
          <div style={{ color: 'var(--text3)', textAlign: 'center', padding: '40px', fontStyle: 'italic' }}>No instructions match "{searchQuery}"</div>
        )}

        {activeTab === 'sorted' && filteredAlphabetical.map(group => (
          <div key={group.letter} style={{ marginBottom: '32px' }}>
            <div 
              className="t-panel-hd" 
              style={{ marginBottom: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '6px', fontSize: '14px', color: 'var(--text)' }}
            >
              {group.letter}
            </div>
            <div className={layout === 'card' ? 'challenge-grid' : ''} style={layout === 'list' ? { background: 'var(--bg1)', border: '1px solid var(--border)', borderBottom: 'none', borderRadius: 'var(--radius-lg)', overflow: 'hidden' } : {}}>
              {group.mnemonics.map(mnemonic => {
                const inst = INST_HELP[mnemonic];
                if (!inst) return null;
                return layout === 'card'
                  ? <InstructionCard key={mnemonic} mnemonic={mnemonic} inst={inst} searchQuery={searchQuery} />
                  : <InstructionRow key={mnemonic} mnemonic={mnemonic} inst={inst} searchQuery={searchQuery} expandToggle={expandToggle} />;
              })}
            </div>
          </div>
        ))}
      </div>
      <button 
        className={`btn inst-top-btn${showTop ? ' show' : ''}`}
        onClick={() => scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
        title="Jump to top"
      >
        ▲
      </button>
    </div>
  );
}