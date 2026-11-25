import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FAQAccordion from './FAQAccordion';

describe('FAQAccordion', () => {
  const items = [
    { question: 'What is included?', answer: 'Everything you need to get started.' },
    { question: 'Can I cancel anytime?', answer: 'Yes, you can cancel at any time.' },
  ];

  it('renders all questions', () => {
    render(<FAQAccordion items={items} />);

    expect(screen.getByText('What is included?')).toBeInTheDocument();
    expect(screen.getByText('Can I cancel anytime?')).toBeInTheDocument();
  });

  it('expands an answer when its question is clicked', async () => {
    const user = userEvent.setup();
    render(<FAQAccordion items={items} />);

    expect(screen.queryByText('Everything you need to get started.')).not.toBeInTheDocument();

    await user.click(screen.getByText('What is included?'));

    expect(screen.getByText('Everything you need to get started.')).toBeInTheDocument();
  });

  it('collapses an answer when its question is clicked again', async () => {
    const user = userEvent.setup();
    render(<FAQAccordion items={items} />);

    await user.click(screen.getByText('What is included?'));
    expect(screen.getByText('Everything you need to get started.')).toBeInTheDocument();

    await user.click(screen.getByText('What is included?'));
    expect(screen.queryByText('Everything you need to get started.')).not.toBeInTheDocument();
  });

  it('renders nothing when there are no items', () => {
    const { container } = render(<FAQAccordion items={[]} />);

    expect(container).toBeEmptyDOMElement();
  });
});
