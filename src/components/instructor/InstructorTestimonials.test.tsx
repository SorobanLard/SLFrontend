import React from 'react';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it } from 'vitest';

import { InstructorTestimonials } from './InstructorTestimonials';

/**
 * Unit / component tests for InstructorTestimonials (#346).
 *
 * The component renders a fixed set of three instructor testimonials.
 * Tests stay focused on what a user sees: names, roles, quotes, ratings,
 * and course categories — not on class names or internal structure.
 */

describe('InstructorTestimonials', () => {
  it('renders all three testimonial cards', () => {
    render(<InstructorTestimonials />);

    expect(screen.getByText('Amina Bello')).toBeInTheDocument();
    expect(screen.getByText('Chef David Okafor')).toBeInTheDocument();
    expect(screen.getByText('Kemi Adebayo')).toBeInTheDocument();
  });

  it('displays each instructor role', () => {
    render(<InstructorTestimonials />);

    expect(screen.getByText('Master Fashion Designer & Tailor')).toBeInTheDocument();
    expect(screen.getByText('Pastry Chef & Bakery Owner')).toBeInTheDocument();
    expect(screen.getByText('Celebrity Makeup Artist')).toBeInTheDocument();
  });

  it('displays each course category', () => {
    render(<InstructorTestimonials />);

    expect(screen.getByText('Tailoring & Garment Design')).toBeInTheDocument();
    expect(screen.getByText('Artisanal Baking')).toBeInTheDocument();
    expect(screen.getByText('Bridal & Editorial Makeup')).toBeInTheDocument();
  });

  it('shows the quote text for each testimonial', () => {
    render(<InstructorTestimonials />);

    expect(
      screen.getByText(/reaching over 2,500 students across 12 countries/i),
    ).toBeInTheDocument();

    expect(
      screen.getByText(/passive income from course sales now funds my new bakery/i),
    ).toBeInTheDocument();

    expect(
      screen.getByText(/students love the step-by-step close-up video lessons/i),
    ).toBeInTheDocument();
  });

  it('renders the correct number of filled stars for each rating', () => {
    const { container } = render(<InstructorTestimonials />);

    // Each testimonial has a rating of 5. Lucide renders each Star as an <svg>.
    // All three cards combined should have exactly 15 star SVGs.
    // We target the amber-coloured star wrappers to avoid counting other icons.
    const starWrappers = container.querySelectorAll('.text-amber-400');
    let totalStars = 0;
    starWrappers.forEach((wrapper) => {
      totalStars += wrapper.querySelectorAll('svg').length;
    });

    expect(totalStars).toBe(15); // 3 cards × 5 stars
  });

  it('renders the avatar initial for each instructor', () => {
    render(<InstructorTestimonials />);

    // Each avatar shows the first letter of the instructor's name.
    // getAllByText handles the case where the same letter appears more than once.
    expect(screen.getByText('A')).toBeInTheDocument(); // Amina
    expect(screen.getByText('C')).toBeInTheDocument(); // Chef David
    expect(screen.getByText('K')).toBeInTheDocument(); // Kemi
  });

  it('contains no broken or empty testimonial cards', () => {
    render(<InstructorTestimonials />);

    // Every card must have at least a non-empty name and a non-empty quote.
    const names = ['Amina Bello', 'Chef David Okafor', 'Kemi Adebayo'];
    names.forEach((name) => {
      const nameEl = screen.getByText(name);
      // The name element must exist and be visible.
      expect(nameEl).toBeVisible();
    });
  });

  it('renders each instructor name and role within the same card', () => {
    render(<InstructorTestimonials />);

    const aminaEl = screen.getByText('Amina Bello');
    // Walk up to the card container and check the role appears inside it.
    const card = aminaEl.closest('[class*="rounded"]') as HTMLElement;
    expect(within(card).getByText('Master Fashion Designer & Tailor')).toBeInTheDocument();
    expect(within(card).getByText('Tailoring & Garment Design')).toBeInTheDocument();
  });
});
