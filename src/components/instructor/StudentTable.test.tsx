// @vitest-environment jsdom
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { StudentTable } from './StudentTable';
import type { StudentEnrollmentRow } from '@/types';

const baseProps = {
  rows: [] as StudentEnrollmentRow[],
  courseOptions: [
    { id: 'course-1', title: 'Soroban Contracts 101' },
    { id: 'course-2', title: 'Stellar DeFi' },
  ],
  selectedCourseId: '',
  onCourseFilter: vi.fn(),
  onRowClick: vi.fn(),
  detail: null,
  detailLoading: false,
  onCloseDetail: vi.fn(),
};

describe('StudentTable states (#207)', () => {
  it('renders loading state when isLoading is true', () => {
    render(<StudentTable {...baseProps} isLoading />);

    expect(screen.getByTestId('student-table-loading')).toBeInTheDocument();
    expect(screen.getByText(/loading enrolled students/i)).toBeInTheDocument();
  });

  it('renders error state and invokes onRetry when retry button is clicked', () => {
    const onRetry = vi.fn();
    render(
      <StudentTable
        {...baseProps}
        error="Failed to load student enrollments from server."
        onRetry={onRetry}
      />,
    );

    expect(screen.getByTestId('student-table-error')).toBeInTheDocument();
    expect(screen.getByText(/unable to load students/i)).toBeInTheDocument();
    expect(
      screen.getByText(/failed to load student enrollments from server/i),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders empty state when instructor has zero enrolled students', () => {
    render(<StudentTable {...baseProps} rows={[]} />);

    expect(screen.getByTestId('student-table-empty')).toBeInTheDocument();
    expect(screen.getByText(/no enrolled students yet/i)).toBeInTheDocument();
  });

  it('renders filtered empty state and allows clearing the course filter', () => {
    const onCourseFilter = vi.fn();
    render(
      <StudentTable
        {...baseProps}
        selectedCourseId="course-1"
        onCourseFilter={onCourseFilter}
        rows={[]}
      />,
    );

    expect(screen.getByTestId('student-table-empty')).toBeInTheDocument();
    expect(screen.getByText(/no students enrolled in this course/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /clear course filter/i }));
    expect(onCourseFilter).toHaveBeenCalledWith('');
  });

  it('renders populated student rows when data is present', () => {
    const rows: StudentEnrollmentRow[] = [
      {
        studentId: 'stu-1',
        studentName: 'Amara Okafor',
        studentEmail: 'amara@example.com',
        studentAvatarUrl: null,
        courseId: 'course-1',
        courseTitle: 'Soroban Contracts 101',
        enrolledAt: '2026-03-01T10:00:00Z',
        progressPercent: 75,
        lastActiveAt: '2026-03-10T10:00:00Z',
      },
    ];

    render(<StudentTable {...baseProps} rows={rows} />);

    expect(screen.getByText('Amara Okafor')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
  });
});
