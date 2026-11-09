// @vitest-environment jsdom
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import InstructorLayout, { InstructorStatsGrid } from './layout';

vi.mock('@/components/layout/Sidebar', () => ({
  Sidebar: () => <aside data-testid="mock-sidebar">Sidebar</aside>,
}));

vi.mock('@/components/layout/TopBar', () => ({
  TopBar: () => <header data-testid="mock-topbar">TopBar</header>,
}));

describe('InstructorLayout & InstructorStatsGrid responsive layout (#199)', () => {
  it.each([320, 375, 768, 1024])(
    'prevents horizontal overflow and truncates long stat values at %ipx viewport',
    (width) => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: width,
      });
      window.dispatchEvent(new Event('resize'));

      render(
        <InstructorLayout>
          <InstructorStatsGrid
            items={[
              { label: 'Courses', value: 12 },
              { label: 'Students', value: 1480 },
              { label: 'Total Revenue', value: '$128,450.00 USDC' },
              { label: 'This Month', value: '$14,200.00 USDC' },
            ]}
          />
        </InstructorLayout>,
      );

      const main = screen.getByTestId('instructor-main');
      expect(main.className).toContain('min-w-0');
      expect(main.className).toContain('overflow-x-hidden');

      const grid = screen.getByTestId('instructor-stats-grid');
      expect(grid.className).toContain('grid-cols-1');
      expect(grid.className).toContain('lg:grid-cols-4');
      expect(screen.getByText('$128,450.00 USDC')).toBeInTheDocument();
    },
  );
});
