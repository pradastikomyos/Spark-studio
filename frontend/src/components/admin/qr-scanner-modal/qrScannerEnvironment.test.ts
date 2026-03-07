import { afterEach, describe, expect, it } from 'vitest';
import { calculateResponsiveQrBox, isIOS, isSafari } from './qrScannerEnvironment';

const originalUserAgent = navigator.userAgent;
const originalMaxTouchPoints = navigator.maxTouchPoints;

const setNavigator = (userAgent: string, maxTouchPoints = 0) => {
  Object.defineProperty(window.navigator, 'userAgent', { configurable: true, value: userAgent });
  Object.defineProperty(window.navigator, 'maxTouchPoints', { configurable: true, value: maxTouchPoints });
};

afterEach(() => {
  setNavigator(originalUserAgent, originalMaxTouchPoints);
});

describe('qrScannerEnvironment', () => {
  it('detects iOS and iPadOS user agents', () => {
    setNavigator('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1');
    expect(isIOS()).toBe(true);

    setNavigator('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15', 5);
    expect(isIOS()).toBe(true);
  });

  it('detects Safari without matching Chrome', () => {
    setNavigator('Mozilla/5.0 (Macintosh; Intel Mac OS X) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15');
    expect(isSafari()).toBe(true);

    setNavigator('Mozilla/5.0 Chrome/122.0 Safari/537.36');
    expect(isSafari()).toBe(false);
  });

  it('returns a smaller qr box on iOS', () => {
    setNavigator('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1');
    expect(calculateResponsiveQrBox(300)).toEqual({ width: 180, height: 180 });

    setNavigator('Mozilla/5.0 Chrome/122.0 Safari/537.36');
    expect(calculateResponsiveQrBox(300)).toEqual({ width: 210, height: 210 });
  });
});
