import { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TagInput } from '../TagInput';

vi.mock('@/lib/api/services', () => ({
  tagsApi: {
    search: vi.fn(async () => ['Tailoring', 'Pattern Making']),
  },
}));

function ControlledTagInput({
  initialTags = [],
  label,
  id,
}: {
  initialTags?: string[];
  label?: string;
  id?: string;
}) {
  const [tags, setTags] = useState<string[]>(initialTags);
  return <TagInput id={id} label={label} value={tags} onChange={setTags} />;
}

describe('TagInput accessibility (Issue #220)', () => {
  it('programmatically associates a <label> with the combobox input via htmlFor/id', () => {
    render(<ControlledTagInput label="Skills & tags" id="course-tags" />);

    const input = screen.getByLabelText('Skills & tags');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('id', 'course-tags');
    expect(input).toHaveAttribute('role', 'combobox');
  });

  it('provides a default programmatically associated label when no id or label prop is passed', () => {
    render(<ControlledTagInput />);

    const input = screen.getByLabelText('Add a tag');
    expect(input).toBeInTheDocument();
    expect(input.getAttribute('id')).toBeTruthy();
    expect(input).toHaveAttribute('aria-describedby');
  });

  it('announces added tags in an aria-live polite status region', () => {
    render(<ControlledTagInput />);

    const input = screen.getByRole('combobox', { name: 'Add a tag' });
    fireEvent.change(input, { target: { value: 'Embroidery' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveAttribute('aria-atomic', 'true');
    expect(status).toHaveTextContent('Added tag Embroidery.');
    expect(status).toHaveTextContent('1 of 10 tags added');
  });

  it('announces removed tags when removed via button click or Backspace key', () => {
    render(<ControlledTagInput initialTags={['Tailoring', 'Baking']} />);

    const removeButton = screen.getByRole('button', { name: 'Remove tag Tailoring' });
    fireEvent.click(removeButton);

    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Removed tag Tailoring.');
    expect(status).toHaveTextContent('1 of 10 tags added');

    const input = screen.getByRole('combobox', { name: 'Add a tag' });
    fireEvent.keyDown(input, { key: 'Backspace' });

    expect(status).toHaveTextContent('Removed tag Baking.');
    expect(status).toHaveTextContent('0 of 10 tags added');
  });
});
