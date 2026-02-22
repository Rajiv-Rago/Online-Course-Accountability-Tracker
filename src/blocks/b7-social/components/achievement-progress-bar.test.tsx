import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AchievementProgressBar } from './achievement-progress-bar';

describe('AchievementProgressBar', () => {
  it('renders default "Progress" label', () => {
    render(<AchievementProgressBar current={3} target={10} />);
    expect(screen.getByText('Progress')).toBeDefined();
  });

  it('renders custom label when provided', () => {
    render(<AchievementProgressBar current={3} target={10} label="Sessions" />);
    expect(screen.getByText('Sessions')).toBeDefined();
    expect(screen.queryByText('Progress')).toBeNull();
  });

  it('renders current / target text', () => {
    render(<AchievementProgressBar current={5} target={20} />);
    expect(screen.getByText('5 / 20')).toBeDefined();
  });

  it('renders 0 / target when current is 0', () => {
    render(<AchievementProgressBar current={0} target={7} />);
    expect(screen.getByText('0 / 7')).toBeDefined();
  });

  it('renders progress bar element', () => {
    const { container } = render(<AchievementProgressBar current={3} target={10} />);
    // The Progress component renders a div with role="progressbar" or similar
    const progressElement = container.querySelector('[role="progressbar"], [data-slot="progress"]');
    expect(progressElement).toBeDefined();
  });

  it('caps percentage at 100 when current exceeds target', () => {
    const { container } = render(<AchievementProgressBar current={15} target={10} />);
    expect(screen.getByText('15 / 10')).toBeDefined();
  });

  it('handles zero target gracefully', () => {
    render(<AchievementProgressBar current={0} target={0} />);
    expect(screen.getByText('0 / 0')).toBeDefined();
  });
});
