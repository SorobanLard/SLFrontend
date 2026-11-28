import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Footer1 from './Footer1';

describe('Footer1', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the footer landmark', () => {
    render(<Footer1 />);
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });

  it('renders representative props content', () => {
    render(
      <Footer1
        companyName="Acme Corp"
        tagline="Building better products"
        copyright="© 2024 Acme Corp"
      />
    );
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    expect(screen.getByText('Building better products')).toBeInTheDocument();
    expect(screen.getByText('© 2024 Acme Corp')).toBeInTheDocument();
  });

  it('renders empty state when no links are provided', () => {
    render(<Footer1 links={[]} />);
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    expect(screen.queryAllByRole('link')).toHaveLength(0);
  });

  it('renders populated link list', () => {
    const links = [
      { label: 'Home', href: '/' },
      { label: 'About', href: '/about' },
      { label: 'Contact', href: '/contact' },
    ];
    render(<Footer1 links={links} />);
    links.forEach((link) => {
      const anchor = screen.getByRole('link', { name: link.label });
      expect(anchor).toBeInTheDocument();
      expect(anchor).toHaveAttribute('href', link.href);
    });
  });

  it('invokes onLinkClick when a link is clicked', () => {
    const onLinkClick = vi.fn();
    render(
      <Footer1
        links={[{ label: 'Home', href: '/' }]}
        onLinkClick={onLinkClick}
      />
    );
    fireEvent.click(screen.getByRole('link', { name: 'Home' }));
    expect(onLinkClick).toHaveBeenCalledTimes(1);
  });

  it('submits the newsletter form with the entered email', () => {
    const onSubscribe = vi.fn();
    render(<Footer1 onSubscribe={onSubscribe} />);
    const input = screen.getByRole('textbox', { name: /email/i });
    fireEvent.change(input, { target: { value: 'user@example.com' } });
    fireEvent.submit(input.closest('form') as HTMLFormElement);
    expect(onSubscribe).toHaveBeenCalledWith('user@example.com');
  });
});
