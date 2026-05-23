import { useState, useMemo, useEffect } from 'react';
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

function InstructionCard({ mnemonic, inst, searchQuery }) {
  const isUndoc = UNDOCUMENTED_MNEMONICS.has(mnemonic);
  const isDir = DIRECTIVE_MNEMONICS.has(mnemonic);
  return (
    <div className="challenge-card" style={{ cursor: 'default' }}>
      <div className="challenge-title" style={{ color: isUndoc ? 'var(--amber)' : 'var(--blue)' }}>
        <span>{highlightText(mnemonic, searchQuery)}</span>
        {isUndoc && <span style={{ fontSize: '9px', padding: '2px 4px', background: 'var(--tint-amber)', color: 'var(--amber)', borderRadius: '2px', lineHeight: 1, fontWeight: 700, letterSpacing: '0.5px' }}>UNDOCUMENTED</span>}
        {isDir && <span style={{ fontSize: '9px', padding: '2px 4px', background: 'var(--tint-blue-code)', color: 'var(--blue)', borderRadius: '2px', lineHeight: 1, fontWeight: 700, letterSpacing: '0.5px' }}>DIRECTIVE</span>}
      </div>
      <div className="challenge-desc" style={{ marginBottom: '12px', color: 'var(--text)' }}>
        {highlightText(inst.brief, searchQuery)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px', fontFamily: 'var(--mono)', color: 'var(--text2)', marginBottom: '12px' }}>
        <div>Flags: <span style={{ color: 'var(--text)' }}>{inst.flags}</span></div>
        <div>Bytes: <span style={{ color: 'var(--text)' }}>{inst.bytes}</span></div>
        <div style={{ gridColumn: 'span 2' }}>Cycles: <span style={{ color: 'var(--text)' }}>{inst.cycles}</span></div>
      </div>
      <div className="challenge-desc" style={{ whiteSpace: 'pre-wrap', color: 'var(--text3)', marginBottom: '12px' }}>
        {inst.desc}
      </div>
      <div style={{ padding: '8px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '3px', fontFamily: 'var(--mono)', fontSize: '11px', whiteSpace: 'pre-wrap', color: 'var(--text)' }}>
        {inst.ex}
      </div>
    </div>
  );
}

function InstructionRow({ mnemonic, inst, searchQuery }) {
  const isUndoc = UNDOCUMENTED_MNEMONICS.has(mnemonic);
  const isDir = DIRECTIVE_MNEMONICS.has(mnemonic);
  const [expanded, setExpanded] = useState(false);
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', borderBottom: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', padding: '8px 16px', alignItems: 'center', transition: 'background 0.1s', cursor: 'pointer', background: expanded ? 'var(--bg2)' : 'transparent' }}
           onClick={() => setExpanded(!expanded)}
           onMouseEnter={e => e.currentTarget.style.background = 'var(--bg2)'}
           onMouseLeave={e => e.currentTarget.style.background = expanded ? 'var(--bg2)' : 'transparent'}>
        <div className="inst-row-left">
          <div style={{ width: '115px', display: 'flex', alignItems: 'center', gap: '6px', color: isUndoc ? 'var(--amber)' : 'var(--blue)', fontWeight: 'bold', fontFamily: 'var(--mono)', flexShrink: 0 }}>
            <span>{highlightText(mnemonic, searchQuery)}</span>
            {isUndoc && <span style={{ fontSize: '9px', padding: '2px 4px', background: 'var(--tint-amber)', color: 'var(--amber)', borderRadius: '2px', lineHeight: 1, fontWeight: 700, letterSpacing: '0.5px' }}>UNDOC</span>}
            {isDir && <span style={{ fontSize: '9px', padding: '2px 4px', background: 'var(--tint-blue-code)', color: 'var(--blue)', borderRadius: '2px', lineHeight: 1, fontWeight: 700, letterSpacing: '0.5px' }}>DIR</span>}
          </div>
          <div className="inst-row-desc">{highlightText(inst.brief, searchQuery)}</div>
          <div className="inst-row-stats">
            <div style={{ width: '130px', color: 'var(--text2)', fontSize: '11px', fontFamily: 'var(--mono)', flexShrink: 0 }}>Flags: <span style={{ color: 'var(--text)' }}>{inst.flags}</span></div>
            <div style={{ width: '64px', color: 'var(--text2)', fontSize: '11px', fontFamily: 'var(--mono)', flexShrink: 0 }}>Bytes: <span style={{ color: 'var(--text)' }}>{inst.bytes}</span></div>
            <div style={{ width: '80px', color: 'var(--text2)', fontSize: '11px', fontFamily: 'var(--mono)', flexShrink: 0 }}>Cycles: <span style={{ color: 'var(--text)' }}>{inst.cycles}</span></div>
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
            {highlightText(inst.ex, searchQuery)}
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

  // Filter categories based on search query (matches mnemonic OR description)
  const filteredCategories = useMemo(() => {
    if (!searchQuery) return CATEGORIES;
    const q = searchQuery.toLowerCase();
    return CATEGORIES.map(c => ({
      ...c,
      mnemonics: c.mnemonics.filter(m => m.toLowerCase().includes(q) || (INST_HELP[m]?.brief || '').toLowerCase().includes(q))
    })).filter(c => c.mnemonics.length > 0);
  }, [searchQuery]);

  // Filter alphabetical groups based on search query
  const filteredAlphabetical = useMemo(() => {
    if (!searchQuery) return groupedAlphabetical;
    const q = searchQuery.toLowerCase();
    return groupedAlphabetical.map(g => ({
      ...g,
      mnemonics: g.mnemonics.filter(m => m.toLowerCase().includes(q) || (INST_HELP[m]?.brief || '').toLowerCase().includes(q))
    })).filter(g => g.mnemonics.length > 0);
  }, [searchQuery, groupedAlphabetical]);

  return (
    <div className="challenges-view">
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
                  : <InstructionRow key={mnemonic} mnemonic={mnemonic} inst={inst} searchQuery={searchQuery} />;
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
                  : <InstructionRow key={mnemonic} mnemonic={mnemonic} inst={inst} searchQuery={searchQuery} />;
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}