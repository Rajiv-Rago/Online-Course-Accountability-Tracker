import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock shadcn Dialog to render children directly (avoids Radix portal issues in jsdom)
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ open, children }: any) => (open ? <div role="dialog">{children}</div> : null),
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogDescription: ({ children }: any) => <p>{children}</p>,
}));

import { BuddyRemoveDialog } from './buddy-remove-dialog';

describe('BuddyRemoveDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    buddyName: 'Alice Smith',
    onConfirm: vi.fn(),
    isLoading: false,
  };

  it('renders dialog title', () => {
    render(<BuddyRemoveDialog {...defaultProps} />);
    expect(screen.getByRole('heading', { name: 'Remove Buddy' })).toBeDefined();
  });

  it('shows the buddy name in the description', () => {
    render(<BuddyRemoveDialog {...defaultProps} />);
    expect(screen.getByText(/Are you sure you want to remove Alice Smith as a study buddy\?/)).toBeDefined();
  });

  it('displays consequence list items', () => {
    render(<BuddyRemoveDialog {...defaultProps} />);
    expect(screen.getByText("You will no longer see each other's activity")).toBeDefined();
    expect(screen.getByText('They will be removed from your leaderboard')).toBeDefined();
    expect(screen.getByText('You can send a new request later')).toBeDefined();
  });

  it('calls onConfirm when Remove Buddy button is clicked', () => {
    const onConfirm = vi.fn();
    render(<BuddyRemoveDialog {...defaultProps} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByRole('button', { name: 'Remove Buddy' }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('calls onOpenChange(false) when Cancel button is clicked', () => {
    const onOpenChange = vi.fn();
    render(<BuddyRemoveDialog {...defaultProps} onOpenChange={onOpenChange} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('disables both buttons when isLoading is true', () => {
    render(<BuddyRemoveDialog {...defaultProps} isLoading={true} />);
    const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
    const removeBtn = screen.getByRole('button', { name: 'Remove Buddy' });
    expect((cancelBtn as HTMLButtonElement).disabled).toBe(true);
    expect((removeBtn as HTMLButtonElement).disabled).toBe(true);
  });

  it('does not disable buttons when isLoading is false', () => {
    render(<BuddyRemoveDialog {...defaultProps} isLoading={false} />);
    const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
    const removeBtn = screen.getByRole('button', { name: 'Remove Buddy' });
    expect((cancelBtn as HTMLButtonElement).disabled).toBe(false);
    expect((removeBtn as HTMLButtonElement).disabled).toBe(false);
  });

  it('renders with a different buddy name', () => {
    render(<BuddyRemoveDialog {...defaultProps} buddyName="Bob Jones" />);
    expect(screen.getByText(/Are you sure you want to remove Bob Jones as a study buddy\?/)).toBeDefined();
  });
});
