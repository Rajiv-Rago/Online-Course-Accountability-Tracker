import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmptyState } from './empty-state';

// Mock Next.js Link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

import { vi } from 'vitest';
import React from 'react';

describe('EmptyState', () => {
  it('renders personalized welcome with display name', () => {
    render(<EmptyState displayName="John" />);
    expect(screen.getByText(/Welcome, John/)).toBeDefined();
  });

  it('renders generic welcome when displayName is empty', () => {
    render(<EmptyState displayName="" />);
    const heading = screen.getByRole('heading');
    expect(heading.textContent).toBe('Welcome!');
  });

  it('has link to add first course', () => {
    render(<EmptyState displayName="Test" />);
    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe('/courses/new');
  });

  it('shows CTA button text', () => {
    render(<EmptyState displayName="Test" />);
    expect(screen.getByText('Add Your First Course')).toBeDefined();
  });
});
