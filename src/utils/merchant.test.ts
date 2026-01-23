import { describe, expect, it } from 'vitest';
import { bytesToMb, slugify } from './merchant';

describe('slugify', () => {
  it('creates lowercase kebab-case slugs', () => {
    expect(slugify('  Hello World  ')).toBe('hello-world');
  });

  it('removes quotes and collapses separators', () => {
    expect(slugify(`Spark's   Photo "Studio"`)).toBe('sparks-photo-studio');
  });
});

describe('bytesToMb', () => {
  it('converts bytes to megabytes', () => {
    expect(bytesToMb(1024 * 1024)).toBe(1);
  });
});
