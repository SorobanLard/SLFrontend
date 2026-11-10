// @vitest-environment jsdom
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import InstructorLayout from '../layout';
import InstructorDashboardPage from '../../dashboard/instructor/page';

vi.mock('@/components/layout/Sidebar', () => ({
  Sidebar: () => <aside data-testid="mock-sidebar">Sidebar</aside>,
}));

vi.mock('@/components/layout/TopBar', () => ({
  TopBar: () => <header data-testid="mock-topbar">TopBar</header>,
}));

vi.mock('@/lib/api/services', () => ({
  usersApi: {
    getInstructorStats: () =>
      Promise.resolve({
        totalCourses: 4,
        totalStudents: 120,
        totalRevenue: 4500,
        courses: [],
      }),
  },
}));

describe('Instructor layout & dashboard stats grid responsiveness (#199)', () => {
  it('prevents horizontal overflow on mobile and scales stats grid across 320px, 375px, 768px, and 1024px+', () => {
    render(
      <InstructorLayout>
        <InstructorDashboardPage />
      </InstructorLayout>
    );

    const main = screen.getByTestId('instructor-layout-main');
    expect(main.className).toContain('overflow-x-hidden');
    expect(main.className).toContain('p-3');
    expect(main.className).toContain('sm:p-4');
    expect(main.className).toContain('md:p-6');

    const statsGrid = screen.getByTestId('instructor-stats-grid');
    expect(statsGrid.className).toContain('grid-cols-1');
    expect(statsGrid.className).toContain('sm:grid-cols-2');
    expect(statsGrid.className).toContain('lg:grid-cols-4');
  });
});
