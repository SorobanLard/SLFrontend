// @vitest-environment jsdom
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { StudentTable } from '../StudentTable';

const baseProps = {
  rows: [],
  courseOptions: [{ id: 'c1', title: 'Tailoring 101' }],
  selectedCourseId: '',
  onCourseFilter: vi.fn(),
  onRowClick: vi.fn(),
  detail: null,
  detailLoading: false,
  onCloseDetail: vi.fn(),
};

describe('StudentTable empty, loading, and error states (#207)', () => {
  it('renders loading skeleton when isLoading is true', () => {
    render(<StudentTable {...baseProps} isLoading />);
    expect(screen.getByTestId('student-table-loading')).toBeInTheDocument();
  });

  it('renders error banner with retry callback when error is provided', () => {
    const onRetry = vi.fn();
    render(
      <StudentTable
        {...baseProps}
        error="Failed to load student enrollments"
        onRetry={onRetry}
      />
    );
    expect(screen.getByTestId('student-table-error')).toBeInTheDocument();
    expect(screen.getByText('Failed to load student enrollments')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Retry/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders distinct empty states for no students vs filtered course with no students', () => {
    const onCourseFilter = vi.fn();
    const { rerender } = render(
      <StudentTable {...baseProps} onCourseFilter={onCourseFilter} />
    );

    expect(screen.getByTestId('student-table-empty')).toBeInTheDocument();
    expect(screen.getByText('No students enrolled yet')).toBeInTheDocument();

    rerender(
      <StudentTable
        {...baseProps}
        selectedCourseId="c1"
        onCourseFilter={onCourseFilter}
      />
    );
    expect(screen.getByText('No students enrolled in this course')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Show all courses/i }));
    expect(onCourseFilter).toHaveBeenCalledWith('');
  });
});
