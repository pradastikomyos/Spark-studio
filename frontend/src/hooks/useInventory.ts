import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchInventoryQueryData, getInventoryQueryKey } from './inventory/inventoryData';
import type {
  CategoryRow,
  InventoryDiagnostics,
  InventoryQueryData,
  ProductImageRow,
  ProductRow,
  UseInventoryParams,
} from './inventory/inventoryTypes';
import { clearInventoryFallbackCache, useInventoryRealtimeInvalidation } from './inventory/useInventoryRealtimeInvalidation';

export type { CategoryRow, InventoryDiagnostics, InventoryQueryData, ProductImageRow, ProductRow, UseInventoryParams };
export { clearInventoryFallbackCache };

export function useInventory(params: UseInventoryParams) {
  const queryClient = useQueryClient();
  useInventoryRealtimeInvalidation(queryClient);

  return useQuery({
    queryKey: getInventoryQueryKey(params),
    queryFn: ({ signal }) => fetchInventoryQueryData(params, signal),
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    staleTime: 30000,
  });
}
