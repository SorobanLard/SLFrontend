import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { downloadCsv } from '@/lib/utils/csv';
import { RevenueChart } from './RevenueChart';

const { mockDownloadCsv } = vi.hoisted(() => ({
  mockDownloadCsv: vi.fn(),
}));

vi.mock('next/dynamic', () => ({
  default: () =>
    function MockRevenueBarChart({
      data,
      height,
    }: {
      data: Array<{ month: string }>;
      height: number;
    }) {
      return (
        <div data-testid="revenue-bar-chart" data-height={height}>
          {data.map(({ month }) => month).join(', ')}
        </div>
      );
    },
}));

vi.mock('recharts', () => ({}));

vi.mock('@/lib/utils/csv', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/utils/csv')>();
  return { ...actual, downloadCsv: mockDownloadCsv };
});

const revenueData = [
  { month: 'February', revenue: 200.25, date: '2025-02-01T12:00:00' },
  { month: 'January', revenue: 100.5, date: '2025-01-01T12:00:00' },
];

describe('RevenueChart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the chart with default height and chronological data', () => {
    render(<RevenueChart data={revenueData} />);

    expect(screen.getByTestId('revenue-bar-chart')).toHaveAttribute(
      'data-height',
      '300',
    );
    expect(screen.getByTestId('revenue-bar-chart')).toHaveTextContent(
      'January, February',
    );
    expect(
      screen.queryByRole('button', { name: /export csv/i }),
    ).not.toBeInTheDocument();
  });

  it('uses a custom height and displays the range label', () => {
    render(
      <RevenueChart
        data={revenueData}
        height={420}
        rangeLabel="January to February 2025"
      />,
    );

    expect(screen.getByText('January to February 2025')).toBeInTheDocument();
    expect(screen.getByTestId('revenue-bar-chart')).toHaveAttribute(
      'data-height',
      '420',
    );
  });

  it('shows a loading skeleton at the requested height', () => {
    const { container } = render(
      <RevenueChart data={revenueData} isLoading height={240} />,
    );

    expect(container.firstElementChild).toHaveStyle({ height: '240px' });
    expect(container.firstElementChild).toHaveClass('animate-pulse');
    expect(screen.queryByTestId('revenue-bar-chart')).not.toBeInTheDocument();
  });

  it('shows the empty state at the requested height', () => {
    const { container } = render(<RevenueChart data={[]} height={180} />);

    expect(
      screen.getByText('No revenue data available for the selected period'),
    ).toBeInTheDocument();
    expect(container.firstElementChild).toHaveStyle({ height: '180px' });
    expect(screen.queryByTestId('revenue-bar-chart')).not.toBeInTheDocument();
  });

  it('exports chronologically sorted data and the total as CSV', async () => {
    const user = userEvent.setup();
    render(
      <RevenueChart
        data={revenueData}
        rangeLabel="January to February 2025"
        exportFilename="instructor-revenue"
      />,
    );

    await user.click(screen.getByRole('button', { name: /export csv/i }));

    expect(downloadCsv).toHaveBeenCalledWith(
      'instructor-revenue.csv',
      'Month,Period Start,Revenue (USDC)\r\nJanuary,2025-01-01,100.50\r\nFebruary,2025-02-01,200.25\r\nTotal,,300.75',
    );
  });

  it('does not export when the chart has no data', () => {
    render(<RevenueChart data={[]} />);

    expect(
      screen.queryByRole('button', { name: /export csv/i }),
    ).not.toBeInTheDocument();
    expect(downloadCsv).not.toHaveBeenCalled();
  });
});
