export const getOrderStatusColor = (status: string) => {
  const statusMap: Record<string, string> = {
    paid: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400',
    pending: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400',
    failed: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400',
    expired: 'bg-gray-50 dark:bg-gray-900/20 text-gray-700 dark:text-gray-400',
    refunded: 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400',
  };
  return statusMap[status] || statusMap.pending;
};

export const getStockBadge = (status: string, label: string) => {
  const styles = {
    good: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20',
    ok: 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20',
    low: 'text-primary bg-red-50 dark:bg-red-900/20',
    out: 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-white/10',
  };

  return (
    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${styles[status as keyof typeof styles]}`}>
      {label}
    </span>
  );
};

export const getStockBarColor = (status: string) => {
  const colors = {
    good: 'bg-green-500',
    ok: 'bg-yellow-400',
    low: 'bg-primary',
    out: 'bg-gray-300',
  };
  return colors[status as keyof typeof colors];
};

export const getTicketStatusBadge = (status: string, label: string) => {
  const styles = {
    entered: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800',
    not_yet: 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-white/10',
    invalid: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold border ${styles[status as keyof typeof styles]}`}>
      {status === 'invalid' ? (
        <span className="material-symbols-outlined text-[14px]">cancel</span>
      ) : (
        <span className="h-1.5 w-1.5 rounded-full bg-current"></span>
      )}
      {label}
    </span>
  );
};
