import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { CourseBrowser } from './CourseBrowser';
import { coursesApi } from '@/lib/api/services';
import type { Course, Category } from '@/types';

vi.mock('@/lib/api/services', () => ({
  coursesApi: {
    getCategories: vi.fn(),
    list: vi.fn(),
  },
}));

vi.mock('@/lib/hooks/useInfiniteScroll', () => ({
  useInfiniteScroll: () => ({ sentinelRef: { current: null } }),
}));

vi.mock('./CourseCardGrid', () => ({
  CourseCardGrid: ({ courses, loading }: { courses: Course[]; loading?: boolean }) => (
    <div data-testid="course-grid" data-loading={loading ? 'true' : 'false'}>
      {courses.map((c) => (
        <span key={c.id} data-testid="course-item">
          {c.title}
        </span>
      ))}
    </div>
  ),
}));

vi.mock('./CourseCardSkeleton', () => ({
  CourseCardSkeleton: () => <div data-testid="course-skeleton" />,
}));

const mockedApi = vi.mocked(coursesApi);

function makeCourse(id: string, title: string): Course {
  return { id, title } as Course;
}

const categories: Category[] = [
  { name: 'Design', count: 3 } as Category,
  { name: 'Development', count: 5 } as Category,
];

beforeEach(() => {
  vi.clearAllMocks();
  mockedApi.getCategories.mockResolvedValue(categories);
  mockedApi.list.mockResolvedValue({ data: [makeCourse('1', 'Intro to Design')] } as never);
});

describe('CourseBrowser', () => {
  it('renders filters and courses by default', async () => {
    render(<CourseBrowser />);

    expect(screen.getByPlaceholderText('Search courses…')).toBeInTheDocument();
    expect(screen.getByText('All categories')).toBeInTheDocument();
    expect(screen.getByText('All levels')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Intro to Design')).toBeInTheDocument();
    });
  });

  it('shows loading skeletons before courses resolve', () => {
    mockedApi.list.mockReturnValue(new Promise(() => {}) as never);
    render(<CourseBrowser />);

    expect(screen.getByTestId('course-grid')).toHaveAttribute('data-loading', 'true');
  });

  it('renders category options from the API', async () => {
    render(<CourseBrowser />);

    await waitFor(() => {
      expect(screen.getByText('Design (3)')).toBeInTheDocument();
      expect(screen.getByText('Development (5)')).toBeInTheDocument();
    });
  });

  it('shows empty state when no courses are returned', async () => {
    mockedApi.list.mockResolvedValue({ data: [] } as never);
    render(<CourseBrowser />);

    await waitFor(() => {
      expect(
        screen.getByText('No courses found. Try a different search.'),
      ).toBeInTheDocument();
    });
  });

  it('hides filters when showFilters is false', async () => {
    render(<CourseBrowser showFilters={false} />);

    expect(screen.queryByPlaceholderText('Search courses…')).not.toBeInTheDocument();
    expect(screen.queryByText('All categories')).not.toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Intro to Design')).toBeInTheDocument();
    });
  });

  it('refetches with the search term when typing', async () => {
    render(<CourseBrowser />);

    await waitFor(() => expect(mockedApi.list).toHaveBeenCalled());
    mockedApi.list.mockClear();

    fireEvent.change(screen.getByPlaceholderText('Search courses…'), {
      target: { value: 'react' },
    });

    await waitFor(() => {
      expect(mockedApi.list).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'react', page: 1 }),
      );
    });
  });

  it('refetches with the selected category', async () => {
    render(<CourseBrowser />);

    await waitFor(() => expect(screen.getByText('Design (3)')).toBeInTheDocument());
    mockedApi.list.mockClear();

    fireEvent.change(screen.getByDisplayValue('All categories'), {
      target: { value: 'Design' },
    });

    await waitFor(() => {
      expect(mockedApi.list).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'Design', page: 1 }),
      );
    });
  });

  it('refetches with the selected level', async () => {
    render(<CourseBrowser />);

    await waitFor(() => expect(mockedApi.list).toHaveBeenCalled());
    mockedApi.list.mockClear();

    fireEvent.change(screen.getByDisplayValue('All levels'), {
      target: { value: 'Beginner' },
    });

    await waitFor(() => {
      expect(mockedApi.list).toHaveBeenCalledWith(
        expect.objectContaining({ level: 'Beginner', page: 1 }),
      );
    });
  });

  it('shows end-of-list message when fewer than a full page is returned', async () => {
    render(<CourseBrowser />);

    await waitFor(() => {
      expect(screen.getByText("You've seen all courses")).toBeInTheDocument();
    });
  });
});
