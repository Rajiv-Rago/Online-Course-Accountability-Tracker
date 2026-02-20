import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Clock } from 'lucide-react';
import { StatCard } from './stat-card';

describe('StatCard', () => {
  it('renders value and label', () => {
    render(<StatCard icon={Clock} label="Hours Studied" value={42} />);
    expect(screen.getByText('42')).toBeDefined();
    expect(screen.getByText('Hours Studied')).toBeDefined();
  });

  it('renders string value', () => {
    render(<StatCard icon={Clock} label="Streak" value="7 days" />);
    expect(screen.getByText('7 days')).toBeDefined();
  });

  it('renders trend indicator when provided', () => {
    render(<StatCard icon={Clock} label="This Week" value={10} trend="up" />);
    expect(screen.getByText('Up')).toBeDefined();
  });

  it('renders custom trend label', () => {
    render(<StatCard icon={Clock} label="Score" value={85} trend="up" trendLabel="+15%" />);
    expect(screen.getByText('+15%')).toBeDefined();
  });

  it('renders down trend', () => {
    render(<StatCard icon={Clock} label="Risk" value={30} trend="down" />);
    expect(screen.getByText('Down')).toBeDefined();
  });

  it('renders stable trend', () => {
    render(<StatCard icon={Clock} label="Score" value={50} trend="stable" />);
    expect(screen.getByText('Stable')).toBeDefined();
  });

  it('does not render trend when not provided', () => {
    render(<StatCard icon={Clock} label="Total" value={100} />);
    expect(screen.queryByText('Up')).toBeNull();
    expect(screen.queryByText('Down')).toBeNull();
    expect(screen.queryByText('Stable')).toBeNull();
  });
});
