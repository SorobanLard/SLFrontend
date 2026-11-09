// @vitest-environment jsdom
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LearnSidebar } from './LearnSidebar';
import type { CourseModule } from '@/types';

const sampleModules: CourseModule[] = [
  {
    id: 'mod-1',
    courseId: 'course-1',
    title: 'Module 1: Introduction to Soroban Smart Contracts and Storage',
    order: 1,
    lessons: [
      {
        id: 'lesson-1',
        moduleId: 'mod-1',
        title: 'Lesson 1: Setting up the Stellar CLI and Rust Toolchain on Localhost',
        type: 'VIDEO',
        order: 1,
        videoDuration: 420,
      },
      {
        id: 'lesson-2',
        moduleId: 'mod-1',
        title: 'Lesson 2: Persistent vs Temporary Storage Entries',
        type: 'VIDEO',
        order: 2,
        videoDuration: 600,
      },
    ],
  },
];

describe('LearnSidebar responsive behavior (#198)', () => {
  it.each([320, 375])(
    'renders mobile bottom drawer and closes on lesson selection at %ipx width',
    (width) => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: width,
      });
      window.dispatchEvent(new Event('resize'));

      const onSelectLesson = vi.fn();
      render(
        <LearnSidebar
          modules={sampleModules}
          currentLessonId="lesson-1"
          onSelectLesson={onSelectLesson}
        />,
      );

      const trigger = screen.getByTestId('learn-sidebar-mobile-trigger');
      expect(trigger).toBeInTheDocument();

      const drawer = screen.getByTestId('learn-sidebar-drawer');
      expect(drawer.className).toContain('translate-y-full');
      expect(drawer.className).toContain('max-w-full');

      fireEvent.click(trigger);
      expect(drawer.className).toContain('translate-y-0');

      fireEvent.click(
        screen.getByRole('option', {
          name: /lesson 2: persistent vs temporary storage entries/i,
        }),
      );
      expect(onSelectLesson).toHaveBeenCalledWith('lesson-2');
      expect(drawer.className).toContain('translate-y-full');
    },
  );

  it.each([768, 1024])(
    'renders collapsible desktop sidebar at %ipx width',
    (width) => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: width,
      });
      window.dispatchEvent(new Event('resize'));

      render(<LearnSidebar modules={sampleModules} currentLessonId="lesson-1" />);

      const desktop = screen.getByTestId('learn-sidebar-desktop');
      expect(desktop).toBeInTheDocument();
      expect(screen.queryByTestId('learn-sidebar-mobile-trigger')).toBeNull();

      fireEvent.click(screen.getByRole('button', { name: /collapse sidebar/i }));
      expect(desktop.className).toContain('w-12');
    },
  );
});
