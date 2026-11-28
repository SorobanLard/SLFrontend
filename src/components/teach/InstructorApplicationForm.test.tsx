import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InstructorApplicationForm } from './InstructorApplicationForm';

// Mock the lib/utils module used for class merging
vi.mock('@/lib/utils', () => ({
  cn: (...args: string[]) => args.filter(Boolean).join(' '),
}));

// Mock the API client used on submit
const mockSubmitApplication = vi.fn();

vi.mock('@/lib/api/instructor', () => ({
  submitInstructorApplication: (...args: unknown[]) => mockSubmitApplication(...args),
}));

describe('InstructorApplicationForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial render', () => {
    it('renders the form heading', () => {
      render(<InstructorApplicationForm />);
      expect(screen.getByRole('heading', { name: /apply to teach/i })).toBeInTheDocument();
    });

    it('renders the submit button in its default state', () => {
      render(<InstructorApplicationForm />);
      const submit = screen.getByRole('button', { name: /submit application/i });
      expect(submit).toBeInTheDocument();
      expect(submit).not.toBeDisabled();
    });

    it('renders empty form fields', () => {
      render(<InstructorApplicationForm />);
      expect(screen.getByLabelText(/full name/i)).toHaveValue('');
      expect(screen.getByLabelText(/email/i)).toHaveValue('');
      expect(screen.getByLabelText(/expertise/i)).toHaveValue('');
    });
  });

  describe('User interaction', () => {
    it('updates field values as the user types', () => {
      render(<InstructorApplicationForm />);
      const nameInput = screen.getByLabelText(/full name/i);
      fireEvent.change(nameInput, { target: { value: 'Jane Doe' } });
      expect(nameInput).toHaveValue('Jane Doe');
    });

    it('shows validation errors when submitting an empty form', async () => {
      render(<InstructorApplicationForm />);
      fireEvent.click(screen.getByRole('button', { name: /submit application/i }));
      expect(await screen.findByText(/full name is required/i)).toBeInTheDocument();
      expect(mockSubmitApplication).not.toHaveBeenCalled();
    });

    it('submits populated form data', async () => {
      mockSubmitApplication.mockResolvedValueOnce({ ok: true });
      render(<InstructorApplicationForm />);

      fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Jane Doe' } });
      fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'jane@example.com' } });
      fireEvent.change(screen.getByLabelText(/expertise/i), { target: { value: 'React, TypeScript' } });

      fireEvent.click(screen.getByRole('button', { name: /submit application/i }));

      await waitFor(() => {
        expect(mockSubmitApplication).toHaveBeenCalledWith({
          fullName: 'Jane Doe',
          email: 'jane@example.com',
          expertise: 'React, TypeScript',
        });
      });
    });
  });

  describe('Loading state', () => {
    it('disables the submit button while submitting', async () => {
      let resolveSubmit: (value: unknown) => void = () => {};
      mockSubmitApplication.mockReturnValueOnce(
        new Promise((resolve) => {
          resolveSubmit = resolve;
        }),
      );

      render(<InstructorApplicationForm />);
      fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Jane Doe' } });
      fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'jane@example.com' } });
      fireEvent.change(screen.getByLabelText(/expertise/i), { target: { value: 'React' } });

      fireEvent.click(screen.getByRole('button', { name: /submit application/i }));

      const submit = await screen.findByRole('button', { name: /submitting/i });
      expect(submit).toBeDisabled();

      resolveSubmit({ ok: true });
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /submit application/i })).not.toBeDisabled();
      });
    });
  });

  describe('Success state', () => {
    it('shows a success message after a successful submission', async () => {
      mockSubmitApplication.mockResolvedValueOnce({ ok: true });
      render(<InstructorApplicationForm />);

      fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Jane Doe' } });
      fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'jane@example.com' } });
      fireEvent.change(screen.getByLabelText(/expertise/i), { target: { value: 'React' } });

      fireEvent.click(screen.getByRole('button', { name: /submit application/i }));

      expect(await screen.findByText(/application submitted/i)).toBeInTheDocument();
    });
  });
});
