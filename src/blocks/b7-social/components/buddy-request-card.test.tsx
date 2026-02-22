import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { BuddyWithProfile } from '@/lib/types';

// Mock Radix Avatar to render fallback immediately (avoids image load delay in jsdom)
vi.mock('@/components/ui/avatar', () => ({
  Avatar: ({ children, className }: any) => <span className={className}>{children}</span>,
  AvatarImage: ({ alt }: any) => <img alt={alt} />,
  AvatarFallback: ({ children }: any) => <span>{children}</span>,
}));

import { BuddyRequestCard } from './buddy-request-card';

const makeRequest = (overrides: Partial<BuddyWithProfile> = {}): BuddyWithProfile => ({
  id: 'rel-1',
  buddy_user_id: 'user-2',
  status: 'pending',
  display_name: 'Jane Doe',
  avatar_url: null,
  created_at: '2024-06-10T08:00:00Z',
  is_requester: false,
  ...overrides,
});

describe('BuddyRequestCard', () => {
  it('renders the display name', () => {
    render(<BuddyRequestCard request={makeRequest()} />);
    expect(screen.getByText('Jane Doe')).toBeDefined();
  });

  it('renders initials in avatar fallback', () => {
    render(<BuddyRequestCard request={makeRequest()} />);
    expect(screen.getByText('JD')).toBeDefined();
  });

  it('shows "Wants to connect" for incoming requests', () => {
    render(<BuddyRequestCard request={makeRequest({ is_requester: false })} />);
    expect(screen.getByText('Wants to connect')).toBeDefined();
  });

  it('shows Accept and Decline buttons for incoming requests', () => {
    render(<BuddyRequestCard request={makeRequest({ is_requester: false })} onAccept={vi.fn()} onDecline={vi.fn()} />);
    expect(screen.getByText('Accept')).toBeDefined();
    expect(screen.getByText('Decline')).toBeDefined();
  });

  it('calls onAccept with request id when Accept is clicked', () => {
    const onAccept = vi.fn();
    render(<BuddyRequestCard request={makeRequest({ id: 'rel-42' })} onAccept={onAccept} onDecline={vi.fn()} />);
    fireEvent.click(screen.getByText('Accept'));
    expect(onAccept).toHaveBeenCalledWith('rel-42');
  });

  it('calls onDecline with request id when Decline is clicked', () => {
    const onDecline = vi.fn();
    render(<BuddyRequestCard request={makeRequest({ id: 'rel-42' })} onAccept={vi.fn()} onDecline={onDecline} />);
    fireEvent.click(screen.getByText('Decline'));
    expect(onDecline).toHaveBeenCalledWith('rel-42');
  });

  it('shows "Request sent" and Pending for outgoing requests', () => {
    render(<BuddyRequestCard request={makeRequest({ is_requester: true })} />);
    expect(screen.getByText('Request sent')).toBeDefined();
    expect(screen.getByText('Pending')).toBeDefined();
  });

  it('does not show Accept/Decline buttons for outgoing requests', () => {
    render(<BuddyRequestCard request={makeRequest({ is_requester: true })} />);
    expect(screen.queryByText('Accept')).toBeNull();
    expect(screen.queryByText('Decline')).toBeNull();
  });

  it('disables buttons when isLoading is true', () => {
    render(
      <BuddyRequestCard
        request={makeRequest()}
        onAccept={vi.fn()}
        onDecline={vi.fn()}
        isLoading={true}
      />
    );
    const acceptBtn = screen.getByText('Accept').closest('button');
    const declineBtn = screen.getByText('Decline').closest('button');
    expect(acceptBtn?.disabled).toBe(true);
    expect(declineBtn?.disabled).toBe(true);
  });

  it('renders avatar image when avatar_url is provided', () => {
    render(
      <BuddyRequestCard
        request={makeRequest({ avatar_url: 'https://example.com/avatar.png' })}
      />
    );
    const img = screen.getByAltText('Jane Doe');
    expect(img).toBeDefined();
  });

  it('falls back to ?? for single-char name edge case', () => {
    render(<BuddyRequestCard request={makeRequest({ display_name: '' })} />);
    expect(screen.getByText('??')).toBeDefined();
  });
});
