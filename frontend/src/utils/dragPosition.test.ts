import { describe, it, expect } from 'vitest';
import { clampPercent, clientPointToPercent } from './dragPosition';

describe('dragPosition', () => {
  it('clampPercent clamps to 0..100', () => {
    expect(clampPercent(-1)).toBe(0);
    expect(clampPercent(0)).toBe(0);
    expect(clampPercent(12.5)).toBe(12.5);
    expect(clampPercent(100)).toBe(100);
    expect(clampPercent(101)).toBe(100);
  });

  it('clientPointToPercent converts client point to percent in rect', () => {
    const rect = { left: 10, top: 20, width: 200, height: 100 };
    expect(clientPointToPercent(rect, 10, 20)).toEqual({ xPct: 0, yPct: 0 });
    expect(clientPointToPercent(rect, 210, 120)).toEqual({ xPct: 100, yPct: 100 });
    expect(clientPointToPercent(rect, 110, 70)).toEqual({ xPct: 50, yPct: 50 });
  });

  it('clientPointToPercent clamps out of bounds', () => {
    const rect = { left: 0, top: 0, width: 100, height: 100 };
    expect(clientPointToPercent(rect, -50, 10)).toEqual({ xPct: 0, yPct: 10 });
    expect(clientPointToPercent(rect, 50, 500)).toEqual({ xPct: 50, yPct: 100 });
  });
});

