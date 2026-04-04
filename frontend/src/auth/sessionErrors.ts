const FATAL_REFRESH_ERROR_MARKERS = [
  'refresh token not found',
  'invalid refresh token',
  'refresh token expired',
  'invalid_grant',
];

export const isNetworkIssue = (error: unknown) => {
  if (error && typeof error === 'object' && 'type' in error) {
    return (error as { type?: unknown }).type === 'network';
  }

  if (!(error instanceof Error)) return false;

  const message = error.message.toLowerCase();
  return message.includes('network') || message.includes('timeout') || message.includes('fetch');
};

export const isFatalRefreshError = (error: unknown) => {
  if (!(error instanceof Error) && (!error || typeof error !== 'object' || !('message' in error))) {
    return false;
  }

  const message = String((error as { message?: unknown }).message ?? '').toLowerCase();
  return FATAL_REFRESH_ERROR_MARKERS.some((marker) => message.includes(marker));
};
