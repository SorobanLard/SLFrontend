import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Footer } from './Footer';

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe('Footer', () => {
  it('renders the footer content, social links, and current copyright year', () => {
    render(<Footer />);

    const footer = screen.getByRole('contentinfo', { name: 'Site footer' });
    expect(
      within(footer).getByRole('heading', {
        name: 'Get course drops and career tips in your inbox',
      }),
    ).toBeInTheDocument();
    expect(
      within(footer).getByText(`© ${new Date().getFullYear()} SorobanLard. All rights reserved.`),
    ).toBeInTheDocument();

    const linkedInLinks = within(footer).getAllByRole('listitem', {
      name: 'Follow SorobanLard on LinkedIn',
    });
    expect(linkedInLinks[0]).toHaveAttribute(
      'href',
      'https://linkedin.com/company/sorobanlard',
    );
    expect(linkedInLinks[0]).toHaveAttribute('target', '_blank');
    expect(linkedInLinks[0]).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('expands and collapses a mobile navigation section', async () => {
    const user = userEvent.setup();
    render(<Footer />);

    const aboutSection = screen.getByRole('button', { name: 'About SorobanLard' });
    expect(aboutSection).toHaveAttribute('aria-expanded', 'false');

    await user.click(aboutSection);
    expect(aboutSection).toHaveAttribute('aria-expanded', 'true');
    expect(
      screen.getAllByRole('link', { name: 'Our story' }).every(
        (link) => link.getAttribute('href') === '/about',
      ),
    ).toBe(true);

    await user.click(aboutSection);
    expect(aboutSection).toHaveAttribute('aria-expanded', 'false');
  });

  it('validates empty and malformed newsletter email addresses', async () => {
    const user = userEvent.setup();
    render(<Footer />);

    const emailInput = screen.getByRole('textbox', { name: 'Email address' });
    await user.click(screen.getByRole('button', { name: 'Subscribe' }));
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Email address is required.',
    );

    await user.type(emailInput, 'not-an-email');
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Please enter a valid email address.',
    );
    expect(emailInput).toHaveAttribute('aria-invalid', 'true');
  });

  it('shows a loading state then confirms a successful newsletter subscription', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9);
    const user = userEvent.setup();
    render(<Footer />);

    await user.type(
      screen.getByRole('textbox', { name: 'Email address' }),
      'learner@example.com',
    );
    await user.click(screen.getByRole('button', { name: 'Subscribe' }));

    const submitButton = screen.getByRole('button', { name: 'Subscribing…' });
    expect(submitButton).toBeDisabled();
    expect(screen.getByRole('textbox', { name: 'Email address' })).toBeDisabled();

    const confirmation = await screen.findByRole('status', {}, { timeout: 2000 });
    expect(confirmation).toHaveTextContent(
      "You're in! Thanks for subscribing — great things are heading your way.",
    );
    expect(screen.queryByRole('textbox', { name: 'Email address' })).not.toBeInTheDocument();
  });
});
