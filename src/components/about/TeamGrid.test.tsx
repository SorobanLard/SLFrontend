import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { TeamGrid } from './TeamGrid';

describe('TeamGrid', () => {
  it('renders a card per member with name and role', () => {
    render(<TeamGrid members={[{ id: '1', name: 'Ada Lovelace', role: 'Founder', image: '/a.jpg' }]} />);
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText('Founder')).toBeInTheDocument();
  });
});
