// @vitest-environment jsdom
import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FilterSidebar } from '../FilterSidebar';

const baseProps = {
  open: true,
  onClose: vi.fn(),
  categories: [{ name: 'Tailoring', count: 12 }],
  activeCategory: '',
  activeLevel: '',
  activePrice: '',
  onCategory: vi.fn(),
  onLevel: vi.fn(),
  onPrice: vi.fn(),
  onClearAll: vi.fn(),
};

describe('FilterSidebar vs FilterDrawer breakpoint handoff (#195)', () => {
  it('constrains mobile drawer width at 320px/375px and hides desktop sidebar below lg breakpoint', () => {
    render(<FilterSidebar {...baseProps} />);

    const desktopSidebar = screen.getByTestId('filter-sidebar-desktop');
    expect(desktopSidebar.className).toContain('hidden');
    expect(desktopSidebar.className).toContain('lg:block');

    const drawerOverlay = screen.getByTestId('filter-drawer-overlay');
    expect(drawerOverlay.className).toContain('lg:hidden');

    const drawerPanel = screen.getByTestId('filter-drawer-panel');
    expect(drawerPanel).toHaveAttribute('role', 'dialog');
    expect(drawerPanel.className).toContain('max-w-[calc(100vw-3rem)]');
  });

  it('automatically closes open mobile drawer when viewport crosses lg (1024px) breakpoint', () => {
    const onClose = vi.fn();
    render(<FilterSidebar {...baseProps} onClose={onClose} />);

    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
