// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { useRef } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { useFocusTrap } from './use-focus-trap';

function createContainer() {
  const container = document.createElement('div');
  const first = document.createElement('button');
  first.textContent = 'first';
  const middle = document.createElement('button');
  middle.textContent = 'middle';
  const last = document.createElement('button');
  last.textContent = 'last';
  container.append(first, middle, last);
  document.body.appendChild(container);
  return { container, first, middle, last };
}

describe('useFocusTrap', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('does not move focus when inactive', () => {
    const { container, first } = createContainer();
    const outside = document.createElement('button');
    document.body.appendChild(outside);
    outside.focus();

    renderHook(() => {
      const ref = useRef<HTMLDivElement>(container);
      useFocusTrap(ref, false);
      return ref;
    });

    expect(document.activeElement).toBe(outside);
    expect(document.activeElement).not.toBe(first);
  });

  it('focuses the first focusable element when activated', () => {
    const { container, first } = createContainer();

    renderHook(() => {
      const ref = useRef<HTMLDivElement>(container);
      useFocusTrap(ref, true);
      return ref;
    });

    expect(document.activeElement).toBe(first);
  });

  it('wraps focus from the last element to the first on Tab', () => {
    const { container, first, last } = createContainer();

    renderHook(() => {
      const ref = useRef<HTMLDivElement>(container);
      useFocusTrap(ref, true);
      return ref;
    });

    last.focus();
    act(() => {
      const event = new KeyboardEvent('keydown', {
        key: 'Tab',
        bubbles: true,
        cancelable: true,
      });
      document.dispatchEvent(event);
    });

    expect(document.activeElement).toBe(first);
  });

  it('wraps focus from the first element to the last on Shift+Tab', () => {
    const { container, first, last } = createContainer();

    renderHook(() => {
      const ref = useRef<HTMLDivElement>(container);
      useFocusTrap(ref, true);
      return ref;
    });

    first.focus();
    act(() => {
      const event = new KeyboardEvent('keydown', {
        key: 'Tab',
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      });
      document.dispatchEvent(event);
    });

    expect(document.activeElement).toBe(last);
  });

  it('handles an empty container without throwing', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    expect(() => {
      renderHook(() => {
        const ref = useRef<HTMLDivElement>(container);
        useFocusTrap(ref, true);
        return ref;
      });
    }).not.toThrow();
  });

  it('restores focus to the previously focused element on deactivate', () => {
    const { container } = createContainer();
    const outside = document.createElement('button');
    document.body.appendChild(outside);
    outside.focus();

    const { rerender } = renderHook(
      ({ active }: { active: boolean }) => {
        const ref = useRef<HTMLDivElement>(container);
        useFocusTrap(ref, active);
        return ref;
      },
      { initialProps: { active: true } },
    );

    expect(document.activeElement).not.toBe(outside);

    rerender({ active: false });

    expect(document.activeElement).toBe(outside);
  });
});
