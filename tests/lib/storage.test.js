import { describe, it, expect } from 'vitest';
import { createStorage, memoryBackend } from '../../src/ui/storage.js';

describe('createStorage', () => {
  it('round-trips JSON and returns the fallback for missing keys', () => {
    const s = createStorage(memoryBackend());
    expect(s.get('k', 7)).toBe(7);
    expect(s.set('k', { a: [1] })).toBe(true);
    expect(s.get('k')).toEqual({ a: [1] });
    s.remove('k');
    expect(s.get('k', null)).toBeNull();
  });

  it('never throws: bad JSON reads as the fallback, failed writes return false', () => {
    const broken = { getItem: () => '{nope', setItem: () => { throw new Error('quota'); }, removeItem: () => { throw new Error('x'); } };
    const s = createStorage(broken);
    expect(s.get('k', 'fb')).toBe('fb');
    expect(s.set('k', 1)).toBe(false);
    expect(() => s.remove('k')).not.toThrow();
  });
});
