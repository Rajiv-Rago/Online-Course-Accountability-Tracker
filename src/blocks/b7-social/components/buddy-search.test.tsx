import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

// Mock shadcn Dialog to render children directly (avoids Radix portal issues in jsdom)
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ open, children }: any) => (open ? <div role="dialog">{children}</div> : null),
  DialogContent: ({ children, className }: any) => <div className={className}>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
}));

// Mock shadcn ScrollArea to render children directly
vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children, className }: any) => <div className={className}>{children}</div>,
}));

// Mock shadcn Skeleton to render with animate-pulse class
vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className }: any) => <div className={`animate-pulse ${className || ''}`} />,
}));

// Mock hooks before import
const mockSendRequest = { mutate: vi.fn(), isPending: false };
vi.mock('../hooks/use-buddy-mutations', () => ({
  useBuddyMutations: () => ({
    sendRequest: mockSendRequest,
    accept: { mutate: vi.fn(), isPending: false },
    decline: { mutate: vi.fn(), isPending: false },
    remove: { mutate: vi.fn(), isPending: false },
    isLoading: false,
  }),
}));

const mockSearchReturn = { data: undefined as any, isLoading: false };
vi.mock('../hooks/use-buddy-search', () => ({
  useBuddySearch: () => mockSearchReturn,
}));

// Mock child component to simplify
vi.mock('./buddy-search-result-card', () => ({
  BuddySearchResultCard: ({ user, onSendRequest }: any) => (
    <div data-testid={`search-result-${user.id}`}>
      <span>{user.display_name}</span>
      <button onClick={() => onSendRequest(user.id)}>Add</button>
    </div>
  ),
}));

import { BuddySearch } from './buddy-search';

describe('BuddySearch', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockSearchReturn.data = undefined;
    mockSearchReturn.isLoading = false;
    mockSendRequest.mutate.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the dialog when open is true', () => {
    render(<BuddySearch open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByText('Find Study Buddies')).toBeDefined();
  });

  it('shows "Type at least 2 characters to search" initially', () => {
    render(<BuddySearch open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByText('Type at least 2 characters to search')).toBeDefined();
  });

  it('shows "No users found" when query >= 2 chars and results are empty', async () => {
    mockSearchReturn.data = [];
    render(<BuddySearch open={true} onOpenChange={vi.fn()} />);

    const input = screen.getByPlaceholderText('Search by name or email...');
    fireEvent.change(input, { target: { value: 'ab' } });

    // Wait for debounce (300ms)
    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    expect(screen.getByText('No users found')).toBeDefined();
  });

  it('renders search results when available', async () => {
    mockSearchReturn.data = [
      { id: 'u1', display_name: 'Alice Smith', avatar_url: null, relationship: 'none' as const },
      { id: 'u2', display_name: 'Bob Jones', avatar_url: null, relationship: 'accepted' as const },
    ];
    render(<BuddySearch open={true} onOpenChange={vi.fn()} />);

    const input = screen.getByPlaceholderText('Search by name or email...');
    fireEvent.change(input, { target: { value: 'al' } });

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    expect(screen.getByText('Alice Smith')).toBeDefined();
    expect(screen.getByText('Bob Jones')).toBeDefined();
  });

  it('calls sendRequest.mutate when Add is clicked on a result', async () => {
    mockSearchReturn.data = [
      { id: 'u1', display_name: 'Alice', avatar_url: null, relationship: 'none' as const },
    ];
    render(<BuddySearch open={true} onOpenChange={vi.fn()} />);

    const input = screen.getByPlaceholderText('Search by name or email...');
    fireEvent.change(input, { target: { value: 'al' } });

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    fireEvent.click(screen.getByText('Add'));
    expect(mockSendRequest.mutate).toHaveBeenCalledWith('u1');
  });

  it('shows loading skeletons when isLoading is true', () => {
    mockSearchReturn.isLoading = true;
    const { container } = render(<BuddySearch open={true} onOpenChange={vi.fn()} />);

    // Loading state should not show "No users found" or result cards
    expect(screen.queryByText('No users found')).toBeNull();
    expect(screen.queryByText('Type at least 2 characters to search')).toBeNull();
    // Skeletons should be present
    expect(container.querySelectorAll('[class*="animate-pulse"], [data-slot="skeleton"]').length).toBeGreaterThan(0);
  });

  it('debounces search input (does not update immediately)', async () => {
    mockSearchReturn.data = [];
    render(<BuddySearch open={true} onOpenChange={vi.fn()} />);

    const input = screen.getByPlaceholderText('Search by name or email...');
    fireEvent.change(input, { target: { value: 'ab' } });

    // Before debounce fires, should still show the "Type at least..." message
    expect(screen.getByText('Type at least 2 characters to search')).toBeDefined();

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    // After debounce, the query is set and results are shown
    expect(screen.queryByText('Type at least 2 characters to search')).toBeNull();
  });

  it('has search input with placeholder text', () => {
    render(<BuddySearch open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByPlaceholderText('Search by name or email...')).toBeDefined();
  });

  it('resets input value when dialog is closed and reopened', async () => {
    const { rerender } = render(<BuddySearch open={true} onOpenChange={vi.fn()} />);

    const input = screen.getByPlaceholderText('Search by name or email...');
    fireEvent.change(input, { target: { value: 'test query' } });

    // Close the dialog
    rerender(<BuddySearch open={false} onOpenChange={vi.fn()} />);

    // Re-open
    rerender(<BuddySearch open={true} onOpenChange={vi.fn()} />);

    const inputAfter = screen.getByPlaceholderText('Search by name or email...');
    expect((inputAfter as HTMLInputElement).value).toBe('');
  });
});
