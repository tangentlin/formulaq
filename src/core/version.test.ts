import { describe, it, expect } from 'vitest';
import { VERSION } from './index';

describe('formulaq/core', () => {
  it('exports VERSION', () => {
    expect(VERSION).toBe('0.1.0');
  });
});
