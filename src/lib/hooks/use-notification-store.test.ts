import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { notificationsApi } from '@/lib/api/services';
import { MOCK_NOTIFICATIONS, useNotificationStore } from './use-notification-store';

vi.mock('@/lib/api/services', () => ({
  notificationsApi: {
    list: vi.fn(),
    markRead: vi.fn(),
    markAllRead: vi.fn(),
  },
}));

const unread = { ...MOCK_NOTIFICATIONS[0], read: false };
const alreadyRead = { ...MOCK_NOTIFICATIONS[2], read: true };

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(notificationsApi.list).mockResolvedValue({ data: [] } as never);
  vi.mocked(notificationsApi.markRead).mockResolvedValue(undefined as never);
  vi.mocked(notificationsApi.markAllRead).mockResolvedValue(undefined as never);
  useNotificationStore.setState({
    notifications: [],
    loading: false,
    fetched: false,
    error: null,
  });
});

describe('useNotificationStore', () => {
  it('starts empty, not loading, and not yet fetched', () => {
    const { result } = renderHook(() => useNotificationStore());
    expect(result.current.notifications).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.fetched).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('fetches a paginated API response and updates the hook state', async () => {
    vi.mocked(notificationsApi.list).mockResolvedValueOnce({
      data: [unread, alreadyRead],
    } as never);
    const { result } = renderHook(() => useNotificationStore());

    await act(async () => {
      await result.current.fetchNotifications();
    });

    expect(notificationsApi.list).toHaveBeenCalledOnce();
    expect(result.current.notifications).toEqual([unread, alreadyRead]);
    expect(result.current.loading).toBe(false);
    expect(result.current.fetched).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('supports an array response and an empty API payload', async () => {
    vi.mocked(notificationsApi.list)
      .mockResolvedValueOnce([unread] as never)
      .mockResolvedValueOnce({} as never);

    await useNotificationStore.getState().fetchNotifications();
    expect(useNotificationStore.getState().notifications).toEqual([unread]);

    await useNotificationStore.getState().fetchNotifications();
    expect(useNotificationStore.getState().notifications).toEqual([]);
    expect(useNotificationStore.getState().fetched).toBe(true);
  });

  it('sets loading immediately and prevents duplicate concurrent fetches', async () => {
    let resolveRequest!: (value: unknown) => void;
    const pending = new Promise((resolve) => {
      resolveRequest = resolve;
    });
    vi.mocked(notificationsApi.list).mockReturnValueOnce(pending as never);
    const { result } = renderHook(() => useNotificationStore());
    let firstFetch!: Promise<void>;

    act(() => {
      firstFetch = result.current.fetchNotifications();
    });
    expect(result.current.loading).toBe(true);
    expect(result.current.fetched).toBe(false);

    await act(async () => {
      await result.current.fetchNotifications();
    });
    expect(notificationsApi.list).toHaveBeenCalledOnce();

    await act(async () => {
      resolveRequest({ data: [unread] });
      await firstFetch;
    });
    expect(result.current.loading).toBe(false);
    expect(result.current.notifications).toEqual([unread]);
  });

  it('records API errors, clears stale notifications, and recovers on a later fetch', async () => {
    const failure = new Error('API unavailable');
    vi.mocked(notificationsApi.list)
      .mockResolvedValueOnce({ data: [unread] } as never)
      .mockRejectedValueOnce(failure)
      .mockResolvedValueOnce({ data: [alreadyRead] } as never);

    await useNotificationStore.getState().fetchNotifications();
    await useNotificationStore.getState().fetchNotifications();
    expect(useNotificationStore.getState()).toMatchObject({
      notifications: [],
      loading: false,
      fetched: true,
      error: failure,
    });

    await useNotificationStore.getState().fetchNotifications();
    expect(useNotificationStore.getState()).toMatchObject({
      notifications: [alreadyRead],
      error: null,
      loading: false,
    });
  });

  it('normalizes non-Error rejections to a useful Error object', async () => {
    vi.mocked(notificationsApi.list).mockRejectedValueOnce('offline');
    await useNotificationStore.getState().fetchNotifications();
    expect(useNotificationStore.getState().error).toBeInstanceOf(Error);
    expect(useNotificationStore.getState().error?.message)
      .toBe('Failed to load notifications');
    expect(useNotificationStore.getState().fetched).toBe(true);
  });

  it('optimistically marks only the matching notification as read', () => {
    useNotificationStore.setState({ notifications: [unread, alreadyRead] });
    const { result } = renderHook(() => useNotificationStore());

    act(() => {
      result.current.markRead(unread.id);
    });

    expect(notificationsApi.markRead).toHaveBeenCalledWith(unread.id);
    expect(result.current.notifications).toEqual([
      { ...unread, read: true },
      alreadyRead,
    ]);
  });

  it('leaves state unchanged for an unknown ID and tolerates API rejection', async () => {
    vi.mocked(notificationsApi.markRead).mockRejectedValueOnce(new Error('offline'));
    useNotificationStore.setState({ notifications: [unread] });

    act(() => {
      useNotificationStore.getState().markRead('not-a-notification');
    });
    await Promise.resolve();
    expect(notificationsApi.markRead).toHaveBeenCalledWith('not-a-notification');
    expect(useNotificationStore.getState().notifications).toEqual([unread]);
  });

  it('optimistically marks every notification as read, including on API failure', async () => {
    vi.mocked(notificationsApi.markAllRead).mockRejectedValueOnce(new Error('offline'));
    const { result } = renderHook(() => useNotificationStore());
    act(() => {
      useNotificationStore.setState({ notifications: [unread, alreadyRead] });
      result.current.markAllRead();
    });

    await Promise.resolve();
    expect(notificationsApi.markAllRead).toHaveBeenCalledOnce();
    expect(result.current.notifications).toEqual([
      { ...unread, read: true },
      alreadyRead,
    ]);
  });

  it('can reset its state between tests without calling any APIs', () => {
    useNotificationStore.setState({ notifications: [unread], fetched: true });
    useNotificationStore.setState({
      notifications: [],
      fetched: false,
      loading: false,
      error: null,
    });
    expect(useNotificationStore.getState().notifications).toEqual([]);
    expect(useNotificationStore.getState().fetched).toBe(false);
    expect(notificationsApi.list).not.toHaveBeenCalled();
  });
});
