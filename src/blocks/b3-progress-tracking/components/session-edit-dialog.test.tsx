import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { SessionEditDialog } from './session-edit-dialog';

const mockSession = {
  id: 'session-1',
  user_id: 'user-1',
  course_id: 'course-1',
  started_at: '2024-06-15T10:00:00Z',
  ended_at: '2024-06-15T10:30:00Z',
  duration_minutes: 30,
  modules_completed: 2,
  session_type: 'manual' as const,
  notes: 'Studied React hooks',
  created_at: '2024-06-15T10:00:00Z',
  course_title: 'React Masterclass',
  course_platform: 'udemy' as const,
};

describe('SessionEditDialog', () => {
  const defaultProps = {
    session: mockSession,
    open: true,
    onClose: vi.fn(),
    onSave: vi.fn(),
    isSaving: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders dialog with "Edit Session" title', () => {
    render(<SessionEditDialog {...defaultProps} />);
    expect(screen.getByText('Edit Session')).toBeDefined();
  });

  it('displays the course title as read-only', () => {
    render(<SessionEditDialog {...defaultProps} />);
    expect(screen.getByText('React Masterclass')).toBeDefined();
  });

  it('displays the session date as read-only', () => {
    render(<SessionEditDialog {...defaultProps} />);
    // format(new Date('2024-06-15T10:00:00Z'), 'PPP') produces a date string with "June 15"
    expect(screen.getByText(/June 15/)).toBeDefined();
  });

  it('pre-populates duration field with session duration_minutes', () => {
    render(<SessionEditDialog {...defaultProps} />);
    const durationInput = screen.getByLabelText('Duration (minutes)') as HTMLInputElement;
    expect(durationInput.value).toBe('30');
  });

  it('pre-populates modules field with session modules_completed', () => {
    render(<SessionEditDialog {...defaultProps} />);
    const modulesInput = screen.getByLabelText('Modules Completed') as HTMLInputElement;
    expect(modulesInput.value).toBe('2');
  });

  it('pre-populates notes field with session notes', () => {
    render(<SessionEditDialog {...defaultProps} />);
    const notesInput = screen.getByLabelText('Notes') as HTMLTextAreaElement;
    expect(notesInput.value).toBe('Studied React hooks');
  });

  it('pre-populates notes as empty string when session.notes is null', () => {
    const sessionNoNotes = { ...mockSession, notes: null };
    render(<SessionEditDialog {...defaultProps} session={sessionNoNotes} />);
    const notesInput = screen.getByLabelText('Notes') as HTMLTextAreaElement;
    expect(notesInput.value).toBe('');
  });

  it('calls onSave with changed fields when Save Changes is clicked', () => {
    render(<SessionEditDialog {...defaultProps} />);

    const durationInput = screen.getByLabelText('Duration (minutes)') as HTMLInputElement;
    fireEvent.change(durationInput, { target: { value: '45' } });

    fireEvent.click(screen.getByText('Save Changes'));
    expect(defaultProps.onSave).toHaveBeenCalledWith({
      durationMinutes: 45,
      modulesCompleted: undefined,
      notes: undefined,
    });
  });

  it('calls onClose when Cancel is clicked', () => {
    render(<SessionEditDialog {...defaultProps} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('shows "Saving..." when isSaving is true', () => {
    render(<SessionEditDialog {...defaultProps} isSaving={true} />);
    expect(screen.getByText('Saving...')).toBeDefined();
    expect(screen.queryByText('Save Changes')).toBeNull();
  });

  it('disables Save button when isSaving is true', () => {
    render(<SessionEditDialog {...defaultProps} isSaving={true} />);
    const saveBtn = screen.getByText('Saving...').closest('button');
    expect(saveBtn?.disabled).toBe(true);
  });

  it('does not render when open is false', () => {
    render(<SessionEditDialog {...defaultProps} open={false} />);
    expect(screen.queryByText('Edit Session')).toBeNull();
  });
});
