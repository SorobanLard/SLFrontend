import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Pagination } from '../Pagination';

const push = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  usePathname: () => '/courses',
  useSearchParams: () => new URLSearchParams(),
}));

function jumpTo(value: string) {
  const input = screen.getByLabelText('Jump to page');
  fireEvent.change(input, { target: { value } });
  fireEvent.keyDown(input, { key: 'Enter' });
}

describe('Pagination jump-to-page', () => {
  beforeEach(() => push.mockClear());

  it('navigates to a valid page when Enter is pressed', () => {
    const onPageChange = vi.fn();
    render(<Pagination currentPage={1} totalPages={20} onPageChange={onPageChange} />);

    jumpTo('12');

    expect(onPageChange).toHaveBeenCalledWith(12);
    expect(push).toHaveBeenCalledWith('/courses?page=12', { scroll: false });
  });

  it('navigates when the Go button is clicked', () => {
    const onPageChange = vi.fn();
    render(<Pagination currentPage={1} totalPages={20} onPageChange={onPageChange} updateUrl={false} />);

    fireEvent.change(screen.getByLabelText('Jump to page'), { target: { value: '7' } });
    fireEvent.click(screen.getByRole('button', { name: 'Go to entered page' }));

    expect(onPageChange).toHaveBeenCalledWith(7);
    expect(push).not.toHaveBeenCalled();
  });

  it('clamps values above the total to the last page', () => {
    const onPageChange = vi.fn();
    render(<Pagination currentPage={1} totalPages={20} onPageChange={onPageChange} />);

    jumpTo('99');

    expect(onPageChange).toHaveBeenCalledWith(20);
  });

  it('clamps values below 1 to the first page', () => {
    const onPageChange = vi.fn();
    render(<Pagination currentPage={5} totalPages={20} onPageChange={onPageChange} />);

    jumpTo('-3');

    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it('ignores empty input and clears the field after jumping', () => {
    const onPageChange = vi.fn();
    render(<Pagination currentPage={1} totalPages={20} onPageChange={onPageChange} />);

    jumpTo('');
    expect(onPageChange).not.toHaveBeenCalled();

    jumpTo('3');
    expect(screen.getByLabelText('Jump to page')).toHaveValue(null);
  });

  it('does not trigger prev/next when arrow keys are pressed inside the input', () => {
    const onPageChange = vi.fn();
    render(<Pagination currentPage={5} totalPages={20} onPageChange={onPageChange} />);

    fireEvent.keyDown(screen.getByLabelText('Jump to page'), { key: 'ArrowRight' });

    expect(onPageChange).not.toHaveBeenCalled();
  });

  it('keeps existing prev/next and page buttons working', () => {
    const onPageChange = vi.fn();
    render(<Pagination currentPage={5} totalPages={20} onPageChange={onPageChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Go to next page' }));
    expect(onPageChange).toHaveBeenLastCalledWith(6);

    fireEvent.click(screen.getByRole('button', { name: 'Go to previous page' }));
    expect(onPageChange).toHaveBeenLastCalledWith(4);

    fireEvent.click(screen.getByRole('button', { name: 'Go to page 1' }));
    expect(onPageChange).toHaveBeenLastCalledWith(1);
  });

  describe('Accessibility: aria-current and button labels', () => {
    it('sets aria-current="page" and "Current page, page X" on the active button and "Go to page Y" on inactive buttons', () => {
      render(<Pagination currentPage={2} totalPages={5} updateUrl={false} />);

      const activeBtn = screen.getByRole('button', { name: 'Current page, page 2' });
      expect(activeBtn).toHaveAttribute('aria-current', 'page');

      const page3Btn = screen.getByRole('button', { name: 'Go to page 3' });
      expect(page3Btn).not.toHaveAttribute('aria-current');
    });

    it('marks the mobile page summary with aria-current="page" and aria-live="polite"', () => {
      render(<Pagination currentPage={2} totalPages={5} updateUrl={false} />);

      const mobileSummary = screen.getByText('Page 2 of 5');
      expect(mobileSummary).toHaveAttribute('aria-current', 'page');
      expect(mobileSummary).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('Single page of results edge case', () => {
    it('renders null when totalPages is 1', () => {
      const { container } = render(<Pagination currentPage={1} totalPages={1} updateUrl={false} />);
      expect(container.firstChild).toBeNull();
    });

    it('renders null when totalItems fits on a single page', () => {
      const { container } = render(
        <Pagination currentPage={1} totalItems={8} itemsPerPage={10} updateUrl={false} />,
      );
      expect(container.firstChild).toBeNull();
    });

    it('renders null when totalPages is 0 or negative', () => {
      const { container } = render(<Pagination currentPage={1} totalPages={0} updateUrl={false} />);
      expect(container.firstChild).toBeNull();
    });

    it('renders null when totalItems is 0', () => {
      const { container } = render(
        <Pagination currentPage={1} totalItems={0} itemsPerPage={10} updateUrl={false} />,
      );
      expect(container.firstChild).toBeNull();
    });
  });
});
