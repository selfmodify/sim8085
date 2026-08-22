import * as sim from './sim8085Bridge.js';

let running = false;
let stopRequested = false;
let bpMap = new Map();
let jsDBP = new Set();
let jsDataWatchHit = -1;
const throughput = { steps: 0, ms: 0, mhz: 0, pendingSteps: 0 };
let lastUiMs = 0;
let wasHaltWaiting = false;

// ── State snapshot helpers ────────────────────────────────────────────────────
function snapState() {
  const regs = sim.simGetRegisters();
  const leds = sim.simGetAllLeds();
  const cycles = sim.simGetCycles();
  const consoleOutput = sim.simGetConsoleOutput();
  const intState = sim.simGetIntState();
  const sod = sim.simGetSOD ? sim.simGetSOD() : 0;
  const outputPorts = sim.simGetOutputPorts();
  const keyQueue = sim.simGetKeyQueue();
  return { regs, leds, cycles, consoleOutput, intState, sod, outputPorts, keyQueue };
}

function captureRam() {
  return sim.simGetFullMemory();
}

// ── Conditional breakpoint evaluator (mirrors App.jsx evalCondition) ───────────
function evalCond(cond, r) {
  if (!cond) return true;
  try {
    const expr = cond.replace(/\{(\w+)\}/gi, (_, n) => r[n.toLowerCase()] ?? 0);
    return !!(new Function('return (' + expr + ')'))(); // eslint-disable-line no-new-func
  } catch { return true; }
}

// ── Tick scheduler — MessageChannel gives near-zero overhead vs setTimeout ────
const tickChannel = new MessageChannel();
tickChannel.port1.onmessage = () => warpTick();
function scheduleTick() { tickChannel.port2.postMessage(null); }

// ── Warp execution loop ───────────────────────────────────────────────────────
function warpTick() {
  if (!running) return;

  // Run at full speed for up to 100 ms per tick
  let n = 0;
  const t0 = performance.now();
  while (performance.now() - t0 < 100) {
    const chunk = sim.simRun(2000000);
    n += chunk;
    if (chunk < 2000000) break;   // sim stopped early
    if (stopRequested) break;
  }
  const execMs = performance.now() - t0;

  throughput.steps += n;
  throughput.ms    += execMs;
  throughput.pendingSteps += n;
  if (throughput.ms >= 250) {
    throughput.mhz   = throughput.steps / throughput.ms / 1000;
    throughput.steps = throughput.ms = 0;
  }

  const now = performance.now();
  const isHaltWaiting = sim.simIsHaltWaiting();
  const doUi = (now - lastUiMs >= 1000) || (isHaltWaiting && !wasHaltWaiting);

  if (doUi) {
    const st = snapState();
    const ps = throughput.pendingSteps; throughput.pendingSteps = 0;
    self.postMessage({
      type: 'stateUpdate', pendingSteps: ps, mhz: throughput.mhz,
      regs: st.regs, leds: st.leds, cycles: st.cycles,
      consoleOutput: st.consoleOutput, intState: st.intState,
      sod: st.sod, outputPorts: st.outputPorts, keyQueue: st.keyQueue,
    });
    lastUiMs = now;
  }
  wasHaltWaiting = isHaltWaiting;

  // ── User requested stop ───────────────────────────────────────────────────
  if (stopRequested) {
    running = false;
    const st  = snapState();
    const ram = captureRam();
    self.postMessage({
      type: 'stopped', reason: 'stopped', atBp: false, watchHit: -1,
      isHalted: false, errorMsg: '',
      regs: st.regs, leds: st.leds, cycles: st.cycles, ram,
      consoleOutput: st.consoleOutput, intState: st.intState,
      sod: st.sod, outputPorts: st.outputPorts, keyQueue: st.keyQueue,
    }, [ram.buffer]);
    return;
  }

  // ── HLT waiting for interrupt ─────────────────────────────────────────────
  if (isHaltWaiting) {
    self.postMessage({ type: 'haltWaiting' });
    setTimeout(warpTick, 16);
    return;
  }

  // ── Check for natural termination or breakpoint ───────────────────────────
  const r = sim.simGetRegisters();
  const atBp = bpMap.has(r.pc);
  const watchHit = sim.simGetDataWatchHit ? sim.simGetDataWatchHit() : -1;

  if (!sim.simIsRunning() || atBp || watchHit >= 0) {
    // Conditional breakpoint — skip if condition not met
    if (atBp && watchHit < 0) {
      const cond = bpMap.get(r.pc);
      if (cond != null && !evalCond(cond, r)) {
        sim.simStep();
        scheduleTick();
        return;
      }
    }

    running = false;
    const isHalted = sim.simIsHalted();
    const errorMsg = isHalted ? '' : sim.simGetError();
    const reason = watchHit >= 0 ? 'watchpoint' : atBp ? 'breakpoint' : isHalted ? 'halted' : 'error';
    const st  = snapState();
    const ram = captureRam();
    self.postMessage({
      type: 'stopped', reason, atBp, watchHit, isHalted, errorMsg,
      regs: st.regs, leds: st.leds, cycles: st.cycles, ram,
      consoleOutput: st.consoleOutput, intState: st.intState,
      sod: st.sod, outputPorts: st.outputPorts, keyQueue: st.keyQueue,
    }, [ram.buffer]);
    return;
  }

  // Yield to process any pending messages, then continue immediately
  scheduleTick();
}

// ── Restore CPU state from a main-thread snapshot ─────────────────────────────
function initFromSnap(snap) {
  if (snap.memSize) sim.simSetMemorySize(snap.memSize);

  // Restore RAM and registers
  sim.simRestoreSnapshot({ regs: snap.regs, ram: snap.ram });

  // Breakpoints
  sim.simClearAllBreakpoints();
  for (const [addr] of snap.breakpoints) sim.simSetBreakpoint(addr);

  // Data Breakpoints
  if (snap.dataBps && sim.simSetDataBreakpoint) {
    if (sim.simClearAllDataBreakpoints) sim.simClearAllDataBreakpoints();
    for (const addr of snap.dataBps) sim.simSetDataBreakpoint(addr);
  }

  // Input ports
  if (snap.inputPorts) {
    for (let i = 0; i < snap.inputPorts.length; i++) {
      if (snap.inputPorts[i]) sim.simSetInputPort(i, snap.inputPorts[i]);
    }
  }

  // Console port & key queue
  sim.simSetConsolePort(snap.consolePort & 0xFF);
  sim.simClearConsoleOutput();
  sim.simClearKeyQueue();
  sim.simEnqueueKeys(snap.keyQueue);
}

// ── Message handler ───────────────────────────────────────────────────────────
self.onmessage = function handle({ data: d }) {
  switch (d.cmd) {
    case 'startWarp':
      bpMap = new Map(d.snap.breakpoints);
      sim.simInit();
      initFromSnap(d.snap);
      running = true;
      stopRequested = false;
      throughput.steps = throughput.ms = throughput.mhz = throughput.pendingSteps = 0;
      lastUiMs = 0;
      wasHaltWaiting = false;
      scheduleTick();
      break;

    case 'stop':
      stopRequested = true;
      break;

    case 'assertInterrupt':
      sim.simAssertInterrupt(d.intType);
      break;

    case 'deassertInterrupt':
      sim.simDeassertInterrupt(d.intType);
      break;

    case 'enqueueKeys':
      sim.simEnqueueKeys(d.keys);
      break;

    case 'setInputPort':
      sim.simSetInputPort(d.port, d.val);
      break;
  }
};

