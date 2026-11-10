import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Pagination } from '@/components/ui/Pagination';

const mockPush = vi.fn();
const mockGet = vi.fn((_key: string) => null);

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => '/courses',
  useSearchParams: () => ({ get: mockGet }),
}));

describe('Pagination Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders page numbers correctly for small total counts', () => {
    render(<Pagination currentPage={1} totalPages={5} updateUrl={false} />);
    expect(screen.getByRole('button', { name: 'Current page, page 1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Go to page 5' })).toBeInTheDocument();
    expect(screen.queryByText('…')).not.toBeInTheDocument();
  });

  it('shows ellipsis for large page ranges', () => {
    render(<Pagination currentPage={5} totalPages={10} updateUrl={false} />);
    expect(screen.getByRole('button', { name: 'Go to page 1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Current page, page 5' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Go to page 10' })).toBeInTheDocument();
    const ellipsisElements = screen.getAllByText('…');
    expect(ellipsisElements.length).toBeGreaterThan(0);
  });

  it('disables Previous button at start boundary', () => {
    render(<Pagination currentPage={1} totalPages={5} updateUrl={false} />);
    const prevButton = screen.getByRole('button', { name: /previous page/i });
    const nextButton = screen.getByRole('button', { name: /next page/i });
    expect(prevButton).toBeDisabled();
    expect(nextButton).not.toBeDisabled();
  });

  it('disables Next button at end boundary', () => {
    render(<Pagination currentPage={5} totalPages={5} updateUrl={false} />);
    const prevButton = screen.getByRole('button', { name: /previous page/i });
    const nextButton = screen.getByRole('button', { name: /next page/i });
    expect(prevButton).not.toBeDisabled();
    expect(nextButton).toBeDisabled();
  });

  it('applies aria-current="page", descriptive aria-labels, and #7F77DD background styling to current page', () => {
    render(<Pagination currentPage={2} totalPages={5} updateUrl={false} />);
    const activeBtn = screen.getByRole('button', { name: 'Current page, page 2' });
    expect(activeBtn).toHaveAttribute('aria-current', 'page');
    expect(activeBtn.className).toContain('bg-[#7F77DD]');

    const inactiveBtn = screen.getByRole('button', { name: 'Go to page 3' });
    expect(inactiveBtn).not.toHaveAttribute('aria-current');
  });

  it('calculates totalPages from totalItems and itemsPerPage when totalPages is omitted', () => {
    render(<Pagination currentPage={1} totalItems={45} itemsPerPage={10} updateUrl={false} />);
    expect(screen.getByRole('button', { name: 'Go to page 5' })).toBeInTheDocument();
  });

  it('triggers onPageChange and updates URL search params when page button is clicked', () => {
    const handlePageChange = vi.fn();
    render(<Pagination currentPage={1} totalPages={5} onPageChange={handlePageChange} paramName="page" />);

    const page2Btn = screen.getByRole('button', { name: 'Go to page 2' });
    fireEvent.click(page2Btn);

    expect(handlePageChange).toHaveBeenCalledWith(2);
    expect(mockPush).toHaveBeenCalledWith('/courses?page=2', { scroll: false });
  });

  it('hides itself (renders null) when there is only one page of results (totalPages <= 1)', () => {
    const { container } = render(<Pagination currentPage={1} totalPages={1} updateUrl={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('hides itself (renders null) when totalItems fits on a single page (totalItems <= itemsPerPage)', () => {
    const { container } = render(
      <Pagination currentPage={1} totalItems={7} itemsPerPage={10} updateUrl={false} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('hides itself (renders null) when totalPages is 0 or totalItems is 0', () => {
    const { container: c1 } = render(<Pagination currentPage={1} totalPages={0} updateUrl={false} />);
    expect(c1.firstChild).toBeNull();

    const { container: c2 } = render(
      <Pagination currentPage={1} totalItems={0} itemsPerPage={10} updateUrl={false} />,
    );
    expect(c2.firstChild).toBeNull();
  });
});
