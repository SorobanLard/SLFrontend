'use client';

import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import type { TooltipProps } from 'recharts';
import { Download } from 'lucide-react';
import { format } from 'date-fns';
import { formatUsdc } from '@/lib/utils';
import { downloadCsv, toCsv } from '@/lib/utils/csv';

interface RevenueData {
  month: string;
  revenue: number;
  date: string;
}

interface RevenueChartProps {
  data: RevenueData[];
  isLoading?: boolean;
  height?: number;
  rangeLabel?: string;
  exportFilename?: string;
}

function CustomTooltip(props: TooltipProps<number, string>) {
  const { active, payload } = props;

  if (!active || !payload || !payload.length) {
    return null;
  }

  const data = payload[0].payload as RevenueData;

  return (
    <div className="bg-semantic-bg-surface rounded-lg shadow-lg border border-semantic-border p-3">
      <p className="text-sm font-semibold text-semantic-text-body">{data.month}</p>
      <p className="text-base font-bold" style={{ color: 'var(--color-text-link)' }}>
        {formatUsdc(data.revenue)}
      </p>
    </div>
  );
}

function ChartSkeleton({ height = 300 }: { height: number }) {
  return (
    <div
      data-testid="revenue-chart-skeleton"
      style={{ height }}
      className="flex items-end justify-between gap-2 bg-semantic-bg-subtle rounded-lg p-4 animate-pulse"
    >
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="flex-1 bg-semantic-border rounded-sm"
          style={{ height: `${20 + ((i * 7) % 60)}%` }}
        />
      ))}
    </div>
  );
}

const RevenueBarChart = dynamic(
  () =>
    import('recharts').then((recharts) => {
      const {
        BarChart,
        Bar,
        XAxis,
        YAxis,
        CartesianGrid,
        Tooltip,
        ResponsiveContainer,
      } = recharts;

      function RevenueBarChartInner({
        data,
        height,
      }: {
        data: RevenueData[];
        height: number;
      }) {
        return (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={data}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--color-border-default)"
                vertical={false}
              />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }}
                tickLine={false}
                axisLine={{ stroke: 'var(--color-border-default)' }}
              />
              <YAxis
                tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }}
                tickLine={false}
                axisLine={{ stroke: 'var(--color-border-default)' }}
                tickFormatter={(value: number) => `$${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: 'rgba(127, 119, 221, 0.05)' }}
              />
              <Bar
                dataKey="revenue"
                fill="var(--color-brand-primary)"
                radius={[8, 8, 0, 0]}
                maxBarSize={60}
              />
            </BarChart>
          </ResponsiveContainer>
        );
      }

      return RevenueBarChartInner;
    }),
  {
    ssr: false,
    loading: () => <ChartSkeleton height={300} />,
  },
);

export function RevenueChart({
  data,
  isLoading = false,
  height = 300,
  rangeLabel,
  exportFilename,
}: RevenueChartProps) {
  const chartData = useMemo(() => {
    return [...data].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
  }, [data]);

  const handleExportCsv = () => {
    if (!exportFilename || chartData.length === 0) return;
    const total = chartData.reduce((sum, d) => sum + d.revenue, 0);
    const rows = [
      ['Month', 'Period Start', 'Revenue (USDC)'],
      ...chartData.map((d) => [d.month, format(new Date(d.date), 'yyyy-MM-dd'), d.revenue.toFixed(2)]),
      ['Total', '', total.toFixed(2)],
    ];
    downloadCsv(`${exportFilename}.csv`, toCsv(rows));
  };

  if (isLoading) {
    return <ChartSkeleton height={height} />;
  }

  if (!chartData || chartData.length === 0) {
    return (
      <div
        data-testid="revenue-chart-empty"
        style={{ height }}
        className="flex items-center justify-center rounded-lg bg-semantic-bg-subtle border-2 border-dashed border-semantic-border p-4 text-center"
      >
        <p className="text-sm text-semantic-text-muted">
          No revenue data available for the selected period
        </p>
      </div>
    );
  }

  return (
    <div
      data-testid="revenue-chart-container"
      className="w-full min-w-0 max-w-full overflow-hidden rounded-lg bg-semantic-bg-surface p-3 sm:p-4"
    >
      {(rangeLabel || exportFilename) && (
        <div
          data-testid="revenue-chart-toolbar"
          className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 mb-3 min-w-0"
        >
          <p className="text-xs text-semantic-text-muted truncate min-w-0">
            {rangeLabel}
          </p>
          {exportFilename && (
            <button
              type="button"
              onClick={handleExportCsv}
              className="flex shrink-0 items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-semantic-border text-semantic-text-body hover:bg-semantic-border-strong transition-colors"
              title="Download revenue data as CSV"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
          )}
        </div>
      )}
      <div className="w-full min-w-0 overflow-hidden">
        <RevenueBarChart data={chartData} height={height} />
      </div>
    </div>
  );
}
