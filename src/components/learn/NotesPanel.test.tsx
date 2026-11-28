import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotesPanel } from './NotesPanel';

// Mock the notes store so tests stay focused on NotesPanel behaviour.
const mockAddNote = vi.fn();
const mockDeleteNote = vi.fn();

vi.mock('@/lib/hooks/use-notes-store', () => ({
  useNotesStore: vi.fn(() => ({
    notes: [],
    addNote: mockAddNote,
    deleteNote: mockDeleteNote,
  })),
}));

import { useNotesStore } from '@/lib/hooks/use-notes-store';

const mockUseNotesStore = vi.mocked(useNotesStore);

const sampleNotes = [
  {
    id: 'note-1',
    lessonId: 'lesson-1',
    content: 'Remember to review hooks.',
    timestamp: 42,
    createdAt: new Date('2024-01-01T00:00:00Z').toISOString(),
  },
  {
    id: 'note-2',
    lessonId: 'lesson-1',
    content: 'Second note about state.',
    timestamp: 120,
    createdAt: new Date('2024-01-02T00:00:00Z').toISOString(),
  },
];

describe('NotesPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseNotesStore.mockReturnValue({
      notes: [],
      addNote: mockAddNote,
      deleteNote: mockDeleteNote,
    } as ReturnType<typeof useNotesStore>);
  });

  describe('Empty state', () => {
    it('renders the panel heading', () => {
      render(<NotesPanel lessonId="lesson-1" />);
      expect(screen.getByText(/notes/i)).toBeInTheDocument();
    });

    it('shows an empty-state message when there are no notes', () => {
      render(<NotesPanel lessonId="lesson-1" />);
      expect(screen.getByText(/no notes yet/i)).toBeInTheDocument();
    });
  });

  describe('Populated state', () => {
    it('renders each note content', () => {
      mockUseNotesStore.mockReturnValue({
        notes: sampleNotes,
        addNote: mockAddNote,
        deleteNote: mockDeleteNote,
      } as ReturnType<typeof useNotesStore>);

      render(<NotesPanel lessonId="lesson-1" />);
      expect(screen.getByText('Remember to review hooks.')).toBeInTheDocument();
      expect(screen.getByText('Second note about state.')).toBeInTheDocument();
    });

    it('does not show the empty-state message when notes exist', () => {
      mockUseNotesStore.mockReturnValue({
        notes: sampleNotes,
        addNote: mockAddNote,
        deleteNote: mockDeleteNote,
      } as ReturnType<typeof useNotesStore>);

      render(<NotesPanel lessonId="lesson-1" />);
      expect(screen.queryByText(/no notes yet/i)).not.toBeInTheDocument();
    });
  });

  describe('Adding a note', () => {
    it('calls addNote with the typed content on submit', () => {
      render(<NotesPanel lessonId="lesson-1" />);

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'A brand new note' } });
      fireEvent.submit(input.closest('form') as HTMLFormElement);

      expect(mockAddNote).toHaveBeenCalledTimes(1);
      expect(mockAddNote).toHaveBeenCalledWith(
        expect.objectContaining({ content: 'A brand new note' })
      );
    });

    it('does not call addNote when the input is empty', () => {
      render(<NotesPanel lessonId="lesson-1" />);

      const input = screen.getByRole('textbox');
      fireEvent.submit(input.closest('form') as HTMLFormElement);

      expect(mockAddNote).not.toHaveBeenCalled();
    });
  });

  describe('Deleting a note', () => {
    it('calls deleteNote with the note id when the delete button is clicked', () => {
      mockUseNotesStore.mockReturnValue({
        notes: sampleNotes,
        addNote: mockAddNote,
        deleteNote: mockDeleteNote,
      } as ReturnType<typeof useNotesStore>);

      render(<NotesPanel lessonId="lesson-1" />);

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      fireEvent.click(deleteButtons[0]);

      expect(mockDeleteNote).toHaveBeenCalledWith('note-1');
    });
  });
});
