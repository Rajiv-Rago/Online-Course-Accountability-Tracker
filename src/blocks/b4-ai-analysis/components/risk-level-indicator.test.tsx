import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

import { RiskLevelIndicator } from './risk-level-indicator';
import type { RiskLevel } from '@/lib/types';

describe('RiskLevelIndicator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders "Low Risk" label for low level', () => {
    render(<RiskLevelIndicator level="low" />);
    expect(screen.getByText('Low Risk')).toBeDefined();
  });

  it('renders "Medium Risk" label for medium level', () => {
    render(<RiskLevelIndicator level="medium" />);
    expect(screen.getByText('Medium Risk')).toBeDefined();
  });

  it('renders "High Risk" label for high level', () => {
    render(<RiskLevelIndicator level="high" />);
    expect(screen.getByText('High Risk')).toBeDefined();
  });

  it('renders "Critical Risk" label for critical level', () => {
    render(<RiskLevelIndicator level="critical" />);
    expect(screen.getByText('Critical Risk')).toBeDefined();
  });

  it('applies green classes for low risk', () => {
    const { container } = render(<RiskLevelIndicator level="low" />);
    const badge = container.firstElementChild;
    expect(badge?.className).toContain('bg-green-100');
    expect(badge?.className).toContain('text-green-800');
  });

  it('applies yellow classes for medium risk', () => {
    const { container } = render(<RiskLevelIndicator level="medium" />);
    const badge = container.firstElementChild;
    expect(badge?.className).toContain('bg-yellow-100');
    expect(badge?.className).toContain('text-yellow-800');
  });

  it('applies orange classes for high risk', () => {
    const { container } = render(<RiskLevelIndicator level="high" />);
    const badge = container.firstElementChild;
    expect(badge?.className).toContain('bg-orange-100');
    expect(badge?.className).toContain('text-orange-800');
  });

  it('applies red classes for critical risk', () => {
    const { container } = render(<RiskLevelIndicator level="critical" />);
    const badge = container.firstElementChild;
    expect(badge?.className).toContain('bg-red-100');
    expect(badge?.className).toContain('text-red-800');
  });

  it('renders dark mode green classes for low risk', () => {
    const { container } = render(<RiskLevelIndicator level="low" />);
    const badge = container.firstElementChild;
    expect(badge?.className).toContain('dark:bg-green-950');
    expect(badge?.className).toContain('dark:text-green-400');
  });

  it('renders as a Badge component with outline variant', () => {
    const { container } = render(<RiskLevelIndicator level="medium" />);
    const badge = container.firstElementChild;
    // shadcn Badge with variant="outline" typically has border class
    expect(badge?.className).toContain('border');
  });
});
