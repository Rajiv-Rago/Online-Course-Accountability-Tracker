import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { BuddyWithProfile } from '@/lib/types';
import type { PublicBuddyActivity } from '../lib/buddy-privacy';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/social/buddies/user-2',
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
}));

// Hook return values
const mockActivityReturn: {
  data: PublicBuddyActivity | undefined;
  isLoading: boolean;
  error: Error | null;
} = {
  data: undefined,
  isLoading: false,
  error: null,
};

const mockBuddiesReturn: {
  data: { accepted: BuddyWithProfile[]; incoming: BuddyWithProfile[]; outgoing: BuddyWithProfile[] } | undefined;
} = {
  data: undefined,
};

const mockRemoveMutate = vi.fn();
const mockMutationsReturn = {
  remove: { mutate: mockRemoveMutate, isPending: false },
  accept: { mutate: vi.fn(), isPending: false },
  decline: { mutate: vi.fn(), isPending: false },
  sendRequest: { mutate: vi.fn(), isPending: false },
  isLoading: false,
};

vi.mock('../hooks/use-buddy-activity', () => ({
  useBuddyActivity: () => mockActivityReturn,
}));

vi.mock('../hooks/use-buddies', () => ({
  useBuddies: () => mockBuddiesReturn,
}));

vi.mock('../hooks/use-buddy-mutations', () => ({
  useBuddyMutations: () => mockMutationsReturn,
}));

vi.mock('../lib/buddy-privacy', () => ({
  formatLastActive: (v: string | null) => v ? 'Recently' : 'Never',
}));

vi.mock('../lib/achievement-definitions', () => ({
  ACHIEVEMENT_MAP: new Map([
    ['first_session', { name: 'First Steps', description: 'Log your first session', category: 'milestone', maxProgress: 1 }],
  ]),
}));

vi.mock('../lib/achievement-icons', () => ({
  ACHIEVEMENT_ICONS: {},
}));

// Mock child components
vi.mock('./buddy-privacy-note', () => ({
  BuddyPrivacyNote: () => <div data-testid="privacy-note">Privacy Note</div>,
}));

vi.mock('./buddy-remove-dialog', () => ({
  BuddyRemoveDialog: ({ open, buddyName, onConfirm }: any) =>
    open ? (
      <div data-testid="remove-dialog">
        <span>{buddyName}</span>
        <button onClick={onConfirm}>Confirm Remove</button>
      </div>
    ) : null,
}));

import { BuddyActivityView } from './buddy-activity-view';

const makeActivity = (overrides: Partial<PublicBuddyActivity> = {}): PublicBuddyActivity => ({
  profile: { id: 'user-2', display_name: 'Jane Doe', avatar_url: null },
  streak: 5,
  hoursThisWeek: 12,
  activeCoursesCount: 3,
  lastActive: '2024-06-20T10:00:00Z',
  sharedAchievements: [],
  ...overrides,
});

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

describe('BuddyActivityView', () => {
  beforeEach(() => {
    mockActivityReturn.data = undefined;
    mockActivityReturn.isLoading = false;
    mockActivityReturn.error = null;
    mockBuddiesReturn.data = undefined;
    mockPush.mockClear();
    mockRemoveMutate.mockClear();
  });

  it('shows loading skeletons when isLoading is true', () => {
    mockActivityReturn.isLoading = true;
    const { container } = render(<BuddyActivityView buddyUserId="user-2" />);
    expect(container.querySelectorAll('[class*="animate-pulse"], [data-slot="skeleton"]').length).toBeGreaterThan(0);
  });

  it('shows error message when error occurs', () => {
    mockActivityReturn.error = new Error('Not found');
    render(<BuddyActivityView buddyUserId="user-2" />);
    expect(screen.getByText('Not found')).toBeDefined();
  });

  it('shows fallback message when activity is null', () => {
    mockActivityReturn.data = undefined;
    render(<BuddyActivityView buddyUserId="user-2" />);
    expect(screen.getByText('Could not load buddy activity')).toBeDefined();
  });

  it('shows Back to Buddies button on error state', () => {
    mockActivityReturn.error = new Error('Oops');
    render(<BuddyActivityView buddyUserId="user-2" />);
    fireEvent.click(screen.getByText('Back to Buddies'));
    expect(mockPush).toHaveBeenCalledWith('/social/buddies');
  });

  it('renders buddy display name and avatar initials', () => {
    mockActivityReturn.data = makeActivity();
    render(<BuddyActivityView buddyUserId="user-2" />);
    expect(screen.getByText('Jane Doe')).toBeDefined();
    expect(screen.getByText('JD')).toBeDefined();
  });

  it('renders last active text', () => {
    mockActivityReturn.data = makeActivity();
    render(<BuddyActivityView buddyUserId="user-2" />);
    expect(screen.getByText(/Last active: Recently/)).toBeDefined();
  });

  it('renders streak, hours, and active courses stats', () => {
    mockActivityReturn.data = makeActivity({ streak: 5, hoursThisWeek: 12, activeCoursesCount: 3 });
    render(<BuddyActivityView buddyUserId="user-2" />);
    expect(screen.getByText('5')).toBeDefined();
    expect(screen.getByText('Day Streak')).toBeDefined();
    expect(screen.getByText('12')).toBeDefined();
    expect(screen.getByText('Hours/Week')).toBeDefined();
    expect(screen.getByText('3')).toBeDefined();
    expect(screen.getByText('Active Courses')).toBeDefined();
  });

  it('renders shared achievements section when there are shared achievements', () => {
    mockActivityReturn.data = makeActivity({
      sharedAchievements: [
        { achievement_type: 'first_session', earned_at: '2024-06-15T10:00:00Z', metadata: null },
      ],
    });
    render(<BuddyActivityView buddyUserId="user-2" />);
    expect(screen.getByText('Shared Achievements')).toBeDefined();
    expect(screen.getByText('First Steps')).toBeDefined();
  });

  it('does not render shared achievements section when empty', () => {
    mockActivityReturn.data = makeActivity({ sharedAchievements: [] });
    render(<BuddyActivityView buddyUserId="user-2" />);
    expect(screen.queryByText('Shared Achievements')).toBeNull();
  });

  it('renders privacy note', () => {
    mockActivityReturn.data = makeActivity();
    render(<BuddyActivityView buddyUserId="user-2" />);
    expect(screen.getByTestId('privacy-note')).toBeDefined();
  });

  it('shows Remove Buddy button when relationship exists', () => {
    mockActivityReturn.data = makeActivity();
    mockBuddiesReturn.data = {
      accepted: [makeBuddy({ buddy_user_id: 'user-2' })],
      incoming: [],
      outgoing: [],
    };
    render(<BuddyActivityView buddyUserId="user-2" />);
    expect(screen.getByText('Remove Buddy')).toBeDefined();
  });

  it('does not show Remove Buddy button when no relationship found', () => {
    mockActivityReturn.data = makeActivity();
    mockBuddiesReturn.data = {
      accepted: [],
      incoming: [],
      outgoing: [],
    };
    render(<BuddyActivityView buddyUserId="user-2" />);
    expect(screen.queryByText('Remove Buddy')).toBeNull();
  });

  it('opens remove dialog and navigates on confirm', () => {
    mockActivityReturn.data = makeActivity();
    mockBuddiesReturn.data = {
      accepted: [makeBuddy({ id: 'rel-99', buddy_user_id: 'user-2' })],
      incoming: [],
      outgoing: [],
    };
    render(<BuddyActivityView buddyUserId="user-2" />);

    // Click Remove Buddy to open dialog
    fireEvent.click(screen.getByText('Remove Buddy'));
    expect(screen.getByTestId('remove-dialog')).toBeDefined();

    // Confirm removal
    fireEvent.click(screen.getByText('Confirm Remove'));
    expect(mockRemoveMutate).toHaveBeenCalledWith('rel-99');
    expect(mockPush).toHaveBeenCalledWith('/social/buddies');
  });
});
