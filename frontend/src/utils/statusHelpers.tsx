export const getOrderStatusColor = (status: string) => {
  const statusMap: Record<string, string> = {
    paid: 'bg-green-50 text-green-700',
    pending: 'bg-yellow-50 text-yellow-700',
    failed: 'bg-red-50 text-red-700',
    expired: 'bg-gray-50 text-gray-700',
    refunded: 'bg-purple-50 text-purple-700',
  };
  return statusMap[status] || statusMap.pending;
};

export const getStockBadge = (status: string, label: string) => {
  const styles = {
    good: 'text-green-600 bg-green-50',
    ok: 'text-yellow-600 bg-yellow-50',
    low: 'text-primary bg-red-50',
    out: 'text-gray-600 bg-gray-100',
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
    entered: 'bg-green-50 text-green-700 border-green-200',
    not_yet: 'bg-gray-100 text-gray-600 border-gray-200',
    invalid: 'bg-red-50 text-red-700 border-red-200',
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
