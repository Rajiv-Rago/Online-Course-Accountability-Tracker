import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { usePathname } from 'next/navigation';

vi.mock('next/link', () => ({
  default: ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}));

import { SettingsSidebar } from './settings-sidebar';

describe('SettingsSidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(usePathname).mockReturnValue('/settings/profile');
  });

  it('renders the Settings heading', () => {
    render(<SettingsSidebar />);
    expect(screen.getByText('Settings')).toBeDefined();
  });

  it('renders all 5 navigation links', () => {
    render(<SettingsSidebar />);
    expect(screen.getByText('Profile')).toBeDefined();
    expect(screen.getByText('Notifications')).toBeDefined();
    expect(screen.getByText('Integrations')).toBeDefined();
    expect(screen.getByText('AI Model')).toBeDefined();
    expect(screen.getByText('Account')).toBeDefined();
  });

  it('renders correct hrefs for each link', () => {
    render(<SettingsSidebar />);
    const links = screen.getAllByRole('link');
    const hrefs = links.map((link) => link.getAttribute('href'));
    expect(hrefs).toContain('/settings/profile');
    expect(hrefs).toContain('/settings/notifications');
    expect(hrefs).toContain('/settings/integrations');
    expect(hrefs).toContain('/settings/ai');
    expect(hrefs).toContain('/settings/account');
  });

  it('highlights the active link based on pathname', () => {
    vi.mocked(usePathname).mockReturnValue('/settings/profile');
    render(<SettingsSidebar />);
    const profileLink = screen.getByText('Profile').closest('a');
    expect(profileLink?.className).toContain('bg-primary');
  });

  it('does not highlight inactive links', () => {
    vi.mocked(usePathname).mockReturnValue('/settings/profile');
    render(<SettingsSidebar />);
    const accountLink = screen.getByText('Account').closest('a');
    expect(accountLink?.className).not.toContain('bg-primary/10');
  });

  it('highlights different link when pathname changes', () => {
    vi.mocked(usePathname).mockReturnValue('/settings/account');
    render(<SettingsSidebar />);
    const accountLink = screen.getByText('Account').closest('a');
    expect(accountLink?.className).toContain('bg-primary');
  });

  it('renders 5 links total', () => {
    render(<SettingsSidebar />);
    const links = screen.getAllByRole('link');
    expect(links.length).toBe(5);
  });
});
