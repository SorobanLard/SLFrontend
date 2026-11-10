import React, { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TagInput } from '../TagInput';

vi.mock('@/lib/api/services', () => ({
  tagsApi: {
    search: vi.fn().mockResolvedValue(['Soroban', 'Rust', 'Stellar']),
  },
}));

function ControlledTagInput({
  initialTags = [],
  label,
  ariaLabelledBy,
}: {
  initialTags?: string[];
  label?: string;
  ariaLabelledBy?: string;
}) {
  const [tags, setTags] = useState<string[]>(initialTags);
  return (
    <TagInput
      value={tags}
      onChange={setTags}
      label={label}
      ariaLabelledBy={ariaLabelledBy}
    />
  );
}

describe('TagInput accessibility (#220)', () => {
  it('associates the text input with a default <label> when no label prop is provided', () => {
    render(<ControlledTagInput />);

    const input = screen.getByLabelText(/course skills and tags/i);
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('role', 'combobox');
  });

  it('associates the text input with a custom visible label or external aria-labelledby element', () => {
    const { rerender } = render(<ControlledTagInput label="Course Topics" />);
    expect(screen.getByLabelText('Course Topics')).toBeInTheDocument();

    rerender(
      <div>
        <span id="ext-tag-heading">Target Skills</span>
        <ControlledTagInput ariaLabelledBy="ext-tag-heading" />
      </div>,
    );
    expect(screen.getByRole('combobox', { name: 'Target Skills' })).toBeInTheDocument();
  });

  it('announces added and removed tags via aria-live="polite"', () => {
    render(<ControlledTagInput initialTags={['Stellar']} />);

    const input = screen.getByRole('combobox');
    const liveAnnouncer = screen.getByTestId('tag-live-announcer');
    expect(liveAnnouncer).toHaveAttribute('aria-live', 'polite');

    // Add a tag with Enter
    fireEvent.change(input, { target: { value: 'Soroban' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(liveAnnouncer).toHaveTextContent('Added tag Soroban. 2 of 10 tags added.');

    // Remove a tag via its remove button
    const removeStellarBtn = screen.getByRole('button', { name: 'Remove tag Stellar' });
    fireEvent.click(removeStellarBtn);

    expect(liveAnnouncer).toHaveTextContent('Removed tag Stellar. 1 of 10 tags added.');
  });
});
