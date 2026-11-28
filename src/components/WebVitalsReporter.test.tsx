import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { WebVitalsReporter } from './WebVitalsReporter';

const reportWebVitalsMock = vi.fn();
const useReportWebVitalsMock = vi.fn();

vi.mock('@/lib/utils/reportWebVitals', () => ({
  reportWebVitals: (...args: unknown[]) => reportWebVitalsMock(...args),
}));

vi.mock('next/web-vitals', () => ({
  useReportWebVitals: (callback: unknown) => useReportWebVitalsMock(callback),
}));

describe('WebVitalsReporter', () => {
  beforeEach(() => {
    reportWebVitalsMock.mockReset();
    useReportWebVitalsMock.mockReset();
  });

  it('renders nothing', () => {
    const { container } = render(<WebVitalsReporter />);
    expect(container).toBeEmptyDOMElement();
  });

  it('registers the reportWebVitals handler with useReportWebVitals', () => {
    render(<WebVitalsReporter />);
    expect(useReportWebVitalsMock).toHaveBeenCalledTimes(1);
    expect(useReportWebVitalsMock).toHaveBeenCalledWith(reportWebVitalsMock);
  });

  it('forwards web vitals metrics to the reporting handler', () => {
    render(<WebVitalsReporter />);

    const handler = useReportWebVitalsMock.mock.calls[0][0] as (
      metric: unknown,
    ) => void;
    const metric = {
      id: 'v3-1234567890',
      name: 'LCP',
      value: 1234.5,
      rating: 'good',
    };

    handler(metric);

    expect(reportWebVitalsMock).toHaveBeenCalledTimes(1);
    expect(reportWebVitalsMock).toHaveBeenCalledWith(metric);
  });
});
