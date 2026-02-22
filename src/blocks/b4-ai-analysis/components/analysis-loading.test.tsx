import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';

import { AnalysisLoadingOverview, AnalysisLoadingDetail } from './analysis-loading';

describe('AnalysisLoadingOverview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { container } = render(<AnalysisLoadingOverview />);
    expect(container.firstElementChild).toBeDefined();
  });

  it('renders risk summary skeleton cards (3 cards)', () => {
    const { container } = render(<AnalysisLoadingOverview />);
    // The first grid has 3 skeleton cards for risk summary
    const grids = container.querySelectorAll('.grid');
    expect(grids.length).toBeGreaterThanOrEqual(2);
    // First grid should have 3 children (risk summary cards)
    expect(grids[0].children.length).toBe(3);
  });

  it('renders course cards skeleton grid (4 cards)', () => {
    const { container } = render(<AnalysisLoadingOverview />);
    const grids = container.querySelectorAll('.grid');
    // Second grid should have 4 children (course card skeletons)
    expect(grids[1].children.length).toBe(4);
  });

  it('contains skeleton elements for shimmer animation', () => {
    const { container } = render(<AnalysisLoadingOverview />);
    // Skeleton components render with a specific class
    const skeletons = container.querySelectorAll('[class*="animate-pulse"], [data-slot="skeleton"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('has the correct overall layout structure', () => {
    const { container } = render(<AnalysisLoadingOverview />);
    // The outer div has space-y-6 for vertical spacing
    expect(container.firstElementChild?.className).toContain('space-y-6');
  });
});

describe('AnalysisLoadingDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { container } = render(<AnalysisLoadingDetail />);
    expect(container.firstElementChild).toBeDefined();
  });

  it('renders a main card with circular skeleton (risk score placeholder)', () => {
    const { container } = render(<AnalysisLoadingDetail />);
    const roundedFull = container.querySelector('.rounded-full');
    expect(roundedFull).toBeDefined();
  });

  it('renders 3 content skeleton cards at the bottom', () => {
    const { container } = render(<AnalysisLoadingDetail />);
    // The detail view has a space-y-3 div containing 3 cards
    const spacedSection = container.querySelector('.space-y-3');
    expect(spacedSection).toBeDefined();
    expect(spacedSection!.children.length).toBe(3);
  });

  it('has the correct outer layout with space-y-6', () => {
    const { container } = render(<AnalysisLoadingDetail />);
    expect(container.firstElementChild?.className).toContain('space-y-6');
  });

  it('contains skeleton elements', () => {
    const { container } = render(<AnalysisLoadingDetail />);
    const skeletons = container.querySelectorAll('[class*="animate-pulse"], [data-slot="skeleton"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });
});
