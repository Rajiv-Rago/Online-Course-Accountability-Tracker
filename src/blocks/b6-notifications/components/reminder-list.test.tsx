import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// Mock child components
vi.mock('./reminder-item', () => ({
  ReminderItem: ({ reminder, onToggle, onEdit, onDelete }: any) => (
    <div data-testid={`reminder-${reminder.id}`}>
      <span>{reminder.course_title}</span>
      <button onClick={() => onToggle(reminder.id, !reminder.enabled)}>Toggle</button>
      <button onClick={() => onEdit(reminder)}>Edit</button>
      <button onClick={() => onDelete(reminder.id)}>Delete</button>
    </div>
  ),
}));

vi.mock('./reminder-form', () => ({
  ReminderForm: ({ mode, isOpen, onClose, onSubmit }: any) => (
    isOpen ? (
      <div data-testid={`reminder-form-${mode}`}>
        <button onClick={onClose}>Close Form</button>
        <button onClick={() => onSubmit({ courseId: 'c-1', daysOfWeek: ['mon'], time: '09:00', channels: ['in_app'] })}>
          Submit Form
        </button>
      </div>
    ) : null
  ),
}));

// Mock the hook
const mockCreateMutate = vi.fn();
const mockUpdateMutate = vi.fn();
const mockToggleMutate = vi.fn();
const mockDeleteMutate = vi.fn();

vi.mock('../hooks/use-reminders', () => ({
  useReminders: vi.fn(() => ({
    reminders: [],
    courses: [{ id: 'c-1', title: 'React Course' }],
    isLoading: false,
    createReminder: { mutate: mockCreateMutate, isPending: false },
    updateReminder: { mutate: mockUpdateMutate, isPending: false },
    toggleReminder: { mutate: mockToggleMutate },
    deleteReminder: { mutate: mockDeleteMutate },
  })),
}));

import { ReminderList } from './reminder-list';
import { useReminders } from '../hooks/use-reminders';

const mockReminder = {
  id: 'r-1',
  user_id: 'u-1',
  course_id: 'c-1',
  days_of_week: ['mon', 'wed', 'fri'],
  time: '19:00',
  timezone: 'UTC',
  enabled: true,
  channels: ['in_app'],
  created_at: '2026-02-10T00:00:00Z',
  updated_at: '2026-02-10T00:00:00Z',
  course_title: 'React Course',
};

describe('ReminderList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useReminders).mockReturnValue({
      reminders: [],
      courses: [{ id: 'c-1', title: 'React Course' }],
      isLoading: false,
      createReminder: { mutate: mockCreateMutate, isPending: false },
      updateReminder: { mutate: mockUpdateMutate, isPending: false },
      toggleReminder: { mutate: mockToggleMutate },
      deleteReminder: { mutate: mockDeleteMutate },
    } as any);
  });

  it('renders the Study Reminders heading', () => {
    render(<ReminderList />);
    expect(screen.getByText('Study Reminders')).toBeDefined();
  });

  it('renders Add Reminder button', () => {
    render(<ReminderList />);
    expect(screen.getByText('Add Reminder')).toBeDefined();
  });

  it('shows loading skeleton when isLoading is true', () => {
    vi.mocked(useReminders).mockReturnValue({
      reminders: [],
      courses: [],
      isLoading: true,
      createReminder: { mutate: mockCreateMutate, isPending: false },
      updateReminder: { mutate: mockUpdateMutate, isPending: false },
      toggleReminder: { mutate: mockToggleMutate },
      deleteReminder: { mutate: mockDeleteMutate },
    } as any);
    render(<ReminderList />);
    // Should not show the heading or empty state
    expect(screen.queryByText('Study Reminders')).toBeNull();
    expect(screen.queryByText('No reminders configured')).toBeNull();
  });

  it('shows empty state when no reminders exist', () => {
    render(<ReminderList />);
    expect(screen.getByText('No reminders configured')).toBeDefined();
    expect(screen.getByText('Set up reminders to stay on track with your study goals.')).toBeDefined();
  });

  it('shows Create Your First Reminder button in empty state', () => {
    render(<ReminderList />);
    expect(screen.getByText('Create Your First Reminder')).toBeDefined();
  });

  it('renders reminder items when reminders exist', () => {
    vi.mocked(useReminders).mockReturnValue({
      reminders: [mockReminder],
      courses: [{ id: 'c-1', title: 'React Course' }],
      isLoading: false,
      createReminder: { mutate: mockCreateMutate, isPending: false },
      updateReminder: { mutate: mockUpdateMutate, isPending: false },
      toggleReminder: { mutate: mockToggleMutate },
      deleteReminder: { mutate: mockDeleteMutate },
    } as any);
    render(<ReminderList />);
    expect(screen.getByTestId('reminder-r-1')).toBeDefined();
    expect(screen.getByText('React Course')).toBeDefined();
  });

  it('opens create form when Add Reminder is clicked', () => {
    render(<ReminderList />);
    expect(screen.queryByTestId('reminder-form-create')).toBeNull();
    fireEvent.click(screen.getByText('Add Reminder'));
    expect(screen.getByTestId('reminder-form-create')).toBeDefined();
  });

  it('opens create form when Create Your First Reminder is clicked in empty state', () => {
    render(<ReminderList />);
    fireEvent.click(screen.getByText('Create Your First Reminder'));
    expect(screen.getByTestId('reminder-form-create')).toBeDefined();
  });

  it('opens edit form when edit is clicked on a reminder item', () => {
    vi.mocked(useReminders).mockReturnValue({
      reminders: [mockReminder],
      courses: [{ id: 'c-1', title: 'React Course' }],
      isLoading: false,
      createReminder: { mutate: mockCreateMutate, isPending: false },
      updateReminder: { mutate: mockUpdateMutate, isPending: false },
      toggleReminder: { mutate: mockToggleMutate },
      deleteReminder: { mutate: mockDeleteMutate },
    } as any);
    render(<ReminderList />);
    fireEvent.click(screen.getByText('Edit'));
    expect(screen.getByTestId('reminder-form-edit')).toBeDefined();
  });

  it('calls toggleReminder when toggle is clicked on a reminder item', () => {
    vi.mocked(useReminders).mockReturnValue({
      reminders: [mockReminder],
      courses: [{ id: 'c-1', title: 'React Course' }],
      isLoading: false,
      createReminder: { mutate: mockCreateMutate, isPending: false },
      updateReminder: { mutate: mockUpdateMutate, isPending: false },
      toggleReminder: { mutate: mockToggleMutate },
      deleteReminder: { mutate: mockDeleteMutate },
    } as any);
    render(<ReminderList />);
    fireEvent.click(screen.getByText('Toggle'));
    expect(mockToggleMutate).toHaveBeenCalledWith({ id: 'r-1', enabled: false });
  });

  it('calls deleteReminder when delete is clicked on a reminder item', () => {
    vi.mocked(useReminders).mockReturnValue({
      reminders: [mockReminder],
      courses: [{ id: 'c-1', title: 'React Course' }],
      isLoading: false,
      createReminder: { mutate: mockCreateMutate, isPending: false },
      updateReminder: { mutate: mockUpdateMutate, isPending: false },
      toggleReminder: { mutate: mockToggleMutate },
      deleteReminder: { mutate: mockDeleteMutate },
    } as any);
    render(<ReminderList />);
    fireEvent.click(screen.getByText('Delete'));
    expect(mockDeleteMutate).toHaveBeenCalledWith('r-1');
  });
});
