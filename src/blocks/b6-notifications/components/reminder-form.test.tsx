import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// Mock shadcn Dialog (Radix Dialog portal does not render in jsdom)
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-content">{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2>{children}</h2>
  ),
  DialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

// Mock shadcn Select (Radix Select portal does not render in jsdom)
vi.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: { children: React.ReactNode; value?: string; onValueChange?: (v: string) => void }) => (
    <div data-testid="select">{children}</div>
  ),
  SelectTrigger: ({ children, id }: { children: React.ReactNode; id?: string }) => (
    <button data-testid="select-trigger" id={id}>{children}</button>
  ),
  SelectValue: ({ placeholder }: { placeholder?: string }) => (
    <span>{placeholder}</span>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <option value={value}>{children}</option>
  ),
}));

// Mock shadcn Checkbox (Radix Checkbox can have issues in jsdom)
vi.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({ checked, onCheckedChange, className }: { checked?: boolean; onCheckedChange?: (v: boolean) => void; className?: string }) => (
    <input
      type="checkbox"
      checked={checked ?? false}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
      className={className}
    />
  ),
}));

import { ReminderForm } from './reminder-form';
import type { ReminderWithCourse } from '../actions/reminder-actions';

const mockCourses = [
  { id: 'c-1', title: 'React Fundamentals' },
  { id: 'c-2', title: 'Advanced TypeScript' },
];

const mockInitialData: ReminderWithCourse = {
  id: 'r-1',
  user_id: 'u-1',
  course_id: 'c-1',
  days_of_week: ['mon', 'wed'],
  time: '14:30:00',
  timezone: 'UTC',
  enabled: true,
  channels: ['in_app', 'email'],
  created_at: '2026-02-10T00:00:00Z',
  updated_at: '2026-02-10T00:00:00Z',
  course_title: 'React Fundamentals',
};

describe('ReminderForm', () => {
  const onClose = vi.fn();
  const onSubmit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders create mode title', () => {
    render(
      <ReminderForm
        mode="create"
        courses={mockCourses}
        isOpen={true}
        onClose={onClose}
        onSubmit={onSubmit}
      />
    );
    expect(screen.getByText('Create Study Reminder')).toBeDefined();
  });

  it('renders edit mode title', () => {
    render(
      <ReminderForm
        mode="edit"
        initialData={mockInitialData}
        courses={mockCourses}
        isOpen={true}
        onClose={onClose}
        onSubmit={onSubmit}
      />
    );
    expect(screen.getByText('Edit Reminder')).toBeDefined();
  });

  it('renders nothing when isOpen is false', () => {
    render(
      <ReminderForm
        mode="create"
        courses={mockCourses}
        isOpen={false}
        onClose={onClose}
        onSubmit={onSubmit}
      />
    );
    expect(screen.queryByText('Create Study Reminder')).toBeNull();
  });

  it('renders all seven day checkboxes', () => {
    render(
      <ReminderForm
        mode="create"
        courses={mockCourses}
        isOpen={true}
        onClose={onClose}
        onSubmit={onSubmit}
      />
    );
    expect(screen.getByText('Mon')).toBeDefined();
    expect(screen.getByText('Tue')).toBeDefined();
    expect(screen.getByText('Wed')).toBeDefined();
    expect(screen.getByText('Thu')).toBeDefined();
    expect(screen.getByText('Fri')).toBeDefined();
    expect(screen.getByText('Sat')).toBeDefined();
    expect(screen.getByText('Sun')).toBeDefined();
  });

  it('renders all delivery channel options', () => {
    render(
      <ReminderForm
        mode="create"
        courses={mockCourses}
        isOpen={true}
        onClose={onClose}
        onSubmit={onSubmit}
      />
    );
    expect(screen.getByText('In-App')).toBeDefined();
    expect(screen.getByText('Push Notification')).toBeDefined();
    expect(screen.getByText('Email')).toBeDefined();
    expect(screen.getByText('Slack')).toBeDefined();
    expect(screen.getByText('Discord')).toBeDefined();
  });

  it('renders a time input field', () => {
    render(
      <ReminderForm
        mode="create"
        courses={mockCourses}
        isOpen={true}
        onClose={onClose}
        onSubmit={onSubmit}
      />
    );
    const timeInput = screen.getByLabelText('Time');
    expect(timeInput).toBeDefined();
    expect(timeInput.getAttribute('type')).toBe('time');
  });

  it('renders the course label and select trigger', () => {
    render(
      <ReminderForm
        mode="create"
        courses={mockCourses}
        isOpen={true}
        onClose={onClose}
        onSubmit={onSubmit}
      />
    );
    expect(screen.getByText('Course')).toBeDefined();
    expect(screen.getByText('Select a course')).toBeDefined();
  });

  it('calls onClose when Cancel button is clicked', () => {
    render(
      <ReminderForm
        mode="create"
        courses={mockCourses}
        isOpen={true}
        onClose={onClose}
        onSubmit={onSubmit}
      />
    );
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows Create Reminder submit button in create mode', () => {
    render(
      <ReminderForm
        mode="create"
        courses={mockCourses}
        isOpen={true}
        onClose={onClose}
        onSubmit={onSubmit}
      />
    );
    expect(screen.getByText('Create Reminder')).toBeDefined();
  });

  it('shows Save Changes submit button in edit mode', () => {
    render(
      <ReminderForm
        mode="edit"
        initialData={mockInitialData}
        courses={mockCourses}
        isOpen={true}
        onClose={onClose}
        onSubmit={onSubmit}
      />
    );
    expect(screen.getByText('Save Changes')).toBeDefined();
  });

  it('shows Saving... text when isPending is true', () => {
    render(
      <ReminderForm
        mode="create"
        courses={mockCourses}
        isOpen={true}
        onClose={onClose}
        onSubmit={onSubmit}
        isPending={true}
      />
    );
    expect(screen.getByText('Saving...')).toBeDefined();
  });

  it('disables submit button when isPending is true', () => {
    render(
      <ReminderForm
        mode="create"
        courses={mockCourses}
        isOpen={true}
        onClose={onClose}
        onSubmit={onSubmit}
        isPending={true}
      />
    );
    const btn = screen.getByText('Saving...').closest('button')!;
    expect(btn.disabled).toBe(true);
  });
});
