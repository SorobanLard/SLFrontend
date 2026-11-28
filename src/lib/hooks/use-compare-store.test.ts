// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useCompareStore } from './use-compare-store';

describe('useCompareStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useCompareStore.setState({ items: [] });
  });

  it('starts with an empty compare list', () => {
    const { result } = renderHook(() => useCompareStore());

    expect(result.current.items).toEqual([]);
  });

  it('adds an item to the compare list', () => {
    const { result } = renderHook(() => useCompareStore());

    act(() => {
      result.current.addItem('product-1');
    });

    expect(result.current.items).toEqual(['product-1']);
  });

  it('does not add duplicate items', () => {
    const { result } = renderHook(() => useCompareStore());

    act(() => {
      result.current.addItem('product-1');
      result.current.addItem('product-1');
    });

    expect(result.current.items).toEqual(['product-1']);
  });

  it('removes an item from the compare list', () => {
    const { result } = renderHook(() => useCompareStore());

    act(() => {
      result.current.addItem('product-1');
      result.current.addItem('product-2');
      result.current.removeItem('product-1');
    });

    expect(result.current.items).toEqual(['product-2']);
  });

  it('toggles an item in and out of the compare list', () => {
    const { result } = renderHook(() => useCompareStore());

    act(() => {
      result.current.toggleItem('product-1');
    });
    expect(result.current.items).toEqual(['product-1']);

    act(() => {
      result.current.toggleItem('product-1');
    });
    expect(result.current.items).toEqual([]);
  });

  it('clears the compare list', () => {
    const { result } = renderHook(() => useCompareStore());

    act(() => {
      result.current.addItem('product-1');
      result.current.addItem('product-2');
      result.current.clear();
    });

    expect(result.current.items).toEqual([]);
  });

  it('ignores empty input when adding an item', () => {
    const { result } = renderHook(() => useCompareStore());

    act(() => {
      result.current.addItem('');
    });

    expect(result.current.items).toEqual([]);
  });
});
