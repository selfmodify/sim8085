import { useState, useMemo } from 'react';
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

function InstructionCard({ mnemonic, inst }) {
  return (
    <div className="challenge-card" style={{ cursor: 'default' }}>
      <div className="challenge-title" style={{ color: 'var(--blue)' }}>
        {mnemonic}
      </div>
      <div className="challenge-desc" style={{ marginBottom: '12px', color: 'var(--text)' }}>
        {inst.brief}
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

function InstructionRow({ mnemonic, inst }) {
  return (
    <div style={{ display: 'flex', padding: '8px 16px', borderBottom: '1px solid var(--border)', alignItems: 'center', gap: '16px', transition: 'background 0.1s' }}
         onMouseEnter={e => e.currentTarget.style.background = 'var(--bg2)'}
         onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
      <div style={{ width: '64px', color: 'var(--blue)', fontWeight: 'bold', fontFamily: 'var(--mono)', flexShrink: 0 }}>{mnemonic}</div>
      <div style={{ flex: 1, color: 'var(--text)', fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{inst.brief}</div>
      <div style={{ width: '130px', color: 'var(--text2)', fontSize: '11px', fontFamily: 'var(--mono)', flexShrink: 0 }}>Flags: <span style={{ color: 'var(--text)' }}>{inst.flags}</span></div>
      <div style={{ width: '64px', color: 'var(--text2)', fontSize: '11px', fontFamily: 'var(--mono)', flexShrink: 0 }}>Bytes: <span style={{ color: 'var(--text)' }}>{inst.bytes}</span></div>
      <div style={{ width: '80px', color: 'var(--text2)', fontSize: '11px', fontFamily: 'var(--mono)', flexShrink: 0 }}>Cycles: <span style={{ color: 'var(--text)' }}>{inst.cycles}</span></div>
    </div>
  );
}

export function InstructionsView() {
  const [activeTab, setActiveTab] = useState('logical');
  const [layout, setLayout] = useState('card'); // 'card' | 'list'
  
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

  return (
    <div className="challenges-view">
      <div className="challenges-container">
        <div className="challenges-header">
          <h1>INSTRUCTION REFERENCE</h1>
          <p>Complete Intel 8085 instruction set and assembler directives.</p>
          <div className="view-tabs" style={{ marginLeft: 0, marginTop: '24px' }}>
            <button className={`view-tab${activeTab === 'logical' ? ' active' : ''}`} onClick={() => setActiveTab('logical')}>Logical Groups</button>
            <button className={`view-tab${activeTab === 'sorted' ? ' active' : ''}`} onClick={() => setActiveTab('sorted')}>Alphabetical</button>
            
            <div style={{ display: 'flex', gap: '6px', marginLeft: 'auto' }}>
              <button className={`view-tab${layout === 'card' ? ' active' : ''}`} onClick={() => setLayout('card')}>▤ Cards</button>
              <button className={`view-tab${layout === 'list' ? ' active' : ''}`} onClick={() => setLayout('list')}>☰ List</button>
            </div>
          </div>
        </div>

        {activeTab === 'logical' && CATEGORIES.map(category => (
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
                  ? <InstructionCard key={mnemonic} mnemonic={mnemonic} inst={inst} />
                  : <InstructionRow key={mnemonic} mnemonic={mnemonic} inst={inst} />;
              })}
            </div>
          </div>
        ))}

        {activeTab === 'sorted' && groupedAlphabetical.map(group => (
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
                  ? <InstructionCard key={mnemonic} mnemonic={mnemonic} inst={inst} />
                  : <InstructionRow key={mnemonic} mnemonic={mnemonic} inst={inst} />;
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}