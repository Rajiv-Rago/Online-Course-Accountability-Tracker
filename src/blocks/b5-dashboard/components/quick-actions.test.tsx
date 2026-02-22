import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

import { QuickActions } from './quick-actions';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('QuickActions', () => {
  it('renders 3 action links', () => {
    render(<QuickActions />);

    const links = screen.getAllByRole('link');
    expect(links.length).toBe(3);
  });

  it('renders "Start Timer" link pointing to /progress/timer', () => {
    render(<QuickActions />);

    const link = screen.getByText('Start Timer').closest('a');
    expect(link?.getAttribute('href')).toBe('/progress/timer');
  });

  it('renders "Log Session" link pointing to /progress/log', () => {
    render(<QuickActions />);

    const link = screen.getByText('Log Session').closest('a');
    expect(link?.getAttribute('href')).toBe('/progress/log');
  });

  it('renders "Add Course" link pointing to /courses/new', () => {
    render(<QuickActions />);

    const link = screen.getByText('Add Course').closest('a');
    expect(link?.getAttribute('href')).toBe('/courses/new');
  });

  it('renders all action labels', () => {
    render(<QuickActions />);

    expect(screen.getByText('Start Timer')).toBeDefined();
    expect(screen.getByText('Log Session')).toBeDefined();
    expect(screen.getByText('Add Course')).toBeDefined();
  });
});
