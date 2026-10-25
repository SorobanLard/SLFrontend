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
  /** Shown above the chart, e.g. the selected date range */
  rangeLabel?: string;
  /** CSV filename (without extension). Hides the export button when omitted. */
  exportFilename?: string;
}

/**
 * Custom tooltip for the revenue chart showing formatted values
 */
function CustomTooltip(props: TooltipProps<number, string>) {
  const { active, payload } = props;

  if (!active || !payload || !payload.length) {
    return null;
  }

  const data = payload[0].payload as RevenueData;

  return (
    // bg-semantic-bg-surface adapts: #f8f8ff (light) → #16131f (dark)
    // border-semantic-border uses var(--color-border-default) in both modes
    // text-semantic-text-body uses var(--color-text-body) in both modes
    // color-text-link adapts: #3c3489 (light, 9.7:1) → #d9d5ff (dark, 13:1) on bg-surface
    <div className="bg-semantic-bg-surface rounded-lg shadow-lg border border-semantic-border p-3">
      <p className="text-sm font-semibold text-semantic-text-body">{data.month}</p>
      <p className="text-base font-bold" style={{ color: 'var(--color-text-link)' }}>
        {formatUsdc(data.revenue)}
      </p>
    </div>
  );
}

/**
 * Loading skeleton for the chart
 */
function ChartSkeleton({ height = 300 }: { height: number }) {
  return (
    // bg-semantic-bg-subtle adapts: #eeedfe (light) → #1e1a2f (dark)
    <div
      style={{ height }}
      className="flex items-end justify-between gap-2 bg-semantic-bg-subtle rounded-lg p-4 animate-pulse"
    >
      {Array.from({ length: 12 }).map((_, i) => (
        // border-semantic-border used as a muted bar fill via bg
        <div
          key={i}
          className="flex-1 bg-semantic-border rounded-sm"
          style={{ height: `${20 + Math.random() * 60}%` }}
        />
      ))}
    </div>
  );
}

/**
 * Recharts is heavy and only used by instructor dashboards. Loading it via
 * next/dynamic keeps it out of the main (student) bundle and defers the
 * download until the chart is actually rendered.
 */
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
    // Ensure data is sorted by date
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
      // bg-semantic-bg-subtle adapts to dark mode; border-semantic-border uses CSS var
      <div
        style={{ height }}
        className="flex items-center justify-center rounded-lg bg-semantic-bg-subtle border-2 border-dashed border-semantic-border"
      >
        <p className="text-sm text-semantic-text-muted">
          No revenue data available for the selected period
        </p>
      </div>
    );
  }

  return (
    // bg-semantic-bg-surface adapts: #f8f8ff (light) → #16131f (dark)
    <div className="w-full rounded-lg bg-semantic-bg-surface p-4">
      {(rangeLabel || exportFilename) && (
        <div className="flex items-center justify-between gap-3 mb-3">
          <p className="text-xs text-semantic-text-muted">{rangeLabel}</p>
          {exportFilename && (
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-semantic-border text-semantic-text-body hover:bg-semantic-border-strong transition-colors"
              title="Download revenue data as CSV"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
          )}
        </div>
      )}
      <RevenueBarChart data={chartData} height={height} />
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={chartData}>
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
            // Uses --color-brand-primary-rgb (74 66 184) so the tint adapts with the token
            cursor={{ fill: 'rgb(var(--color-brand-primary-rgb) / 0.05)' }}
          />
          <Bar
            dataKey="revenue"
            fill="var(--color-brand-primary)"
            radius={[8, 8, 0, 0]}
            maxBarSize={60}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
