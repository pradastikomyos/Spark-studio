import { describe, expect, it } from 'vitest';
import { getErrorName, mapScannerStartError } from './qrScannerErrors';

describe('qrScannerErrors', () => {
  it('extracts error names safely', () => {
    expect(getErrorName(new DOMException('Denied', 'NotAllowedError'))).toBe('NotAllowedError');
    expect(getErrorName('nope')).toBeUndefined();
  });

  it('maps iOS permission errors', () => {
    expect(
      mapScannerStartError({
        appleDevice: true,
        safariOnMac: false,
        fallbackError: new DOMException('Denied', 'NotAllowedError'),
      })
    ).toEqual({
      message: 'Izin kamera ditolak',
      details: 'Di iPhone/iPad: Buka Settings → Safari → Camera → Izinkan. Lalu kembali ke halaman ini dan klik "Coba Lagi".',
    });
  });

  it('maps Safari mac permission errors', () => {
    expect(
      mapScannerStartError({
        appleDevice: false,
        safariOnMac: true,
        fallbackError: new DOMException('Denied', 'NotAllowedError'),
      })
    ).toEqual({
      message: 'Izin kamera ditolak',
      details: 'Di Safari Mac: Klik Safari → Settings → Websites → Camera. Pilih "Allow" untuk situs ini, lalu klik "Coba Lagi".',
    });
  });

  it('maps camera availability errors', () => {
    expect(
      mapScannerStartError({
        appleDevice: false,
        safariOnMac: false,
        fallbackError: new DOMException('Missing', 'NotFoundError'),
      })
    ).toEqual({
      message: 'Kamera tidak ditemukan',
      details: 'Tidak ada kamera yang terdeteksi pada perangkat Anda.',
    });
  });

  it('maps generic fallback errors', () => {
    expect(
      mapScannerStartError({
        appleDevice: false,
        safariOnMac: false,
        fallbackError: new Error('Boom'),
      })
    ).toEqual({
      message: 'Gagal memulai pemindai',
      details: 'Terjadi kesalahan saat memulai pemindai. Coba refresh halaman atau gunakan browser lain.',
    });
  });
});
