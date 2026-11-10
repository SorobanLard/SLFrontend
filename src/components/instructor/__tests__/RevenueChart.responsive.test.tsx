// @vitest-environment jsdom
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RevenueChart } from '../RevenueChart';
import { RevenueDateRangePicker, rangeForPreset } from '../RevenueDateRangePicker';

describe('RevenueChart & RevenueDateRangePicker responsive layout (#194)', () => {
  it('wraps header controls cleanly and prevents horizontal overflow across mobile and tablet widths', () => {
    render(
      <RevenueChart
        data={[
          { month: 'Jan', revenue: 1200, date: '2026-01-01T00:00:00Z' },
          { month: 'Feb', revenue: 1850, date: '2026-02-01T00:00:00Z' },
        ]}
        rangeLabel="Jan 1, 2026 – Feb 28, 2026"
        exportFilename="revenue-2026"
      />
    );

    const container = screen.getByTestId('revenue-chart-container');
    expect(container.className).toContain('min-w-0');
    expect(container.className).toContain('overflow-hidden');

    const header = screen.getByTestId('revenue-chart-header');
    expect(header.className).toContain('flex-wrap');
    expect(screen.getByRole('button', { name: /Export CSV/i })).toBeInTheDocument();
  });

  it('constrains RevenueDateRangePicker buttons and custom popover within narrow/tablet viewports', () => {
    const onChange = vi.fn();
    render(
      <RevenueDateRangePicker
        value={rangeForPreset('6m')}
        onChange={onChange}
      />
    );

    const picker = screen.getByTestId('revenue-date-range-picker');
    expect(picker.className).toContain('flex-wrap');
    expect(picker.className).toContain('max-w-full');

    fireEvent.click(screen.getByRole('button', { name: /Custom/i }));
    const dialog = screen.getByRole('dialog', { name: /Select custom date range/i });
    expect(dialog.className).toContain('max-w-[calc(100vw-2rem)]');
  });
});
