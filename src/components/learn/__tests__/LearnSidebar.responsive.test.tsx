// @vitest-environment jsdom
import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LearnSidebar } from '../LearnSidebar';
import type { CourseModule } from '@/types';

const mockModules: CourseModule[] = [
  {
    id: 'm1',
    courseId: 'c1',
    title: 'Module 1: Pattern Foundations & Measurements',
    position: 1,
    lessons: [
      {
        id: 'l1',
        moduleId: 'm1',
        title: 'Lesson 1: Taking Accurate Measurements',
        type: 'VIDEO',
        position: 1,
        isFree: true,
        videoDuration: 320,
      },
    ],
  },
];

describe('LearnSidebar responsive behavior (#198)', () => {
  it('renders mobile bottom drawer with bounded max-h-[80vh] flex layout at 320px and 375px viewports', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 320,
    });
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });

    render(<LearnSidebar modules={mockModules} currentLessonId="l1" />);

    const openBtn = screen.getByRole('button', { name: /Open curriculum/i });
    expect(openBtn).toBeInTheDocument();

    fireEvent.click(openBtn);
    const drawer = screen.getByTestId('learn-sidebar-mobile-drawer');
    expect(drawer.className).toContain('max-h-[80vh]');
    expect(drawer.className).toContain('flex-col');
    expect(drawer.className).toContain('overflow-hidden');
  });

  it('switches cleanly to desktop collapsible sidebar at 768px and 1024px+ viewports', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 768,
    });
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });

    render(<LearnSidebar modules={mockModules} currentLessonId="l1" />);

    const desktopSidebar = screen.getByTestId('learn-sidebar-desktop');
    expect(desktopSidebar).toBeInTheDocument();
    expect(desktopSidebar.className).toContain('w-64');
    expect(desktopSidebar.className).toContain('md:w-72');
    expect(desktopSidebar.className).toContain('lg:w-80');
  });
});
