import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PromoCodeForm, formatPromoDiscount } from './PromoCodeForm';
import { promoCodesApi } from '@/lib/api/services';

vi.mock('@/lib/api/services', () => ({
  promoCodesApi: {
    create: vi.fn(),
  },
}));

const mockedCreate = vi.mocked(promoCodesApi.create);

describe('formatPromoDiscount', () => {
  it('formats percentage discounts', () => {
    expect(formatPromoDiscount({ discountType: 'PERCENTAGE', discountValue: 20 })).toBe('20%');
  });

  it('formats fixed discounts', () => {
    expect(formatPromoDiscount({ discountType: 'FIXED', discountValue: 5 })).toBe('$5');
  });
});

describe('PromoCodeForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the empty form with default values', () => {
    render(<PromoCodeForm />);

    expect(screen.getByLabelText('Promo Code')).toHaveValue('');
    expect(screen.getByLabelText('Discount Type')).toHaveValue('PERCENTAGE');
    expect(screen.getByLabelText('Discount Value (%)')).toHaveValue(10);
    expect(screen.getByLabelText('Max Uses')).toHaveValue(100);
    expect(screen.getByRole('button', { name: 'Create Promo Code' })).toBeInTheDocument();
  });

  it('switches the discount value label when type changes', async () => {
    const user = userEvent.setup();
    render(<PromoCodeForm />);

    await user.selectOptions(screen.getByLabelText('Discount Type'), 'FIXED');

    expect(screen.getByLabelText('Discount Value ($)')).toBeInTheDocument();
  });

  it('submits populated values and calls onSuccess', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    mockedCreate.mockResolvedValueOnce({} as never);

    render(<PromoCodeForm onSuccess={onSuccess} />);

    await user.type(screen.getByLabelText('Promo Code'), 'summer20');
    await user.clear(screen.getByLabelText('Discount Value (%)'));
    await user.type(screen.getByLabelText('Discount Value (%)'), '25');
    await user.type(screen.getByLabelText('Expiry Date'), '2030-01-01');
    await user.click(screen.getByRole('button', { name: 'Create Promo Code' }));

    await waitFor(() => expect(mockedCreate).toHaveBeenCalledTimes(1));
    expect(mockedCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'SUMMER20',
        discountType: 'PERCENTAGE',
        discountValue: 25,
        expiryDate: '2030-01-01',
      }),
    );
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
  });

  it('shows a loading state while submitting', async () => {
    const user = userEvent.setup();
    let resolveCreate: (value: unknown) => void = () => {};
    mockedCreate.mockImplementationOnce(
      () => new Promise((resolve) => { resolveCreate = resolve; }) as never,
    );

    render(<PromoCodeForm />);

    await user.type(screen.getByLabelText('Promo Code'), 'LOADING');
    await user.type(screen.getByLabelText('Expiry Date'), '2030-01-01');
    await user.click(screen.getByRole('button', { name: 'Create Promo Code' }));

    expect(await screen.findByText('Creating...')).toBeInTheDocument();

    resolveCreate({});
    await waitFor(() => expect(screen.queryByText('Creating...')).not.toBeInTheDocument());
  });

  it('shows an error message when submission fails', async () => {
    const user = userEvent.setup();
    const onError = vi.fn();
    mockedCreate.mockRejectedValueOnce(new Error('Code already exists'));

    render(<PromoCodeForm onError={onError} />);

    await user.type(screen.getByLabelText('Promo Code'), 'DUP');
    await user.type(screen.getByLabelText('Expiry Date'), '2030-01-01');
    await user.click(screen.getByRole('button', { name: 'Create Promo Code' }));

    expect(await screen.findByText('Code already exists')).toBeInTheDocument();
    expect(onError).toHaveBeenCalledWith('Code already exists');
  });
});
