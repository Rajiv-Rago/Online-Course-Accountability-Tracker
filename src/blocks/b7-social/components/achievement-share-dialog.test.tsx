import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AchievementShareDialog } from './achievement-share-dialog';

describe('AchievementShareDialog', () => {
  const baseProps = {
    open: true,
    onOpenChange: vi.fn(),
    achievementName: 'First Steps',
    currentlyShared: false,
    onConfirm: vi.fn(),
    isLoading: false,
  };

  it('renders "Share Achievement" title when not currently shared', () => {
    render(<AchievementShareDialog {...baseProps} />);
    expect(screen.getByText('Share Achievement')).toBeDefined();
  });

  it('renders "Hide Achievement" title when currently shared', () => {
    render(<AchievementShareDialog {...baseProps} currentlyShared={true} />);
    expect(screen.getByText('Hide Achievement')).toBeDefined();
  });

  it('shows share description with achievement name when not shared', () => {
    render(<AchievementShareDialog {...baseProps} />);
    expect(screen.getByText(/Share "First Steps" with your study buddies\?/)).toBeDefined();
  });

  it('shows hide description with achievement name when shared', () => {
    render(<AchievementShareDialog {...baseProps} currentlyShared={true} />);
    expect(screen.getByText(/Hide "First Steps" from your buddies\?/)).toBeDefined();
  });

  it('shows share explanation text when not shared', () => {
    render(<AchievementShareDialog {...baseProps} />);
    expect(screen.getByText('Your buddies will be able to see this achievement when viewing your profile.')).toBeDefined();
  });

  it('shows hide explanation text when shared', () => {
    render(<AchievementShareDialog {...baseProps} currentlyShared={true} />);
    expect(screen.getByText('Your buddies will no longer see this achievement on your profile.')).toBeDefined();
  });

  it('shows "Share" button text when not shared', () => {
    render(<AchievementShareDialog {...baseProps} />);
    expect(screen.getByText('Share')).toBeDefined();
  });

  it('shows "Hide" button text when shared', () => {
    render(<AchievementShareDialog {...baseProps} currentlyShared={true} />);
    expect(screen.getByText('Hide')).toBeDefined();
  });

  it('calls onConfirm when action button is clicked', () => {
    const onConfirm = vi.fn();
    render(<AchievementShareDialog {...baseProps} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByText('Share'));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('calls onOpenChange(false) when Cancel is clicked', () => {
    const onOpenChange = vi.fn();
    render(<AchievementShareDialog {...baseProps} onOpenChange={onOpenChange} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('disables buttons when isLoading is true', () => {
    render(<AchievementShareDialog {...baseProps} isLoading={true} />);
    const cancelBtn = screen.getByText('Cancel').closest('button');
    const shareBtn = screen.getByText('Share').closest('button');
    expect(cancelBtn?.disabled).toBe(true);
    expect(shareBtn?.disabled).toBe(true);
  });

  it('does not disable buttons when isLoading is false', () => {
    render(<AchievementShareDialog {...baseProps} isLoading={false} />);
    const cancelBtn = screen.getByText('Cancel').closest('button');
    const shareBtn = screen.getByText('Share').closest('button');
    expect(cancelBtn?.disabled).toBe(false);
    expect(shareBtn?.disabled).toBe(false);
  });
});
