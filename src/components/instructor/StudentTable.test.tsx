import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { StudentTable } from './StudentTable';
import type { StudentEnrollmentRow, StudentDetail } from '@/types';

const makeRow = (overrides: Partial<StudentEnrollmentRow> = {}): StudentEnrollmentRow => ({
  studentId: 's1',
  studentName: 'Alice Anderson',
  courseId: 'c1',
  courseTitle: 'Intro to Soroban',
  enrolledAt: '2024-01-01T00:00:00.000Z',
  progressPercent: 40,
  lastActiveAt: '2024-02-01T00:00:00.000Z',
  ...overrides,
});

const courseOptions = [
  { id: 'c1', title: 'Intro to Soroban' },
  { id: 'c2', title: 'Advanced Soroban' },
];

const baseProps = {
  rows: [] as StudentEnrollmentRow[],
  courseOptions,
  selectedCourseId: '',
  onCourseFilter: vi.fn(),
  onRowClick: vi.fn(),
  detail: null as StudentDetail | null,
  detailLoading: false,
  onCloseDetail: vi.fn(),
};

describe('StudentTable', () => {
  it('renders the empty state when there are no rows', () => {
    render(<StudentTable {...baseProps} />);
    expect(screen.getByText('No enrolled students yet')).toBeInTheDocument();
    expect(screen.getByText('New enrollments will appear here.')).toBeInTheDocument();
  });

  it('renders the loading state', () => {
    render(<StudentTable {...baseProps} loading />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading students');
  });

  it('renders the error state and calls onRetry', () => {
    const onRetry = vi.fn();
    render(<StudentTable {...baseProps} error="Network down" onRetry={onRetry} />);
    expect(screen.getByRole('alert')).toHaveTextContent("Couldn't load students");
    expect(screen.getByText('Network down')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders rows with student data', () => {
    render(<StudentTable {...baseProps} rows={[makeRow()]} />);
    expect(screen.getByText('Alice Anderson')).toBeInTheDocument();
    expect(screen.getByText('Intro to Soroban')).toBeInTheDocument();
  });

  it('renders course filter options and calls onCourseFilter on change', () => {
    const onCourseFilter = vi.fn();
    render(<StudentTable {...baseProps} onCourseFilter={onCourseFilter} />);
    const select = screen.getByLabelText('Filter by course') as HTMLSelectElement;
    expect(within(select).getByText('All courses')).toBeInTheDocument();
    expect(within(select).getByText('Advanced Soroban')).toBeInTheDocument();
    fireEvent.change(select, { target: { value: 'c2' } });
    expect(onCourseFilter).toHaveBeenCalledWith('c2');
  });

  it('calls onRowClick when a row is clicked', () => {
    const onRowClick = vi.fn();
    render(<StudentTable {...baseProps} rows={[makeRow()]} onRowClick={onRowClick} />);
    fireEvent.click(screen.getByText('Alice Anderson'));
    expect(onRowClick).toHaveBeenCalledWith('s1');
  });

  it('sorts rows by student name when the Student header is clicked', () => {
    const rows = [
      makeRow({ studentId: 's1', studentName: 'Zoe' }),
      makeRow({ studentId: 's2', studentName: 'Adam' }),
    ];
    render(<StudentTable {...baseProps} rows={rows} />);
    fireEvent.click(screen.getByRole('button', { name: /Student/ }));
    const names = screen.getAllByText(/^(Zoe|Adam)$/).map((el) => el.textContent);
    expect(names).toEqual(['Adam', 'Zoe']);
  });
});
