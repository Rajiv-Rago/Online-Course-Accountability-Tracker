import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { CourseEmptyState } from './course-empty-state';

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe('CourseEmptyState', () => {
  it('renders heading', () => {
    render(<CourseEmptyState />);
    expect(screen.getByText('No courses yet')).toBeDefined();
  });

  it('renders description text', () => {
    render(<CourseEmptyState />);
    expect(screen.getByText(/Start tracking your learning journey/)).toBeDefined();
  });

  it('has link to create course', () => {
    render(<CourseEmptyState />);
    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe('/courses/new');
  });

  it('shows CTA button text', () => {
    render(<CourseEmptyState />);
    expect(screen.getByText('Add Your First Course')).toBeDefined();
  });
});
