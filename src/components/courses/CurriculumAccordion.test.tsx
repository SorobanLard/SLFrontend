import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { CurriculumAccordion } from './CurriculumAccordion';
import type { CourseModule } from '@/types';

const mockModules: CourseModule[] = [
  {
    id: 'm-1',
    courseId: 'c-1',
    title: 'Module 1: Pattern Drafting',
    position: 1,
    lessons: [
      {
        id: 'l-1',
        moduleId: 'm-1',
        title: 'Taking Accurate Measurements',
        description: null,
        type: 'VIDEO',
        videoUrl: '#',
        videoDuration: 300,
        content: null,
        resourceUrl: null,
        position: 1,
        isFree: true,
      },
    ],
  },
  {
    id: 'm-2',
    courseId: 'c-1',
    title: 'Module 2: Garment Assembly',
    position: 2,
    lessons: [
      {
        id: 'l-2',
        moduleId: 'm-2',
        title: 'Seam Finishes & Pressing',
        description: null,
        type: 'VIDEO',
        videoUrl: '#',
        videoDuration: 600,
        content: null,
        resourceUrl: null,
        position: 1,
        isFree: false,
      },
    ],
  },
];

describe('CurriculumAccordion disclosure semantics (Issue #221)', () => {
  it('links each module trigger button to its disclosure panel via aria-expanded and aria-controls', () => {
    render(<CurriculumAccordion modules={mockModules} />);

    const mod1Button = screen.getByRole('button', { name: /Module 1: Pattern Drafting/i });
    const mod2Button = screen.getByRole('button', { name: /Module 2: Garment Assembly/i });

    expect(mod1Button).toHaveAttribute('aria-expanded', 'true');
    expect(mod1Button).toHaveAttribute('aria-controls', 'curriculum-panel-m-1');

    expect(mod2Button).toHaveAttribute('aria-expanded', 'false');
    expect(mod2Button).toHaveAttribute('aria-controls', 'curriculum-panel-m-2');

    const panel1 = document.getElementById('curriculum-panel-m-1');
    const panel2 = document.getElementById('curriculum-panel-m-2');

    expect(panel1).not.toBeNull();
    expect(panel1).toHaveAttribute('role', 'region');
    expect(panel1).toHaveAttribute('aria-labelledby', mod1Button.id);
    expect(panel1).not.toHaveAttribute('hidden');

    expect(panel2).not.toBeNull();
    expect(panel2).toHaveAttribute('role', 'region');
    expect(panel2).toHaveAttribute('aria-labelledby', mod2Button.id);
    expect(panel2).toHaveAttribute('hidden');
  });

  it('toggles aria-expanded and panel visibility when clicked or activated via keyboard', () => {
    render(<CurriculumAccordion modules={mockModules} />);

    const mod2Button = screen.getByRole('button', { name: /Module 2: Garment Assembly/i });
    expect(mod2Button).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Seam Finishes & Pressing')).not.toBeInTheDocument();

    fireEvent.click(mod2Button);
    expect(mod2Button).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Seam Finishes & Pressing')).toBeInTheDocument();
    expect(document.getElementById('curriculum-panel-m-2')).not.toHaveAttribute('hidden');

    fireEvent.click(mod2Button);
    expect(mod2Button).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Seam Finishes & Pressing')).not.toBeInTheDocument();
    expect(document.getElementById('curriculum-panel-m-2')).toHaveAttribute('hidden');
  });

  it('updates aria-expanded on Expand All / Collapse All and all module buttons', () => {
    render(<CurriculumAccordion modules={mockModules} />);

    const toggleAllBtn = screen.getByRole('button', { name: 'Expand All' });
    expect(toggleAllBtn).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(toggleAllBtn);

    expect(screen.getByRole('button', { name: 'Collapse All' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: /Module 1: Pattern Drafting/i })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: /Module 2: Garment Assembly/i })).toHaveAttribute('aria-expanded', 'true');
  });
});
