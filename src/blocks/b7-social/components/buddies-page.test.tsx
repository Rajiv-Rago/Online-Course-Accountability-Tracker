import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { BuddyWithProfile } from '@/lib/types';

// Mock hooks
const mockBuddiesReturn: {
  data: { accepted: BuddyWithProfile[]; incoming: BuddyWithProfile[]; outgoing: BuddyWithProfile[] } | undefined;
  isLoading: boolean;
  error: Error | null;
} = {
  data: undefined,
  isLoading: false,
  error: null,
};

const mockAcceptMutate = vi.fn();
const mockDeclineMutate = vi.fn();
const mockMutationsReturn = {
  accept: { mutate: mockAcceptMutate, isPending: false },
  decline: { mutate: mockDeclineMutate, isPending: false },
  sendRequest: { mutate: vi.fn(), isPending: false },
  remove: { mutate: vi.fn(), isPending: false },
  isLoading: false,
};

vi.mock('../hooks/use-buddies', () => ({
  useBuddies: () => mockBuddiesReturn,
}));

vi.mock('../hooks/use-buddy-mutations', () => ({
  useBuddyMutations: () => mockMutationsReturn,
}));

// Mock child components
vi.mock('./buddy-list', () => ({
  BuddyList: ({ buddies }: any) => (
    <div data-testid="buddy-list">
      {buddies.map((b: any) => (
        <span key={b.id}>{b.display_name}</span>
      ))}
    </div>
  ),
}));

vi.mock('./buddy-request-list', () => ({
  BuddyRequestList: ({ title, requests, onAccept, onDecline }: any) => (
    requests.length > 0 ? (
      <div data-testid={`request-list-${title}`}>
        <span>{title} ({requests.length})</span>
        {requests.map((r: any) => (
          <div key={r.id}>
            <span>{r.display_name}</span>
            {onAccept && <button onClick={() => onAccept(r.id)}>Accept</button>}
            {onDecline && <button onClick={() => onDecline(r.id)}>Decline</button>}
          </div>
        ))}
      </div>
    ) : null
  ),
}));

vi.mock('./buddy-search', () => ({
  BuddySearch: ({ open }: any) => open ? <div data-testid="buddy-search">Search Dialog</div> : null,
}));

vi.mock('./empty-buddies', () => ({
  EmptyBuddies: ({ onSearchClick }: any) => (
    <div data-testid="empty-buddies">
      <button onClick={onSearchClick}>Find Study Buddies</button>
    </div>
  ),
}));

import { BuddiesPage } from './buddies-page';

const makeBuddy = (overrides: Partial<BuddyWithProfile> = {}): BuddyWithProfile => ({
  id: 'rel-1',
  buddy_user_id: 'user-2',
  status: 'accepted',
  display_name: 'Alice',
  avatar_url: null,
  created_at: '2024-06-10T08:00:00Z',
  is_requester: false,
  ...overrides,
});

describe('BuddiesPage', () => {
  beforeEach(() => {
    mockBuddiesReturn.data = undefined;
    mockBuddiesReturn.isLoading = false;
    mockBuddiesReturn.error = null;
    mockAcceptMutate.mockClear();
    mockDeclineMutate.mockClear();
  });

  it('shows loading skeletons when isLoading is true', () => {
    mockBuddiesReturn.isLoading = true;
    const { container } = render(<BuddiesPage />);
    expect(screen.queryByText('Buddies')).toBeNull();
    expect(container.querySelectorAll('[class*="animate-pulse"], [data-slot="skeleton"]').length).toBeGreaterThan(0);
  });

  it('shows error message when error occurs', () => {
    mockBuddiesReturn.error = new Error('Server error');
    render(<BuddiesPage />);
    expect(screen.getByText('Failed to load buddies: Server error')).toBeDefined();
  });

  it('shows empty state when no buddies, incoming, or outgoing', () => {
    mockBuddiesReturn.data = { accepted: [], incoming: [], outgoing: [] };
    render(<BuddiesPage />);
    expect(screen.getByTestId('empty-buddies')).toBeDefined();
  });

  it('shows Find Buddies button in header', () => {
    mockBuddiesReturn.data = { accepted: [], incoming: [], outgoing: [] };
    render(<BuddiesPage />);
    expect(screen.getByText('Find Buddies')).toBeDefined();
  });

  it('opens search dialog when Find Buddies is clicked', () => {
    mockBuddiesReturn.data = { accepted: [], incoming: [], outgoing: [] };
    render(<BuddiesPage />);
    expect(screen.queryByTestId('buddy-search')).toBeNull();
    fireEvent.click(screen.getByText('Find Buddies'));
    expect(screen.getByTestId('buddy-search')).toBeDefined();
  });

  it('opens search dialog from empty state button', () => {
    mockBuddiesReturn.data = { accepted: [], incoming: [], outgoing: [] };
    render(<BuddiesPage />);
    fireEvent.click(screen.getByText('Find Study Buddies'));
    expect(screen.getByTestId('buddy-search')).toBeDefined();
  });

  it('renders accepted buddies in buddy list', () => {
    mockBuddiesReturn.data = {
      accepted: [makeBuddy({ id: 'a1', display_name: 'Alice' })],
      incoming: [],
      outgoing: [],
    };
    render(<BuddiesPage />);
    expect(screen.getByTestId('buddy-list')).toBeDefined();
    expect(screen.getByText('Alice')).toBeDefined();
  });

  it('does not show empty state when there are accepted buddies', () => {
    mockBuddiesReturn.data = {
      accepted: [makeBuddy()],
      incoming: [],
      outgoing: [],
    };
    render(<BuddiesPage />);
    expect(screen.queryByTestId('empty-buddies')).toBeNull();
  });

  it('renders incoming requests section', () => {
    mockBuddiesReturn.data = {
      accepted: [],
      incoming: [makeBuddy({ id: 'i1', display_name: 'Incoming User', is_requester: false })],
      outgoing: [],
    };
    render(<BuddiesPage />);
    expect(screen.getByText('Incoming User')).toBeDefined();
  });

  it('calls accept.mutate when accepting an incoming request', () => {
    mockBuddiesReturn.data = {
      accepted: [],
      incoming: [makeBuddy({ id: 'req-1', display_name: 'Pending User', is_requester: false })],
      outgoing: [],
    };
    render(<BuddiesPage />);
    fireEvent.click(screen.getByText('Accept'));
    expect(mockAcceptMutate).toHaveBeenCalledWith('req-1');
  });

  it('calls decline.mutate when declining an incoming request', () => {
    mockBuddiesReturn.data = {
      accepted: [],
      incoming: [makeBuddy({ id: 'req-2', display_name: 'Pending User', is_requester: false })],
      outgoing: [],
    };
    render(<BuddiesPage />);
    fireEvent.click(screen.getByText('Decline'));
    expect(mockDeclineMutate).toHaveBeenCalledWith('req-2');
  });

  it('renders heading text "Buddies"', () => {
    mockBuddiesReturn.data = { accepted: [], incoming: [], outgoing: [] };
    render(<BuddiesPage />);
    expect(screen.getByText('Buddies')).toBeDefined();
  });
});
