import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// Mock hooks and actions BEFORE importing component
const mockRefetch = vi.fn();
const mockPush = vi.fn();

vi.mock('../hooks/use-profile', () => ({
  useProfile: vi.fn(() => ({
    profile: null,
    isLoading: true,
    error: null,
    refetch: mockRefetch,
  })),
}));

vi.mock('../actions/account-actions', () => ({
  changeEmail: vi.fn().mockResolvedValue({ success: true }),
  changePassword: vi.fn().mockResolvedValue({ success: true }),
  exportUserData: vi.fn().mockResolvedValue('{"data":"test"}'),
  deleteAccount: vi.fn().mockResolvedValue({ success: true }),
}));

// Override navigation mock to capture push
vi.mock('next/navigation', async () => {
  return {
    useRouter: vi.fn(() => ({
      push: mockPush,
      replace: vi.fn(),
      back: vi.fn(),
      refresh: vi.fn(),
      prefetch: vi.fn(),
    })),
    usePathname: vi.fn(() => '/settings/account'),
    useSearchParams: vi.fn(() => new URLSearchParams()),
    redirect: vi.fn(),
  };
});

// Mock Dialog components to render inline (avoids Radix portal issues in jsdom)
vi.mock('@/components/ui/dialog', async () => {
  const ReactModule = await import('react');
  const Ctx = ReactModule.createContext<{ open?: boolean; onOpenChange?: (open: boolean) => void }>({});
  return {
    Dialog: ({ children, open, onOpenChange }: { children: ReactModule.ReactNode; open?: boolean; onOpenChange?: (open: boolean) => void }) => (
      <Ctx.Provider value={{ open, onOpenChange }}>
        <div data-testid="dialog">{children}</div>
      </Ctx.Provider>
    ),
    DialogTrigger: ({ children, asChild }: { children: ReactModule.ReactNode; asChild?: boolean }) => {
      const { onOpenChange } = ReactModule.useContext(Ctx);
      const handleClick = () => { onOpenChange?.(true); };
      if (asChild && ReactModule.isValidElement(children)) {
        return ReactModule.cloneElement(children as ReactModule.ReactElement<Record<string, unknown>>, { onClick: handleClick });
      }
      return ReactModule.createElement('button', { onClick: handleClick }, children);
    },
    DialogContent: ({ children }: { children: ReactModule.ReactNode }) => {
      const { open } = ReactModule.useContext(Ctx);
      if (!open) return null;
      return ReactModule.createElement('div', { 'data-testid': 'dialog-content' }, children);
    },
    DialogHeader: ({ children }: { children: ReactModule.ReactNode }) => ReactModule.createElement('div', null, children),
    DialogTitle: ({ children }: { children: ReactModule.ReactNode }) => ReactModule.createElement('h2', null, children),
    DialogDescription: ({ children }: { children: ReactModule.ReactNode }) => ReactModule.createElement('p', null, children),
    DialogFooter: ({ children }: { children: ReactModule.ReactNode }) => ReactModule.createElement('div', null, children),
  };
});

import { AccountSettings } from './account-settings';
import { useProfile } from '../hooks/use-profile';
import { changeEmail, changePassword, exportUserData, deleteAccount } from '../actions/account-actions';

const mockProfile = {
  id: 'user-1',
  email: 'alice@example.com',
  display_name: 'Alice',
  timezone: 'UTC',
  theme: 'system' as const,
  motivation_style: 'balanced' as const,
  experience_level: 'beginner' as const,
  daily_study_goal_mins: 60,
  weekly_study_goal_mins: 300,
  avatar_url: null,
  slack_webhook_url: null,
  discord_webhook_url: null,
};

describe('AccountSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state when profile is loading', () => {
    vi.mocked(useProfile).mockReturnValue({
      profile: null,
      isLoading: true,
      error: null,
      refetch: mockRefetch,
    });
    render(<AccountSettings />);
    expect(screen.getByText('Loading...')).toBeDefined();
  });

  it('renders account settings heading when loaded', () => {
    vi.mocked(useProfile).mockReturnValue({
      profile: mockProfile,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
    render(<AccountSettings />);
    expect(screen.getByText('Account Settings')).toBeDefined();
  });

  it('displays current email', () => {
    vi.mocked(useProfile).mockReturnValue({
      profile: mockProfile,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
    render(<AccountSettings />);
    expect(screen.getByText(/alice@example.com/)).toBeDefined();
  });

  it('renders change email input and button', () => {
    vi.mocked(useProfile).mockReturnValue({
      profile: mockProfile,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
    render(<AccountSettings />);
    expect(screen.getByLabelText('New Email')).toBeDefined();
    expect(screen.getByText('Update Email')).toBeDefined();
  });

  it('disables Update Email button when email field is empty', () => {
    vi.mocked(useProfile).mockReturnValue({
      profile: mockProfile,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
    render(<AccountSettings />);
    const btn = screen.getByText('Update Email').closest('button') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it('calls changeEmail when Update Email is clicked with email entered', async () => {
    vi.mocked(useProfile).mockReturnValue({
      profile: mockProfile,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
    render(<AccountSettings />);
    fireEvent.change(screen.getByLabelText('New Email'), {
      target: { value: 'bob@example.com' },
    });
    fireEvent.click(screen.getByText('Update Email'));
    await waitFor(() => {
      expect(changeEmail).toHaveBeenCalledWith({ newEmail: 'bob@example.com' });
    });
  });

  it('renders password change fields', () => {
    vi.mocked(useProfile).mockReturnValue({
      profile: mockProfile,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
    render(<AccountSettings />);
    expect(screen.getByLabelText('Current Password')).toBeDefined();
    expect(screen.getByLabelText('New Password')).toBeDefined();
    expect(screen.getByLabelText('Confirm New Password')).toBeDefined();
  });

  it('shows password strength indicator when password entered', () => {
    vi.mocked(useProfile).mockReturnValue({
      profile: mockProfile,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
    render(<AccountSettings />);
    fireEvent.change(screen.getByLabelText('New Password'), {
      target: { value: 'Str0ng!Pass@123' },
    });
    // Should show one of the strength labels
    expect(screen.getByText(/Strong|Very Strong/)).toBeDefined();
  });

  it('shows password mismatch message when passwords differ', () => {
    vi.mocked(useProfile).mockReturnValue({
      profile: mockProfile,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
    render(<AccountSettings />);
    fireEvent.change(screen.getByLabelText('New Password'), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByLabelText('Confirm New Password'), {
      target: { value: 'different456' },
    });
    expect(screen.getByText("Passwords don't match")).toBeDefined();
  });

  it('renders Export My Data button and calls export on click', async () => {
    vi.mocked(useProfile).mockReturnValue({
      profile: mockProfile,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<AccountSettings />);

    // Mock DOM methods for download AFTER render so render's appendChild is not intercepted
    const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation((node) => node);
    const removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation((node) => node);

    fireEvent.click(screen.getByText('Export My Data'));

    await waitFor(() => {
      expect(exportUserData).toHaveBeenCalledOnce();
    });

    appendChildSpy.mockRestore();
    removeChildSpy.mockRestore();
  });

  it('renders Delete Account button in danger zone', () => {
    vi.mocked(useProfile).mockReturnValue({
      profile: mockProfile,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
    render(<AccountSettings />);
    expect(screen.getByText('Danger Zone')).toBeDefined();
    expect(screen.getByText('Delete Account')).toBeDefined();
  });

  it('opens delete confirmation dialog when Delete Account is clicked', async () => {
    vi.mocked(useProfile).mockReturnValue({
      profile: mockProfile,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
    render(<AccountSettings />);
    fireEvent.click(screen.getByText('Delete Account'));
    await waitFor(() => {
      expect(screen.getByText(/Type.*DELETE.*below to confirm/i)).toBeDefined();
    });
  });

  it('disables confirm delete button until "DELETE" is typed', async () => {
    vi.mocked(useProfile).mockReturnValue({
      profile: mockProfile,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
    render(<AccountSettings />);
    fireEvent.click(screen.getByText('Delete Account'));

    // Wait for dialog to open
    await waitFor(() => {
      expect(screen.getAllByText('Delete Account').length).toBeGreaterThanOrEqual(2);
    });

    // The confirm button in the dialog should be disabled
    const dialogButtons = screen.getAllByText('Delete Account');
    const confirmButton = dialogButtons[dialogButtons.length - 1].closest('button') as HTMLButtonElement;
    expect(confirmButton.disabled).toBe(true);

    // Type DELETE in the confirmation input
    const confirmInput = screen.getByPlaceholderText('Type "DELETE" to confirm');
    fireEvent.change(confirmInput, { target: { value: 'DELETE' } });

    // Now button should be enabled
    expect(confirmButton.disabled).toBe(false);
  });
});
