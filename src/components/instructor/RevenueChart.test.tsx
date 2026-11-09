// @vitest-environment jsdom
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RevenueChart } from './RevenueChart';
import { RevenueDateRangePicker, rangeForPreset } from './RevenueDateRangePicker';

vi.mock('next/dynamic', () => ({
  default: () => {
    return function MockRevenueBarChart() {
      return <div data-testid="mock-revenue-bar-chart" />;
    };
  },
}));

describe('RevenueChart & RevenueDateRangePicker responsive layout (#194)', () => {
  const sampleData = [
    { month: 'Jan', revenue: 1200, date: '2026-01-01T00:00:00Z' },
    { month: 'Feb', revenue: 2450, date: '2026-02-01T00:00:00Z' },
  ];

  it.each([320, 375, 768, 1024])(
    'renders RevenueChart and RevenueDateRangePicker without overflow at %ipx width',
    (width) => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: width,
      });
      window.dispatchEvent(new Event('resize'));

      const onChange = vi.fn();
      render(
        <div>
          <RevenueDateRangePicker value={rangeForPreset('6m')} onChange={onChange} />
          <RevenueChart
            data={sampleData}
            rangeLabel="Oct 1, 2025 – Mar 31, 2026"
            exportFilename="revenue-test"
          />
        </div>,
      );

      const chartContainer = screen.getByTestId('revenue-chart-container');
      expect(chartContainer.className).toContain('min-w-0');
      expect(chartContainer.className).toContain('overflow-hidden');

      const toolbar = screen.getByTestId('revenue-chart-toolbar');
      expect(toolbar.className).toContain('flex-wrap');
      expect(screen.getByRole('button', { name: /export csv/i })).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /custom/i }));
      const dialog = screen.getByRole('dialog', { name: /select custom date range/i });
      expect(dialog.className).toContain('w-[min(18rem,calc(100vw-2rem))]');
    },
  );
});
