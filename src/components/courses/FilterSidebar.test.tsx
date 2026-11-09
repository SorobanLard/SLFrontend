// @vitest-environment jsdom
import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FilterSidebar } from './FilterSidebar';

const baseProps = {
  open: false,
  onClose: vi.fn(),
  categories: [
    { name: 'Tailoring', count: 8 },
    { name: 'Makeup Artistry & Styling', count: 14 },
  ],
  activeCategory: '',
  activeLevel: '',
  activePrice: '',
  onCategory: vi.fn(),
  onLevel: vi.fn(),
  onPrice: vi.fn(),
  onClearAll: vi.fn(),
};

describe('FilterSidebar vs FilterDrawer breakpoint handoff (#195)', () => {
  it.each([320, 375, 768, 1024])(
    'maintains a clean lg breakpoint handoff between desktop sidebar and mobile/tablet drawer at %ipx',
    (width) => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: width,
      });
      window.dispatchEvent(new Event('resize'));

      const onClose = vi.fn();
      render(<FilterSidebar {...baseProps} open={true} onClose={onClose} />);

      const desktopSidebar = screen.getByTestId('filter-sidebar-desktop');
      const mobileDrawer = screen.getByTestId('filter-drawer');

      expect(desktopSidebar.className).toContain('hidden');
      expect(desktopSidebar.className).toContain('lg:block');
      expect(mobileDrawer.className).toContain('lg:hidden');

      const drawerCloseBtn = within(mobileDrawer).getByRole('button', {
        name: /close filters/i,
      });
      fireEvent.click(drawerCloseBtn);
      expect(onClose).toHaveBeenCalledTimes(1);
    },
  );
});
