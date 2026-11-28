import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { CourseDetailSkeleton } from './CourseDetailSkeleton';

describe('CourseDetailSkeleton', () => {
  it('renders without crashing', () => {
    const { container } = render(<CourseDetailSkeleton />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders a set of skeleton placeholder blocks', () => {
    const { container } = render(<CourseDetailSkeleton />);
    const placeholders = container.querySelectorAll('[class*="animate-pulse"]');
    expect(placeholders.length).toBeGreaterThan(0);
  });

  it('renders the main layout regions', () => {
    const { container } = render(<CourseDetailSkeleton />);
    // The skeleton mirrors the course detail layout: a hero/header area and a
    // content column. Assert the structural wrapper is present.
    expect(container.querySelector('main, section, div')).toBeInTheDocument();
  });

  it('does not render any interactive controls while loading', () => {
    render(<CourseDetailSkeleton />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
