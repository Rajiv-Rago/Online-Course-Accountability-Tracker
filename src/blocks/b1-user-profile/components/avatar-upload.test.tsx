import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// Mock the hook BEFORE import
const mockUpload = vi.fn();
const mockRemove = vi.fn();

vi.mock('../hooks/use-avatar-upload', () => ({
  useAvatarUpload: vi.fn(() => ({
    upload: mockUpload,
    remove: mockRemove,
    isUploading: false,
    progress: 0,
    error: null,
  })),
}));

import { AvatarUpload } from './avatar-upload';
import { useAvatarUpload } from '../hooks/use-avatar-upload';

describe('AvatarUpload', () => {
  const defaultProps = {
    userId: 'user-1',
    avatarUrl: null as string | null,
    displayName: 'Alice Smith',
    onAvatarChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAvatarUpload).mockReturnValue({
      upload: mockUpload,
      remove: mockRemove,
      isUploading: false,
      progress: 0,
      error: null,
    });
  });

  it('renders avatar fallback with initials', () => {
    render(<AvatarUpload {...defaultProps} />);
    expect(screen.getByText('AS')).toBeDefined();
  });

  it('shows single initial for single-word name', () => {
    render(<AvatarUpload {...defaultProps} displayName="Alice" />);
    expect(screen.getByText('A')).toBeDefined();
  });

  it('shows "?" when display name is empty', () => {
    render(<AvatarUpload {...defaultProps} displayName="" />);
    expect(screen.getByText('?')).toBeDefined();
  });

  it('renders Upload button', () => {
    render(<AvatarUpload {...defaultProps} />);
    expect(screen.getByText('Upload')).toBeDefined();
  });

  it('does not render Remove button when no avatar', () => {
    render(<AvatarUpload {...defaultProps} avatarUrl={null} />);
    expect(screen.queryByText('Remove')).toBeNull();
  });

  it('renders Remove button when avatar URL is present', () => {
    render(<AvatarUpload {...defaultProps} avatarUrl="https://example.com/avatar.jpg" />);
    expect(screen.getByText('Remove')).toBeDefined();
  });

  it('renders file size limit text', () => {
    render(<AvatarUpload {...defaultProps} />);
    expect(screen.getByText('Max 2MB. JPG, PNG, or WebP.')).toBeDefined();
  });

  it('disables Upload button when uploading', () => {
    vi.mocked(useAvatarUpload).mockReturnValue({
      upload: mockUpload,
      remove: mockRemove,
      isUploading: true,
      progress: 50,
      error: null,
    });
    render(<AvatarUpload {...defaultProps} />);
    const uploadBtn = screen.getByText('Upload').closest('button') as HTMLButtonElement;
    expect(uploadBtn.disabled).toBe(true);
  });

  it('shows progress bar when uploading', () => {
    vi.mocked(useAvatarUpload).mockReturnValue({
      upload: mockUpload,
      remove: mockRemove,
      isUploading: true,
      progress: 50,
      error: null,
    });
    render(<AvatarUpload {...defaultProps} />);
    // Progress component renders with role progressbar
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toBeDefined();
  });

  it('displays error message when error exists', () => {
    vi.mocked(useAvatarUpload).mockReturnValue({
      upload: mockUpload,
      remove: mockRemove,
      isUploading: false,
      progress: 0,
      error: 'File size must be under 2MB',
    });
    render(<AvatarUpload {...defaultProps} />);
    expect(screen.getByText('File size must be under 2MB')).toBeDefined();
  });

  it('renders hidden file input with correct accept attribute', () => {
    render(<AvatarUpload {...defaultProps} />);
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeDefined();
    expect(fileInput.accept).toBe('image/jpeg,image/png,image/webp');
    expect(fileInput.className).toContain('hidden');
  });
});
