import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SearchBar } from './SearchBar';

// Mock next/navigation's useRouter — SearchBar may navigate on submit
const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
}));

// Mock the lib/utils module
vi.mock('@/lib/utils', () => ({
  cn: (...args: string[]) => args.filter(Boolean).join(' '),
}));

describe('SearchBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders a search input', () => {
      render(<SearchBar />);
      expect(screen.getByRole('searchbox')).toBeInTheDocument();
    });

    it('renders with a placeholder', () => {
      render(<SearchBar placeholder="Search courses" />);
      expect(screen.getByPlaceholderText(/search courses/i)).toBeInTheDocument();
    });

    it('renders the initial value when provided', () => {
      render(<SearchBar defaultValue="react" />);
      expect(screen.getByRole('searchbox')).toHaveValue('react');
    });
  });

  describe('User Interaction', () => {
    it('updates the input value as the user types', () => {
      render(<SearchBar />);
      const input = screen.getByRole('searchbox');
      fireEvent.change(input, { target: { value: 'typescript' } });
      expect(input).toHaveValue('typescript');
    });

    it('calls onChange when the user types', () => {
      const handleChange = vi.fn();
      render(<SearchBar onChange={handleChange} />);
      fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'next' } });
      expect(handleChange).toHaveBeenCalled();
    });

    it('calls onSubmit when the form is submitted', () => {
      const handleSubmit = vi.fn();
      render(<SearchBar onSubmit={handleSubmit} />);
      const input = screen.getByRole('searchbox');
      fireEvent.change(input, { target: { value: 'hooks' } });
      fireEvent.submit(input.closest('form') as HTMLFormElement);
      expect(handleSubmit).toHaveBeenCalled();
    });

    it('clears the input when the clear button is clicked', () => {
      render(<SearchBar defaultValue="react" />);
      const clearButton = screen.getByRole('button', { name: /clear/i });
      fireEvent.click(clearButton);
      expect(screen.getByRole('searchbox')).toHaveValue('');
    });
  });

  describe('States', () => {
    it('shows a loading indicator when loading', () => {
      render(<SearchBar loading />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('renders empty results message when no results', () => {
      render(<SearchBar results={[]} />);
      expect(screen.getByText(/no results/i)).toBeInTheDocument();
    });

    it('renders populated results', () => {
      render(
        <SearchBar
          results={[
            { id: '1', title: 'Intro to React' },
            { id: '2', title: 'Advanced TypeScript' },
          ]}
        />
      );
      expect(screen.getByText('Intro to React')).toBeInTheDocument();
      expect(screen.getByText('Advanced TypeScript')).toBeInTheDocument();
    });
  });
});
