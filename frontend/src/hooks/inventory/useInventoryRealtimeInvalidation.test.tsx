import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { queryKeys } from '../../lib/queryKeys';
import { useInventoryRealtimeInvalidation } from './useInventoryRealtimeInvalidation';

const channelMock = {
  on: vi.fn(),
  subscribe: vi.fn(),
};
const removeChannelMock = vi.fn();
const channelFactoryMock = vi.fn();
const realtimeCallbacks: Array<() => void> = [];

vi.mock('../../lib/supabase', () => ({
  supabase: {
    channel: (...args: unknown[]) => channelFactoryMock(...args),
    removeChannel: (...args: unknown[]) => removeChannelMock(...args),
  },
}));

describe('useInventoryRealtimeInvalidation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    realtimeCallbacks.length = 0;
    removeChannelMock.mockReset();
    channelFactoryMock.mockReset();
    channelMock.on.mockReset();
    channelMock.subscribe.mockReset();

    channelMock.on.mockImplementation((_, __, callback: () => void) => {
      realtimeCallbacks.push(callback);
      return channelMock;
    });
    channelMock.subscribe.mockReturnValue(channelMock);
    channelFactoryMock.mockReturnValue(channelMock);
  });

  it('debounces realtime invalidation and unsubscribes on cleanup', () => {
    const queryClient = {
      invalidateQueries: vi.fn(() => Promise.resolve()),
    };

    const { unmount } = renderHook(() => useInventoryRealtimeInvalidation(queryClient));

    expect(channelFactoryMock).toHaveBeenCalledWith('inventory_changes');
    expect(realtimeCallbacks.length).toBe(4);

    act(() => {
      realtimeCallbacks[0]?.();
      realtimeCallbacks[1]?.();
      vi.advanceTimersByTime(699);
    });

    expect(queryClient.invalidateQueries).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(queryClient.invalidateQueries).toHaveBeenCalledTimes(1);
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: queryKeys.inventory() });

    unmount();

    expect(removeChannelMock).toHaveBeenCalledWith(channelMock);
    vi.useRealTimers();
  });
});
