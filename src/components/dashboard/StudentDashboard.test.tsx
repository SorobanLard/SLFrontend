import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import StudentDashboard from './StudentDashboard';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'u1', name: 'Test Student', email: 'student@example.com' },
    logout: vi.fn(),
  }),
}));

describe('StudentDashboard', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('renders the dashboard heading and welcome message', () => {
    render(<StudentDashboard />);
    expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByText(/welcome/i)).toBeInTheDocument();
  });

  it('renders the student name from auth context', () => {
    render(<StudentDashboard />);
    expect(screen.getByText(/Test Student/)).toBeInTheDocument();
  });

  it('renders the empty state when there are no enrolled courses', () => {
    render(<StudentDashboard courses={[]} />);
    expect(screen.getByText(/no courses/i)).toBeInTheDocument();
  });

  it('renders a course card for each provided course', () => {
    const courses = [
      { id: 'c1', title: 'Intro to Testing', progress: 40 },
      { id: 'c2', title: 'Advanced React', progress: 75 },
    ];
    render(<StudentDashboard courses={courses} />);
    expect(screen.getByText('Intro to Testing')).toBeInTheDocument();
    expect(screen.getByText('Advanced React')).toBeInTheDocument();
  });

  it('shows a loading state when isLoading is true', () => {
    render(<StudentDashboard isLoading />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('shows an error state when an error is provided', () => {
    render(<StudentDashboard error="Failed to load courses" />);
    expect(screen.getByText(/failed to load courses/i)).toBeInTheDocument();
  });

  it('navigates to a course when a course card is clicked', () => {
    const courses = [{ id: 'c1', title: 'Intro to Testing', progress: 40 }];
    render(<StudentDashboard courses={courses} />);
    fireEvent.click(screen.getByText('Intro to Testing'));
    expect(mockNavigate).toHaveBeenCalledWith('/courses/c1');
  });

  it('navigates to browse courses when the browse button is clicked', () => {
    render(<StudentDashboard courses={[]} />);
    fireEvent.click(screen.getByRole('button', { name: /browse courses/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/courses');
  });
});
