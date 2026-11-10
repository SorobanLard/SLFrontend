import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CurriculumAccordion } from '../CurriculumAccordion';

describe('CurriculumAccordion disclosure accessibility (#221)', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  const sampleModules = [
    {
      id: 'mod-intro',
      title: '1. Getting Started with Soroban',
      order: 1,
      lessons: [
        {
          id: 'les-1',
          title: 'What is Soroban?',
          order: 1,
          type: 'VIDEO' as const,
          videoDuration: 300,
          isFree: true,
        },
      ],
    },
    {
      id: 'mod-contracts',
      title: '2. Writing Smart Contracts',
      order: 2,
      lessons: [
        {
          id: 'les-2',
          title: 'Contract State and Storage',
          order: 1,
          type: 'READING' as const,
          videoDuration: 420,
          isFree: false,
        },
      ],
    },
  ];

  it('wires each section header button with aria-expanded and aria-controls pointing to its panel id', () => {
    render(<CurriculumAccordion modules={sampleModules} courseId="course-a11y" />);

    const firstHeader = screen.getByRole('button', {
      name: /1\. Getting Started with Soroban/i,
    });
    const secondHeader = screen.getByRole('button', {
      name: /2\. Writing Smart Contracts/i,
    });

    // First section is expanded by default
    expect(firstHeader).toHaveAttribute('id', 'curriculum-header-mod-intro');
    expect(firstHeader).toHaveAttribute('aria-expanded', 'true');
    expect(firstHeader).toHaveAttribute('aria-controls', 'curriculum-panel-mod-intro');

    const firstPanel = document.getElementById('curriculum-panel-mod-intro');
    expect(firstPanel).not.toBeNull();
    expect(firstPanel).toHaveAttribute('role', 'region');
    expect(firstPanel).toHaveAttribute('aria-labelledby', 'curriculum-header-mod-intro');
    expect(firstPanel).not.toHaveAttribute('hidden');

    // Second section is collapsed by default, but its controlled panel element still exists in the DOM
    expect(secondHeader).toHaveAttribute('id', 'curriculum-header-mod-contracts');
    expect(secondHeader).toHaveAttribute('aria-expanded', 'false');
    expect(secondHeader).toHaveAttribute('aria-controls', 'curriculum-panel-mod-contracts');

    const secondPanel = document.getElementById('curriculum-panel-mod-contracts');
    expect(secondPanel).not.toBeNull();
    expect(secondPanel).toHaveAttribute('role', 'region');
    expect(secondPanel).toHaveAttribute('aria-labelledby', 'curriculum-header-mod-contracts');
    expect(secondPanel).toHaveAttribute('hidden');
  });

  it('updates aria-expanded and panel visibility when toggling a section or Expand/Collapse All', () => {
    render(<CurriculumAccordion modules={sampleModules} courseId="course-a11y-toggle" />);

    const secondHeader = screen.getByRole('button', {
      name: /2\. Writing Smart Contracts/i,
    });
    const secondPanel = document.getElementById('curriculum-panel-mod-contracts');

    fireEvent.click(secondHeader);
    expect(secondHeader).toHaveAttribute('aria-expanded', 'true');
    expect(secondPanel).not.toHaveAttribute('hidden');
    expect(screen.getByText('Contract State and Storage')).toBeInTheDocument();

    const collapseAllBtn = screen.getByRole('button', { name: 'Collapse All' });
    expect(collapseAllBtn).toHaveAttribute('aria-expanded', 'true');

    fireEvent.click(collapseAllBtn);
    expect(secondHeader).toHaveAttribute('aria-expanded', 'false');
    expect(secondPanel).toHaveAttribute('hidden');
  });
});
