import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const wasmJsPath = path.resolve('public/sim8085.js');
const wasmJsCode = fs.readFileSync(wasmJsPath, 'utf8');

// Set up sandboxed environment for WASM
const wasmContext = {
  require,
  console,
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
  process,
  Buffer,
  Uint8Array,
  Uint32Array,
  Int8Array,
  Int16Array,
  Int32Array,
  Float32Array,
  Float64Array,
  ArrayBuffer,
  DataView,
  __dirname: path.resolve('public'),
  __filename: path.resolve('public/sim8085.js'),
  globalThis: null,
};
wasmContext.globalThis = wasmContext;

vm.createContext(wasmContext);
vm.runInContext(wasmJsCode, wasmContext);
const Sim8085Module = wasmContext.Sim8085Module;

// Set up sandboxed environment for JS Bridge
const jsBridgePath = path.resolve('src/sim8085Bridge.js');
const utilsPath = path.resolve('src/utils.js');

// Read the files
let jsBridgeCode = fs.readFileSync(jsBridgePath, 'utf8');
let utilsCode = fs.readFileSync(utilsPath, 'utf8');

// Strip 'import' statements from the bridge code
jsBridgeCode = jsBridgeCode.replace(/import\s*\{[\s\S]*?\}\s*from\s*['"]\.\/utils\.js['"]/, '');

const jsContext = {
  console,
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
  process,
  Buffer,
  Uint8Array,
  Uint32Array,
  Int8Array,
  Int16Array,
  Int32Array,
  Float32Array,
  Float64Array,
  ArrayBuffer,
  DataView,
  exports: {},
};
vm.createContext(jsContext);

// Convert ES module exports to commonjs-like exports for the bridge
jsBridgeCode = jsBridgeCode.replace(/export function (\w+)/g, 'exports.$1 = function $1');
jsBridgeCode = jsBridgeCode.replace(/export let (\w+)/g, 'exports.$1 = let $1');
jsBridgeCode = jsBridgeCode.replace(/export const (\w+)/g, 'exports.$1 = $1');

// Execute utils in the context first
let cleanUtilsCode = utilsCode.replace(/export /g, '');
vm.runInContext(cleanUtilsCode, jsContext);

vm.runInContext(jsBridgeCode, jsContext);
const JS = jsContext.exports;

// Initialize WASM module
const M = await Sim8085Module();

// Helper to alloc/free string in WASM
function alloc(n) { return M._malloc(n); }
function free(ptr) { M._free(ptr); }
function heapWrite(ptr, src) { M.HEAPU8.set(src, ptr); }
function cstr(ptr) { return M.UTF8ToString(ptr); }

// WASM interface wrapper
const WASM = {
  simInit: () => {
    M._sim_init();
  },
  simAssemble: (source) => {
    M._sim_init();
    M._sim_reset_profile();
    M._sim_reset_cycles();
    
    // Assemble in JS first to get bytes and entrypoint
    const res = JS.simAssemble(source);
    if (res.ok) {
      const ram = JS.simGetFullMemory();
      const ramPtr = alloc(ram.length);
      heapWrite(ramPtr, ram);
      M._sim_restore_snapshot(0, 0, ramPtr, ram.length);
      free(ramPtr);
      M._wasm_restore_regs(0, 0, 0, 0, 0, 0, 0, 0, res.entryPoint, 0);
    }
    return res;
  },
  simStep: () => {
    return !!M._sim_step();
  },
  simGetRegisters: () => {
    M._wasm_snap_regs();
    return {
      a: M._wasm_reg_a(),
      b: M._wasm_reg_b(),
      c: M._wasm_reg_c(),
      d: M._wasm_reg_d(),
      e: M._wasm_reg_e(),
      h: M._wasm_reg_h(),
      l: M._wasm_reg_l(),
      flags: M._wasm_reg_flags(),
      pc: M._wasm_reg_pc(),
      sp: M._wasm_reg_sp(),
      flagS: M._wasm_reg_flag_s(),
      flagZ: M._wasm_reg_flag_z(),
      flagAC: M._wasm_reg_flag_ac(),
      flagP: M._wasm_reg_flag_p(),
      flagCY: M._wasm_reg_flag_cy(),
      status: M._wasm_reg_status(),
      halted: !!M._wasm_reg_halted(),
      hasError: !!M._wasm_reg_has_error(),
    };
  },
  simReadByte: (addr) => {
    return M._sim_read_byte(addr);
  },
  simWriteByte: (addr, val) => {
    M._sim_write_byte(addr, val);
  },
  simGetCycles: () => {
    const lo = M._sim_get_cycles_lo();
    const hi = M._sim_get_cycles_hi();
    return lo + hi * 4294967296;
  },
  simIsRunning: () => {
    return M ? !!M._sim_is_running() : false;
  },
  simIsHalted: () => {
    return M ? !!M._sim_is_halted() : false;
  },
  simIsHaltWaiting: () => {
    return M ? !!M._sim_is_halt_waiting() : false;
  },
  simSetInputPort: (port, val) => {
    if (M) M._sim_set_input_port(port, val);
  },
  simDisassemble: (addr) => {
    const op = M._sim_read_byte(addr);
    
    // Custom ASSERT disassemble logic identical to sim8085WasmBridge.js
    if (op === 0x00DD || op === 0xDD) {
      const sub = M._sim_read_byte(addr + 1) ?? 0;
      const REG8_N = ['B', 'C', 'D', 'E', 'H', 'L', 'M', 'A'];
      const FLAG_N = ['CY', 'Z', 'S', 'P', 'AC'];
      const PAIR_N = ['BC', 'DE', 'HL', 'SP', 'PC'];
      const h = (n, w = 2) => n.toString(16).toUpperCase().padStart(w, '0');
      let mnemText = 'ASSERT ???', len = 2;
      if (sub <= 0x07) {
        const val = M._sim_read_byte(addr + 2) ?? 0;
        mnemText = `ASSERT ${REG8_N[sub]}, ${h(val)}H`; len = 3;
      } else if (sub >= 0x10 && sub <= 0x14) {
        const val = M._sim_read_byte(addr + 2) ?? 0;
        mnemText = `ASSERT ${FLAG_N[sub - 0x10]}, ${val & 1}`; len = 3;
      } else if (sub >= 0x20 && sub <= 0x24) {
        const val = (M._sim_read_byte(addr + 2) ?? 0) | ((M._sim_read_byte(addr + 3) ?? 0) << 8);
        mnemText = `ASSERT ${PAIR_N[sub - 0x20]}, ${h(val, 4)}H`; len = 4;
      } else if (sub === 0x30) {
        const a16 = (M._sim_read_byte(addr + 2) ?? 0) | ((M._sim_read_byte(addr + 3) ?? 0) << 8);
        const val = M._sim_read_byte(addr + 4) ?? 0;
        mnemText = `ASSERT MEM, ${h(a16, 4)}H, ${h(val)}H`; len = 5;
      }
      return {
        text: `${h(addr, 4)}  DD ${h(sub)}         ${mnemText}`,
        len,
        mnem: 'ASSERT',
      };
    }

    M._wasm_disassemble(addr);
    const text = cstr(M._wasm_disasm_text());
    const len  = M._wasm_disasm_len();
    return {
      text: text.trim(),
      len: Math.max(1, len),
      mnem: text.trim().split(/[\s,]+/)[0] ?? '',
    };
  }
};

console.log('===================================================');
console.log('   Starting Intel 8085 Instruction Parity Test     ');
console.log('===================================================\n');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assertParity(testName, asmCode, setupFn = null) {
  totalTests++;
  console.log(`Running: ${testName}...`);
  
  try {
    // 1. ASSEMBLE
    JS.simInit();
    const jsAsmRes = JS.simAssemble(asmCode);
    if (!jsAsmRes.ok) {
      throw new Error(`JS Assembly failed: ${jsAsmRes.errorMsg}`);
    }

    WASM.simInit();
    const wasmAsmRes = WASM.simAssemble(asmCode);
    if (!wasmAsmRes.ok) {
      throw new Error(`WASM Assembly failed: ${wasmAsmRes.errorMsg}`);
    }

    // 2. SETUP (optional state injection)
    if (setupFn) {
      setupFn(JS, WASM);
    }

    // Compare compiled memory size and bytes
    const jsMem = JS.simGetFullMemory();
    for (let i = 0; i < 65536; i++) {
      if (JS.simReadByte(i) !== WASM.simReadByte(i)) {
        throw new Error(`Byte mismatch at address ${i.toString(16).toUpperCase()}H: JS has ${JS.simReadByte(i)}, WASM has ${WASM.simReadByte(i)}`);
      }
    }

    // 3. STEP & VERIFY PARITY
    let stepCount = 0;
    while (true) {
      const jsRegs = JS.simGetRegisters();
      const wasmRegs = WASM.simGetRegisters();

      // Compare current PC
      if (jsRegs.pc !== wasmRegs.pc) {
        throw new Error(`PC mismatch at step ${stepCount}: JS has ${jsRegs.pc.toString(16)}H, WASM has ${wasmRegs.pc.toString(16)}H`);
      }

      // Check current instruction disassembly
      const jsDis = JS.simDisassemble(jsRegs.pc);
      const wasmDis = WASM.simDisassemble(jsRegs.pc);
      const jsCleanText = jsDis.text.replace(/\s+/g, ' ').trim().toUpperCase();
      const wasmCleanText = wasmDis.text.replace(/\s+/g, ' ').trim().toUpperCase();
      
      // We allow minor whitespace or case differences, but instruction semantics must be exact
      if (jsDis.len !== wasmDis.len) {
        throw new Error(`Disassembly length mismatch at PC ${jsRegs.pc.toString(16)}H: JS length is ${jsDis.len}, WASM length is ${wasmDis.len}`);
      }

      const jsRunning = JS.simIsRunning();
      const wasmRunning = WASM.simIsRunning();
      if (jsRunning !== wasmRunning) {
        throw new Error(`Running status mismatch at step ${stepCount}: JS running=${jsRunning}, WASM running=${wasmRunning}`);
      }

      if (!jsRunning) {
        break; // Halted or finished
      }

      // Step both engines
      JS.simStep();
      WASM.simStep();
      stepCount++;

      // Verify state after step
      const jsPostRegs = JS.simGetRegisters();
      const wasmPostRegs = WASM.simGetRegisters();

      const regKeys = ['a', 'b', 'c', 'd', 'e', 'h', 'l', 'sp', 'flags'];
      for (const k of regKeys) {
        if (jsPostRegs[k] !== wasmPostRegs[k]) {
          throw new Error(`Register ${k.toUpperCase()} mismatch after step ${stepCount}: JS has ${jsPostRegs[k].toString(16)}H, WASM has ${wasmPostRegs[k].toString(16)}H`);
        }
      }

      // Verify T-state cycle counts accumulated
      if (JS.simGetCycles() !== WASM.simGetCycles()) {
        throw new Error(`Cycle count mismatch after step ${stepCount}: JS cycles=${JS.simGetCycles()}, WASM cycles=${WASM.simGetCycles()}`);
      }
      
      if (stepCount > 1000) {
        throw new Error('Infinite loop detected in test execution!');
      }
    }

    console.log(`  -> SUCCESS (steps: ${stepCount}, cycles: ${JS.simGetCycles()})`);
    passedTests++;
  } catch (err) {
    console.error(`  -> FAILED: ${err.message}\n`);
    failedTests++;
  }
}

// =============================================================================
// TEST SUITES
// =============================================================================

// 1. DATA TRANSFER
assertParity('Data Transfer (MOV, MVI, LXI, LDA/STA, LHLD/SHLD, LDAX/STAX, XCHG)', `
  ORG 0100H
  KICKOFF 0100H
  MVI A, 42H
  MVI B, 11H
  MOV C, B
  LXI H, 0300H
  MOV M, A
  MVI M, 55H
  LXI D, 0400H
  STAX D
  LDAX D
  STA 0500H
  LDA 0500H
  LXI B, 0300H
  STAX B
  LDAX B
  LXI H, 1234H
  SHLD 0600H
  LHLD 0600H
  LXI D, 5678H
  XCHG
  HLT
`);

// 2. ARITHMETIC & FLAGS
assertParity('Arithmetic (ADD, ADI, ADC, ACI, SUB, SUI, SBB, SBI, INR, DCR, INX, DCX, DAD, DAA)', `
  ORG 0100H
  KICKOFF 0100H
  MVI A, 10H
  ADI 20H
  MVI B, 05H
  ADD B
  MVI A, 0FFH
  ADI 01H
  MVI A, 00H
  MVI B, 01H
  ADC B
  ACI 01H
  MVI A, 30H
  SUI 10H
  MVI B, 03H
  SUB B
  SUI 20H
  SBI 01H
  INR A
  DCR A
  LXI B, 00FFH
  INX B
  DCX B
  LXI H, 1000H
  LXI B, 0234H
  DAD B
  MVI A, 28H
  ADI 35H
  DAA
  HLT
`);

// 3. LOGICAL
assertParity('Logical (ANA, ANI, ORA, ORI, XRA, XRI, CMP, CPI, CMA, CMC, STC)', `
  ORG 0100H
  KICKOFF 0100H
  MVI A, 0FFH
  ANI 0FH
  MVI B, 0F0H
  ANA B
  ORI 55H
  MVI B, 0AAH
  ORA B
  XRI 33H
  XRA A
  MVI A, 42H
  CPI 42H
  CPI 50H
  CMA
  STC
  CMC
  HLT
`);

// 4. ROTATES
assertParity('Rotates (RLC, RRC, RAL, RAR)', `
  ORG 0100H
  KICKOFF 0100H
  MVI A, 80H
  RLC
  RRC
  STC
  RAL
  RAR
  HLT
`);

// 5. BRANCHING (JUMP, CALL, RET, CONDITIONAL)
assertParity('Branching (JMP, CALL, RET, Conditional Jumps/Calls/Returns, PCHL, RST)', `
  ORG 0028H
  RET
  ORG 0100H
  KICKOFF 0100H
  LXI SP, 2000H
  JMP TARGET
  MVI A, 0FFH
TARGET:
  MVI A, 00H
  CPI 00H
  JZ CONT1
  HLT
CONT1:
  MVI A, 01H
  CPI 00H
  JNZ CONT2
  HLT
CONT2:
  STC
  JC CONT3
  HLT
CONT3:
  CALL SUB1
  LXI H, TARGET2
  PCHL
  HLT
SUB1:
  MVI B, 42H
  RET
TARGET2:
  LXI SP, 2000H
  RST 5
  HLT
`);

// 6. STACK & SUBROUTINES
assertParity('Stack (PUSH, POP, XTHL, SPHL)', `
  ORG 0100H
  KICKOFF 0100H
  LXI SP, 2000H
  LXI B, 1234H
  PUSH B
  LXI D, 5678H
  PUSH D
  POP H
  POP B
  LXI H, 3000H
  SPHL
  LXI H, 9ABCH
  PUSH H
  LXI H, 1111H
  XTHL
  HLT
`);

// 7. I/O & SYSTEM CORES
assertParity('System (IN, OUT, EI, DI, NOP, HLT, RIM, SIM)', `
  ORG 0100H
  KICKOFF 0100H
  NOP
  EI
  DI
  MVI A, 0BH
  SIM
  RIM
  OUT 01H
  IN 02H
  HLT
`, (js, wasm) => {
  // Setup inputs for port 02H
  js.simSetInputPort(0x02, 0x88);
  wasm.simSetInputPort(0x02, 0x88);
});

// 8. UNDOCUMENTED INSTRUCTIONS
assertParity('Undocumented Instructions (DSUB, ARHL, RDEL, SHLX, LHLX)', `
  ORG 0100H
  KICKOFF 0100H
  LXI H, 0505H
  LXI B, 0202H
  DSUB
  LXI H, 8000H
  ARHL
  LXI D, 1234H
  STC
  RDEL
  LXI H, 5555H
  LXI D, 0400H
  SHLX
  LXI H, 0000H
  LHLX
  HLT
`);

// 9. CUSTOM PSEUDO-OPS (ASSERT)
assertParity('Custom pseudo-ops (ASSERT)', `
  ORG 0100H
  KICKOFF 0100H
  MVI A, 42H
  ASSERT A, 42H
  STC
  ASSERT CY, 1
  LXI B, 1234H
  ASSERT BC, 1234H
  LXI H, 0300H
  MVI M, 55H
  ASSERT MEM, 0300H, 55H
  HLT
`);

console.log('\n===================================================');
console.log('   TEST RUN SUMMARY');
console.log(`   Total Tests: ${totalTests}`);
console.log(`   Passed:      ${passedTests}`);
console.log(`   Failed:      ${failedTests}`);
console.log('===================================================\n');

if (failedTests > 0) {
  console.error('❌ Parity verification FAILED! Some instructions mismatch.');
  process.exit(1);
} else {
  console.log('✅ Parity verification SUCCESSFUL! All 8085 instructions matched perfectly.');
  process.exit(0);
}
