import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { RiskScoreBadge } from './risk-score-badge';

describe('RiskScoreBadge', () => {
  it('renders risk score as text', () => {
    render(<RiskScoreBadge score={75} level="high" />);
    expect(screen.getByText('75')).toBeDefined();
  });

  it('includes score and level in title attribute', () => {
    render(<RiskScoreBadge score={30} level="low" />);
    expect(screen.getByTitle('Risk score: 30/100 (low)')).toBeDefined();
  });

  it('applies correct color classes for each risk level', () => {
    const { container, rerender } = render(<RiskScoreBadge score={20} level="low" />);
    expect(container.firstElementChild?.className).toContain('green');

    rerender(<RiskScoreBadge score={50} level="medium" />);
    expect(container.firstElementChild?.className).toContain('yellow');

    rerender(<RiskScoreBadge score={75} level="high" />);
    expect(container.firstElementChild?.className).toContain('orange');

    rerender(<RiskScoreBadge score={95} level="critical" />);
    expect(container.firstElementChild?.className).toContain('red');
  });

  it('applies size classes', () => {
    const { container, rerender } = render(<RiskScoreBadge score={50} level="medium" size="sm" />);
    expect(container.firstElementChild?.className).toContain('h-8');

    rerender(<RiskScoreBadge score={50} level="medium" size="lg" />);
    expect(container.firstElementChild?.className).toContain('h-16');
  });

  it('defaults to md size', () => {
    const { container } = render(<RiskScoreBadge score={50} level="medium" />);
    expect(container.firstElementChild?.className).toContain('h-12');
  });
});
