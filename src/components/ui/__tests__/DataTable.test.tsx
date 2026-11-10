import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DataTable, type Column } from '../DataTable';

type TestData = {
  id: string;
  name: string;
  role: string;
  status: string;
};

const mockColumns: Column<TestData>[] = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'role', label: 'Role', sortable: true },
  { key: 'status', label: 'Status' },
];

const mockData: TestData[] = [
  { id: '1', name: 'Alice', role: 'Instructor', status: 'Active' },
  { id: '2', name: 'Bob', role: 'Student', status: 'Inactive' },
];

describe('DataTable Component (Issue #181)', () => {
  it('renders table headers and data rows correctly', () => {
    render(<DataTable columns={mockColumns} data={mockData} />);

    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Role')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('renders skeleton rows when isLoading is true', () => {
    const { container } = render(
      <DataTable columns={mockColumns} data={[]} isLoading={true} />
    );

    // 5 skeleton rows
    const rows = container.querySelectorAll('tbody tr');
    expect(rows.length).toBe(5);
  });

  it('renders empty state when data is empty and not loading', () => {
    render(
      <DataTable
        columns={mockColumns}
        data={[]}
        emptyMessage="No students found"
        emptyCta={<button>Add Student</button>}
      />
    );

    expect(screen.getByText('No students found')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Student' })).toBeInTheDocument();
  });

  it('calls onSort when a sortable column header is clicked', () => {
    const onSortMock = vi.fn();
    render(
      <DataTable
        columns={mockColumns}
        data={mockData}
        onSort={onSortMock}
        sortColumn="name"
        sortDirection="asc"
      />
    );

    const nameHeader = screen.getByText('Name');
    fireEvent.click(nameHeader);

    expect(onSortMock).toHaveBeenCalledWith('name');
  });
});

describe('DataTable stable sort (Issue #133)', () => {
  type RevenueRow = { id: string; name: string; revenue: number };

  const revenueColumns: Column<RevenueRow>[] = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'revenue', label: 'Revenue', sortable: true },
  ];

  const revenueData: RevenueRow[] = [
    { id: '1', name: 'Alice', revenue: 100 },
    { id: '2', name: 'Bob', revenue: 100 },
    { id: '3', name: 'Charlie', revenue: 200 },
    { id: '4', name: 'Diana', revenue: 100 },
  ];

  it('preserves original row order for rows with equal sort values (stable sort)', () => {
    const { getAllByRole } = render(
      <DataTable
        columns={revenueColumns}
        data={revenueData}
        sortColumn="revenue"
        sortDirection="asc"
      />
    );
    const rows = getAllByRole('row').slice(1); // skip header
    const names = rows.map((row) => row.cells[0].textContent);
    // Alice, Bob, Diana all have revenue=100 — they must stay in original order
    expect(names).toEqual(['Alice', 'Bob', 'Diana', 'Charlie']);
  });

  it('stable sort descending: rows with equal values keep original relative order', () => {
    const { getAllByRole } = render(
      <DataTable
        columns={revenueColumns}
        data={revenueData}
        sortColumn="revenue"
        sortDirection="desc"
      />
    );
    const rows = getAllByRole('row').slice(1);
    const names = rows.map((row) => row.cells[0].textContent);
    // Charlie (200) first, then Alice, Bob, Diana (all 100, in original order)
    expect(names).toEqual(['Charlie', 'Alice', 'Bob', 'Diana']);
  });

  it('does not reshuffle rows between re-renders when sort values are equal', () => {
    const { getAllByRole, rerender } = render(
      <DataTable
        columns={revenueColumns}
        data={revenueData}
        sortColumn="revenue"
        sortDirection="asc"
      />
    );
    const firstRender = getAllByRole('row').slice(1).map((r) => r.cells[0].textContent);

    rerender(
      <DataTable
        columns={revenueColumns}
        data={revenueData}
        sortColumn="revenue"
        sortDirection="asc"
      />
    );
    const secondRender = getAllByRole('row').slice(1).map((r) => r.cells[0].textContent);

    expect(firstRender).toEqual(secondRender);
  });

  it('contains horizontal overflow within an accessible touch-scrollable region on mobile (#197)', () => {
    render(<DataTable columns={mockColumns} data={mockData} />);
    const scrollContainer = screen.getByTestId('datatable-scroll-container');
    expect(scrollContainer).toHaveAttribute('role', 'region');
    expect(scrollContainer.className).toContain('overflow-x-auto');
    expect(scrollContainer.className).toContain('overscroll-x-contain');
  });
});
