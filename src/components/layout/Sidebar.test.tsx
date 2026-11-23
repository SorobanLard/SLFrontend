import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Sidebar } from './Sidebar';

// Mock next/navigation — Sidebar uses usePathname to highlight the active link
const mockPathname = vi.fn(() => '/dashboard');

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname(),
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

// Mock next/link so it renders a plain anchor in jsdom
vi.mock('next/link', () => ({
  default: function MockLink({ href, children, className, onClick, ...rest }: any) {
    return (
      <a href={typeof href === 'string' ? href : String(href)} className={className} onClick={onClick} {...rest}>
        {children}
      </a>
    );
  },
}));

// Mock next/image
vi.mock('next/image', () => ({
  default: function MockImage({ src, alt, className }: any) {
    return <img src={src} alt={alt} className={className} />;
  },
}));

// Mock the lib/utils module
vi.mock('@/lib/utils', () => ({
  cn: (...args: string[]) => args.filter(Boolean).join(' '),
}));

describe('Sidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname.mockReturnValue('/dashboard');
  });

  describe('Populated state', () => {
    it('renders the sidebar navigation landmark', () => {
      render(<Sidebar />);
      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });

    it('renders the primary navigation links', () => {
      render(<Sidebar />);
      expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /courses/i })).toBeInTheDocument();
    });

    it('marks the active link based on the current pathname', () => {
      mockPathname.mockReturnValue('/dashboard/courses');
      render(<Sidebar />);
      const coursesLink = screen.getByRole('link', { name: /courses/i });
      expect(coursesLink).toHaveAttribute('aria-current', 'page');
    });
  });

  describe('Empty state', () => {
    it('renders without crashing when no items are provided', () => {
      render(<Sidebar items={[]} />);
      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });
  });

  describe('Loading state', () => {
    it('renders a loading indicator when loading is true', () => {
      render(<Sidebar loading />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });

  describe('User interaction', () => {
    it('calls onNavigate when a link is clicked', () => {
      const onNavigate = vi.fn();
      render(<Sidebar onNavigate={onNavigate} />);
      fireEvent.click(screen.getByRole('link', { name: /dashboard/i }));
      expect(onNavigate).toHaveBeenCalledTimes(1);
    });

    it('toggles the collapsed state when the collapse button is clicked', () => {
      render(<Sidebar />);
      const toggle = screen.getByRole('button', { name: /collapse sidebar/i });
      fireEvent.click(toggle);
      expect(screen.getByRole('button', { name: /expand sidebar/i })).toBeInTheDocument();
    });
  });
});
