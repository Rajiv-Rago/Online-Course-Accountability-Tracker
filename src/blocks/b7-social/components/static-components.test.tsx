import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock next/navigation (globally available but re-mock usePathname for control)
const mockPathname = vi.fn().mockReturnValue('/social/buddies');
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => mockPathname(),
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
}));

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href, className, ...props }: any) => (
    <a href={href} className={className} {...props}>{children}</a>
  ),
}));

import { SocialTabs } from './social-tabs';
import { EmptyBuddies } from './empty-buddies';
import { EmptyAchievements } from './empty-achievements';
import { BuddyPrivacyNote } from './buddy-privacy-note';

// ============================================================
// SocialTabs
// ============================================================
describe('SocialTabs', () => {
  it('renders all three tab links', () => {
    render(<SocialTabs />);
    expect(screen.getByText('Buddies')).toBeDefined();
    expect(screen.getByText('Achievements')).toBeDefined();
    expect(screen.getByText('Leaderboard')).toBeDefined();
  });

  it('links to correct routes', () => {
    render(<SocialTabs />);
    const buddiesLink = screen.getByText('Buddies').closest('a');
    const achievementsLink = screen.getByText('Achievements').closest('a');
    const leaderboardLink = screen.getByText('Leaderboard').closest('a');
    expect(buddiesLink?.getAttribute('href')).toBe('/social/buddies');
    expect(achievementsLink?.getAttribute('href')).toBe('/social/achievements');
    expect(leaderboardLink?.getAttribute('href')).toBe('/social/leaderboard');
  });

  it('highlights the active tab based on pathname', () => {
    mockPathname.mockReturnValue('/social/buddies');
    const { container } = render(<SocialTabs />);
    const buddiesLink = screen.getByText('Buddies').closest('a');
    expect(buddiesLink?.className).toContain('border-primary');
  });

  it('does not highlight inactive tabs', () => {
    mockPathname.mockReturnValue('/social/buddies');
    render(<SocialTabs />);
    const achievementsLink = screen.getByText('Achievements').closest('a');
    expect(achievementsLink?.className).toContain('border-transparent');
  });

  it('highlights achievements tab when on achievements path', () => {
    mockPathname.mockReturnValue('/social/achievements');
    render(<SocialTabs />);
    const achievementsLink = screen.getByText('Achievements').closest('a');
    expect(achievementsLink?.className).toContain('border-primary');
  });
});

// ============================================================
// EmptyBuddies
// ============================================================
describe('EmptyBuddies', () => {
  it('renders the heading', () => {
    render(<EmptyBuddies onSearchClick={vi.fn()} />);
    expect(screen.getByText('No study buddies yet')).toBeDefined();
  });

  it('renders the description text', () => {
    render(<EmptyBuddies onSearchClick={vi.fn()} />);
    expect(screen.getByText(/Connect with other learners/)).toBeDefined();
  });

  it('renders Find Study Buddies button', () => {
    render(<EmptyBuddies onSearchClick={vi.fn()} />);
    expect(screen.getByText('Find Study Buddies')).toBeDefined();
  });

  it('calls onSearchClick when the button is clicked', () => {
    const onClick = vi.fn();
    render(<EmptyBuddies onSearchClick={onClick} />);
    fireEvent.click(screen.getByText('Find Study Buddies'));
    expect(onClick).toHaveBeenCalledOnce();
  });
});

// ============================================================
// EmptyAchievements
// ============================================================
describe('EmptyAchievements', () => {
  it('renders the heading', () => {
    render(<EmptyAchievements />);
    expect(screen.getByText('No achievements earned yet')).toBeDefined();
  });

  it('renders the description text', () => {
    render(<EmptyAchievements />);
    expect(screen.getByText(/Start studying to unlock achievements/)).toBeDefined();
  });
});

// ============================================================
// BuddyPrivacyNote
// ============================================================
describe('BuddyPrivacyNote', () => {
  it('renders Privacy heading', () => {
    render(<BuddyPrivacyNote />);
    expect(screen.getByText('Privacy')).toBeDefined();
  });

  it('renders the privacy explanation text', () => {
    render(<BuddyPrivacyNote />);
    expect(screen.getByText(/Buddies can only see your study streaks/)).toBeDefined();
  });

  it('mentions that course details remain private', () => {
    render(<BuddyPrivacyNote />);
    expect(screen.getByText(/Your course details, notes, and personal settings remain private/)).toBeDefined();
  });
});
