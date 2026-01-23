export type SnapResult = Record<string, unknown>;

declare global {
  interface Window {
    snap?: {
      pay: (
        token: string,
        options: {
          onSuccess?: (result: SnapResult) => void;
          onPending?: (result: SnapResult) => void;
          onError?: (result: SnapResult) => void;
          onClose?: () => void;
        }
      ) => void;
    };
  }
}

export function loadSnapScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.snap) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    const isProduction = import.meta.env.VITE_MIDTRANS_IS_PRODUCTION === 'true';
    const clientKey = import.meta.env.VITE_MIDTRANS_CLIENT_KEY;

    script.src = isProduction ? 'https://app.midtrans.com/snap/snap.js' : 'https://app.sandbox.midtrans.com/snap/snap.js';
    script.setAttribute('data-client-key', clientKey || '');
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Midtrans Snap'));
    document.head.appendChild(script);
  });
}

