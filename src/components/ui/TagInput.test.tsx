import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TagInput } from './TagInput';

vi.mock('@/lib/api/services', () => ({
  tagsApi: {
    search: vi.fn(),
  },
}));

import { tagsApi } from '@/lib/api/services';

const searchMock = tagsApi.search as unknown as ReturnType<typeof vi.fn>;

describe('TagInput', () => {
  beforeEach(() => {
    searchMock.mockReset();
    searchMock.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the empty state with the tag counter', () => {
    render(<TagInput value={[]} onChange={vi.fn()} />);

    expect(screen.getByText('0 of 10 tags added')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Tags' })).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText('Type a skill or topic…'),
    ).toBeInTheDocument();
  });

  it('renders populated tags and the counter reflects the count', () => {
    render(<TagInput value={['React', 'TypeScript']} onChange={vi.fn()} />);

    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
    expect(screen.getByText('2 of 10 tags added')).toBeInTheDocument();
  });

  it('renders a visible label associated with the input when label and id are provided', () => {
    render(
      <TagInput value={[]} onChange={vi.fn()} id="skills" label="Skills" />,
    );

    const input = screen.getByLabelText('Skills');
    expect(input).toHaveAttribute('id', 'skills');
  });

  it('adds a tag when Enter is pressed with typed input', () => {
    const onChange = vi.fn();
    render(<TagInput value={[]} onChange={onChange} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'GraphQL' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onChange).toHaveBeenCalledWith(['GraphQL']);
  });

  it('does not add a duplicate tag', () => {
    const onChange = vi.fn();
    render(<TagInput value={['React']} onChange={onChange} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'React' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onChange).not.toHaveBeenCalled();
  });

  it('removes a tag when its remove button is clicked', () => {
    const onChange = vi.fn();
    render(<TagInput value={['React', 'Vue']} onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Remove tag React' }));

    expect(onChange).toHaveBeenCalledWith(['Vue']);
  });

  it('removes the last tag on Backspace when the input is empty', () => {
    const onChange = vi.fn();
    render(<TagInput value={['React', 'Vue']} onChange={onChange} />);

    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Backspace' });

    expect(onChange).toHaveBeenCalledWith(['React']);
  });

  it('hides remove buttons and disables interaction when disabled', () => {
    render(<TagInput value={['React']} onChange={vi.fn()} disabled />);

    expect(
      screen.queryByRole('button', { name: 'Remove tag React' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  it('shows the max-tags message when the limit is reached', () => {
    const tags = Array.from({ length: 10 }, (_, i) => `tag-${i}`);
    render(<TagInput value={tags} onChange={vi.fn()} />);

    expect(
      screen.getByText('10 of 10 tags added — remove a tag to add more'),
    ).toBeInTheDocument();
  });

  it('fetches and displays suggestions after typing', async () => {
    vi.useFakeTimers();
    searchMock.mockResolvedValue(['JavaScript', 'Java']);

    render(<TagInput value={[]} onChange={vi.fn()} />);

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'Ja' },
    });

    vi.advanceTimersByTime(300);

    await waitFor(() => {
      expect(screen.getByText('JavaScript')).toBeInTheDocument();
    });
    expect(screen.getByText('Java')).toBeInTheDocument();
    expect(searchMock).toHaveBeenCalledWith('Ja');
  });
});
