export const METRIC_KEYS = {
  manualRefreshClick: 'manual_refresh_click_count',
  autoSyncSuccess: 'auto_sync_success_count',
  loadingTimeout: 'loading_timeout_count'
} as const;

type MetricKey = typeof METRIC_KEYS[keyof typeof METRIC_KEYS];

const getStorage = () => {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

export function incrementMetric(key: MetricKey, by = 1): number {
  const storage = getStorage();
  if (!storage) return 0;

  const currentRaw = storage.getItem(key);
  const current = currentRaw ? Number(currentRaw) : 0;
  const next = Number.isFinite(current) ? current + by : by;

  storage.setItem(key, String(next));
  console.info('[Metrics]', key, next);
  return next;
}

export function readMetric(key: MetricKey): number {
  const storage = getStorage();
  if (!storage) return 0;
  const currentRaw = storage.getItem(key);
  const current = currentRaw ? Number(currentRaw) : 0;
  return Number.isFinite(current) ? current : 0;
}
