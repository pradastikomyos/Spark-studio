export const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export const getInitials = (name: string) => {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

export const formatCurrency = (amount: number | string) => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  return `IDR ${numAmount.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

/**
 * Converts a Date object to a YYYY-MM-DD string using LOCAL timezone.
 * 
 * IMPORTANT: Do NOT use date.toISOString().split('T')[0] for date comparisons!
 * toISOString() converts to UTC first, which can shift the date by ±1 day
 * depending on the user's timezone.
 * 
 * Example of the bug:
 * - User in WIB (UTC+7) selects Jan 20, 2026 at midnight local time
 * - toISOString() converts to UTC: 2026-01-19T17:00:00.000Z
 * - split('T')[0] returns "2026-01-19" (wrong date!)
 * 
 * This function correctly returns "2026-01-20" for the above case.
 */
export const toLocalDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
