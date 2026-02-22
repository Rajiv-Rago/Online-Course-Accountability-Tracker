import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { BuddyWithProfile } from '@/lib/types';

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));

import { BuddyCard } from './buddy-card';
import { BuddyList } from './buddy-list';
import { BuddyRequestList } from './buddy-request-list';
import { BuddySearchResultCard } from './buddy-search-result-card';

const makeBuddy = (overrides: Partial<BuddyWithProfile> = {}): BuddyWithProfile => ({
  id: 'rel-1',
  buddy_user_id: 'user-2',
  status: 'accepted',
  display_name: 'Jane Doe',
  avatar_url: null,
  created_at: '2024-06-10T08:00:00Z',
  is_requester: false,
  ...overrides,
});

// ============================================================
// BuddyCard
// ============================================================
describe('BuddyCard', () => {
  it('renders display name', () => {
    render(<BuddyCard buddy={makeBuddy()} />);
    expect(screen.getByText('Jane Doe')).toBeDefined();
  });

  it('renders initials in avatar fallback', () => {
    render(<BuddyCard buddy={makeBuddy()} />);
    expect(screen.getByText('JD')).toBeDefined();
  });

  it('renders connected date', () => {
    render(<BuddyCard buddy={makeBuddy({ created_at: '2024-06-10T08:00:00Z' })} />);
    expect(screen.getByText(/Connected/)).toBeDefined();
    expect(screen.getByText(/Jun 10/)).toBeDefined();
  });

  it('renders View link pointing to buddy profile', () => {
    render(<BuddyCard buddy={makeBuddy({ buddy_user_id: 'user-xyz' })} />);
    const link = screen.getByText('View').closest('a');
    expect(link?.getAttribute('href')).toBe('/social/buddies/user-xyz');
  });

  it('shows ?? when display_name is empty', () => {
    render(<BuddyCard buddy={makeBuddy({ display_name: '' })} />);
    expect(screen.getByText('??')).toBeDefined();
  });
});

// ============================================================
// BuddyList
// ============================================================
describe('BuddyList', () => {
  it('renders nothing when buddies array is empty', () => {
    const { container } = render(<BuddyList buddies={[]} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders heading with buddy count', () => {
    render(<BuddyList buddies={[makeBuddy({ id: 'b1' }), makeBuddy({ id: 'b2' })]} />);
    expect(screen.getByText('Study Buddies (2)')).toBeDefined();
  });

  it('renders a BuddyCard for each buddy', () => {
    render(
      <BuddyList
        buddies={[
          makeBuddy({ id: 'b1', display_name: 'Alice' }),
          makeBuddy({ id: 'b2', display_name: 'Bob' }),
        ]}
      />
    );
    expect(screen.getByText('Alice')).toBeDefined();
    expect(screen.getByText('Bob')).toBeDefined();
  });
});

// ============================================================
// BuddyRequestList
// ============================================================
describe('BuddyRequestList', () => {
  it('renders nothing when requests array is empty', () => {
    const { container } = render(
      <BuddyRequestList title="Incoming Requests" requests={[]} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders the title with request count', () => {
    render(
      <BuddyRequestList
        title="Incoming Requests"
        requests={[makeBuddy({ id: 'r1', status: 'pending', is_requester: false })]}
      />
    );
    expect(screen.getByText('Incoming Requests (1)')).toBeDefined();
  });

  it('passes onAccept and onDecline to BuddyRequestCard children', () => {
    const onAccept = vi.fn();
    const onDecline = vi.fn();
    render(
      <BuddyRequestList
        title="Incoming"
        requests={[makeBuddy({ id: 'r1', status: 'pending', is_requester: false })]}
        onAccept={onAccept}
        onDecline={onDecline}
      />
    );
    fireEvent.click(screen.getByText('Accept'));
    expect(onAccept).toHaveBeenCalledWith('r1');
    fireEvent.click(screen.getByText('Decline'));
    expect(onDecline).toHaveBeenCalledWith('r1');
  });
});

// ============================================================
// BuddySearchResultCard
// ============================================================
describe('BuddySearchResultCard', () => {
  const baseUser = {
    id: 'u1',
    display_name: 'Alice Smith',
    avatar_url: null,
    relationship: 'none' as const,
  };

  it('renders user display name', () => {
    render(<BuddySearchResultCard user={baseUser} onSendRequest={vi.fn()} />);
    expect(screen.getByText('Alice Smith')).toBeDefined();
  });

  it('renders initials in avatar fallback', () => {
    render(<BuddySearchResultCard user={baseUser} onSendRequest={vi.fn()} />);
    expect(screen.getByText('AS')).toBeDefined();
  });

  it('shows Add button for relationship "none"', () => {
    render(<BuddySearchResultCard user={baseUser} onSendRequest={vi.fn()} />);
    expect(screen.getByText('Add')).toBeDefined();
  });

  it('calls onSendRequest with user id when Add is clicked', () => {
    const onSendRequest = vi.fn();
    render(<BuddySearchResultCard user={baseUser} onSendRequest={onSendRequest} />);
    fireEvent.click(screen.getByText('Add'));
    expect(onSendRequest).toHaveBeenCalledWith('u1');
  });

  it('shows "Connected" text for accepted relationship', () => {
    render(
      <BuddySearchResultCard
        user={{ ...baseUser, relationship: 'accepted' }}
        onSendRequest={vi.fn()}
      />
    );
    expect(screen.getByText('Connected')).toBeDefined();
    expect(screen.queryByText('Add')).toBeNull();
  });

  it('shows "Pending" text for pending_outgoing relationship', () => {
    render(
      <BuddySearchResultCard
        user={{ ...baseUser, relationship: 'pending_outgoing' }}
        onSendRequest={vi.fn()}
      />
    );
    expect(screen.getByText('Pending')).toBeDefined();
    expect(screen.queryByText('Add')).toBeNull();
  });

  it('shows "Pending" text for pending_incoming relationship', () => {
    render(
      <BuddySearchResultCard
        user={{ ...baseUser, relationship: 'pending_incoming' }}
        onSendRequest={vi.fn()}
      />
    );
    expect(screen.getByText('Pending')).toBeDefined();
  });

  it('disables Add button when isLoading is true', () => {
    render(<BuddySearchResultCard user={baseUser} onSendRequest={vi.fn()} isLoading={true} />);
    const btn = screen.getByText('Add').closest('button');
    expect(btn?.disabled).toBe(true);
  });
});
