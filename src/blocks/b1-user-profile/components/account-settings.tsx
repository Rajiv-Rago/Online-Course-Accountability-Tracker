'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useProfile } from '../hooks/use-profile';
import {
  changeEmail,
  changePassword,
  exportUserData,
  deleteAccount,
} from '../actions/account-actions';

export function AccountSettings() {
  const { profile, isLoading } = useProfile();
  const router = useRouter();

  // Email
  const [newEmail, setNewEmail] = useState('');
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);

  // Password
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Export
  const [isExporting, setIsExporting] = useState(false);

  // Delete
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleChangeEmail = async () => {
    if (!newEmail) return;
    setIsUpdatingEmail(true);
    try {
      const result = await changeEmail({ newEmail });
      if (result.success) {
        toast.success('Verification email sent to your new address');
        setNewEmail('');
      } else {
        toast.error(result.error ?? 'Failed to update email');
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update email');
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) return;
    if (newPassword !== confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }
    setIsUpdatingPassword(true);
    try {
      const result = await changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });
      if (result.success) {
        toast.success('Password updated');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        toast.error(result.error ?? 'Failed to update password');
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update password');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const json = await exportUserData();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `course-tracker-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Data exported');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDelete = async () => {
    if (deleteConfirmation !== 'DELETE') return;
    setIsDeleting(true);
    try {
      const result = await deleteAccount({ confirmation: deleteConfirmation });
      if (result.success) {
        toast.success('Account deleted');
        router.push('/login');
      } else {
        toast.error(result.error ?? 'Failed to delete account');
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete account');
    } finally {
      setIsDeleting(false);
    }
  };

  // Password strength indicator
  const getPasswordStrength = (pw: string) => {
    let score = 0;
    if (pw.length >= 8) score++;
    if (pw.length >= 12) score++;
    if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
    if (/\d/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    return score;
  };

  const strength = getPasswordStrength(newPassword);
  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'][strength] ?? '';
  const strengthColor = ['', 'bg-destructive', 'bg-orange-500', 'bg-yellow-500', 'bg-teal-500', 'bg-green-500'][strength] ?? '';

  if (isLoading) {
    return <div className="text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Account Settings</h3>
        <p className="text-sm text-muted-foreground">
          Manage your email, password, and account.
        </p>
      </div>
      <Separator />

      {/* Change Email */}
      <div className="space-y-3">
        <h4 className="font-medium">Change Email</h4>
        <p className="text-sm text-muted-foreground">
          Current: {profile?.email}
        </p>
        <div className="max-w-sm space-y-2">
          <Label htmlFor="new_email">New Email</Label>
          <Input
            id="new_email"
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="new@email.com"
          />
          <Button
            onClick={handleChangeEmail}
            disabled={!newEmail || isUpdatingEmail}
            size="sm"
          >
            {isUpdatingEmail ? 'Updating...' : 'Update Email'}
          </Button>
        </div>
      </div>

      <Separator />

      {/* Change Password */}
      <div className="space-y-3">
        <h4 className="font-medium">Change Password</h4>
        <div className="max-w-sm space-y-3">
          <div className="space-y-2">
            <Label htmlFor="current_password">Current Password</Label>
            <Input
              id="current_password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new_password">New Password</Label>
            <Input
              id="new_password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            {newPassword && (
              <div className="space-y-1">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded ${
                        i <= strength ? strengthColor : 'bg-muted'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">{strengthLabel}</p>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm_password">Confirm New Password</Label>
            <Input
              id="confirm_password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-xs text-destructive">Passwords don&apos;t match</p>
            )}
          </div>
          <Button
            onClick={handleChangePassword}
            disabled={
              !currentPassword ||
              !newPassword ||
              !confirmPassword ||
              newPassword !== confirmPassword ||
              isUpdatingPassword
            }
            size="sm"
          >
            {isUpdatingPassword ? 'Updating...' : 'Update Password'}
          </Button>
        </div>
      </div>

      <Separator />

      {/* Export Data */}
      <div className="space-y-3">
        <h4 className="font-medium">Export Data</h4>
        <p className="text-sm text-muted-foreground">
          Download all your data as JSON.
        </p>
        <Button variant="outline" onClick={handleExport} disabled={isExporting}>
          {isExporting ? 'Exporting...' : 'Export My Data'}
        </Button>
      </div>

      <Separator />

      {/* Danger Zone */}
      <div className="space-y-3 rounded-md border border-destructive/50 p-4">
        <h4 className="font-medium text-destructive">Danger Zone</h4>
        <p className="text-sm text-muted-foreground">
          Permanently delete your account and all associated data. This action cannot be undone.
        </p>
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="destructive">Delete Account</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Account</DialogTitle>
              <DialogDescription>
                This will permanently delete your account and all data. Type
                &quot;DELETE&quot; below to confirm.
              </DialogDescription>
            </DialogHeader>
            <Input
              value={deleteConfirmation}
              onChange={(e) => setDeleteConfirmation(e.target.value)}
              placeholder='Type "DELETE" to confirm'
            />
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDeleteDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteConfirmation !== 'DELETE' || isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete Account'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
