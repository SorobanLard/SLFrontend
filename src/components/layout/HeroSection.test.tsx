import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import HeroSection from './HeroSection';

describe('HeroSection', () => {
  it('renders the heading and description', () => {
    render(
      <HeroSection
        title="Learn to Code"
        subtitle="Start your journey today"
      />
    );

    expect(screen.getByText('Learn to Code')).toBeInTheDocument();
    expect(screen.getByText('Start your journey today')).toBeInTheDocument();
  });

  it('renders the primary call-to-action button', () => {
    render(
      <HeroSection
        title="Learn to Code"
        subtitle="Start your journey today"
        ctaLabel="Get Started"
      />
    );

    expect(
      screen.getByRole('button', { name: 'Get Started' })
    ).toBeInTheDocument();
  });

  it('invokes the CTA handler when the button is clicked', () => {
    const handleClick = vi.fn();

    render(
      <HeroSection
        title="Learn to Code"
        subtitle="Start your journey today"
        ctaLabel="Get Started"
        onCtaClick={handleClick}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Get Started' }));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders without a CTA when no label is provided', () => {
    render(
      <HeroSection
        title="Learn to Code"
        subtitle="Start your journey today"
      />
    );

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
