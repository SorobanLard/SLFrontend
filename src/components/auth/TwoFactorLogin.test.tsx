import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { TwoFactorLogin } from './TwoFactorLogin';

describe('TwoFactorLogin', () => {
  it('calls onVerify with the entered code on submit', async () => {
    const onVerify = vi.fn().mockResolvedValue(undefined);
    render(<TwoFactorLogin onVerify={onVerify} onCancel={vi.fn()} />);
    await userEvent.type(screen.getByLabelText(/authenticator code/i), '123456');
    await userEvent.click(screen.getByRole('button', { name: /verify/i }));
    expect(onVerify).toHaveBeenCalledWith('123456');
  });
});
