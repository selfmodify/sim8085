import { useRef, useCallback } from 'react';

export function useObjectPool(factory, reset, initialSize = 10) {
  const poolRef = useRef([]);
  const factoryRef = useRef(factory);
  const resetRef = useRef(reset);

  const initialize = useCallback(() => {
    for (let i = 0; i < initialSize; i++) {
      poolRef.current.push(factoryRef.current());
    }
  }, [initialSize]);

  const acquire = useCallback(() => {
    if (poolRef.current.length === 0) {
      return factoryRef.current();
    }
    return poolRef.current.pop();
  }, []);

  const release = useCallback((obj) => {
    if (obj) {
      resetRef.current(obj);
      poolRef.current.push(obj);
    }
  }, []);

  const getStats = useCallback(() => ({
    poolSize: poolRef.current.length,
    initialSize
  }), [initialSize]);

  return { acquire, release, initialize, getStats };
}

export class RegisterPool {
  static create() {
    return {
      a: 0, b: 0, c: 0, d: 0, e: 0, h: 0, l: 0,
      flags: 0, pc: 0, sp: 0,
      flagS: 0, flagZ: 0, flagAC: 0, flagP: 0, flagCY: 0,
      halted: false, hasError: false
    };
  }

  static reset(reg) {
    reg.a = reg.b = reg.c = reg.d = reg.e = reg.h = reg.l = 0;
    reg.flags = reg.pc = reg.sp = 0;
    reg.flagS = reg.flagZ = reg.flagAC = reg.flagP = reg.flagCY = 0;
    reg.halted = reg.hasError = false;
    return reg;
  }

  static copy(source, target) {
    target.a = source.a;
    target.b = source.b;
    target.c = source.c;
    target.d = source.d;
    target.e = source.e;
    target.h = source.h;
    target.l = source.l;
    target.flags = source.flags;
    target.pc = source.pc;
    target.sp = source.sp;
    target.flagS = source.flagS;
    target.flagZ = source.flagZ;
    target.flagAC = source.flagAC;
    target.flagP = source.flagP;
    target.flagCY = source.flagCY;
    target.halted = source.halted;
    target.hasError = source.hasError;
    return target;
  }
}

export class MemoryBufferPool {
  static create(size = 128) {
    return new Uint8Array(size);
  }

  static reset(buffer) {
    buffer.fill(0);
    return buffer;
  }
}
