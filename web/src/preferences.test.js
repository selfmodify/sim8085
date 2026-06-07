import { beforeEach, describe, expect, it } from 'vitest';

import { getAutoStopHltDefault } from './preferences.js';

describe('auto-stop on HLT preference', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('defaults to enabled when the preference is not stored yet', () => {
    expect(getAutoStopHltDefault()).toBe(true);
  });

  it('respects an explicit false value', () => {
    localStorage.setItem('sim8085_autostop_hlt', 'false');

    expect(getAutoStopHltDefault()).toBe(false);
  });
});
