'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { useProfile } from '../hooks/use-profile';
import { updateProfile } from '../actions/profile-actions';
import { AvatarUpload } from './avatar-upload';
import { TimezoneSelect } from './timezone-select';
import { ThemeToggle } from './theme-toggle';
import type { ProfileFormData } from '../lib/profile-validation';

export function ProfileForm() {
  const { profile, isLoading, refetch } = useProfile();
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<ProfileFormData & { avatar_url: string | null }>({
    display_name: '',
    timezone: 'UTC',
    theme: 'system',
    motivation_style: 'balanced',
    experience_level: 'beginner',
    daily_study_goal_mins: 60,
    weekly_study_goal_mins: 300,
    avatar_url: null,
  });

  // Sync form with loaded profile
  useEffect(() => {
    if (profile) {
      setForm({
        display_name: profile.display_name,
        timezone: profile.timezone,
        theme: profile.theme,
        motivation_style: profile.motivation_style,
        experience_level: profile.experience_level,
        daily_study_goal_mins: profile.daily_study_goal_mins,
        weekly_study_goal_mins: profile.weekly_study_goal_mins,
        avatar_url: profile.avatar_url,
      });
    }
  }, [profile]);

  const isDirty =
    profile &&
    (form.display_name !== profile.display_name ||
      form.timezone !== profile.timezone ||
      form.theme !== profile.theme ||
      form.motivation_style !== profile.motivation_style ||
      form.experience_level !== profile.experience_level ||
      form.daily_study_goal_mins !== profile.daily_study_goal_mins ||
      form.weekly_study_goal_mins !== profile.weekly_study_goal_mins);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { avatar_url: _, ...data } = form;
      await updateProfile(data);
      await refetch();
      toast.success('Profile updated');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="text-muted-foreground">Loading profile...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Profile Settings</h3>
        <p className="text-sm text-muted-foreground">
          Manage your display information and preferences.
        </p>
      </div>
      <Separator />

      {/* Avatar */}
      <div className="space-y-2">
        <Label>Avatar</Label>
        <AvatarUpload
          userId={profile?.id}
          avatarUrl={form.avatar_url}
          displayName={form.display_name}
          onAvatarChange={(url) => {
            setForm((f) => ({ ...f, avatar_url: url }));
            refetch();
          }}
        />
      </div>

      {/* Display Name */}
      <div className="space-y-2">
        <Label htmlFor="display_name">Display Name</Label>
        <Input
          id="display_name"
          value={form.display_name}
          onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
          className="max-w-sm"
        />
      </div>

      {/* Email (read only) */}
      <div className="space-y-2">
        <Label>Email</Label>
        <Input value={profile?.email ?? ''} disabled className="max-w-sm" />
        <p className="text-xs text-muted-foreground">
          Change your email in the Account tab.
        </p>
      </div>

      {/* Timezone */}
      <div className="space-y-2">
        <Label>Timezone</Label>
        <div className="max-w-sm">
          <TimezoneSelect
            value={form.timezone}
            onChange={(value) => setForm((f) => ({ ...f, timezone: value }))}
          />
        </div>
      </div>

      {/* Theme */}
      <div className="space-y-2">
        <Label>Theme</Label>
        <ThemeToggle
          value={form.theme}
          onChange={(value) =>
            setForm((f) => ({
              ...f,
              theme: value as 'light' | 'dark' | 'system',
            }))
          }
        />
      </div>

      {/* Motivation Style */}
      <div className="space-y-2">
        <Label htmlFor="motivation_style">Motivation Style</Label>
        <Select
          value={form.motivation_style}
          onValueChange={(value) =>
            setForm((f) => ({
              ...f,
              motivation_style: value as ProfileFormData['motivation_style'],
            }))
          }
        >
          <SelectTrigger id="motivation_style" className="max-w-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="gentle">Gentle</SelectItem>
            <SelectItem value="balanced">Balanced</SelectItem>
            <SelectItem value="drill_sergeant">Drill Sergeant</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Experience Level */}
      <div className="space-y-2">
        <Label htmlFor="experience_level">Experience Level</Label>
        <Select
          value={form.experience_level}
          onValueChange={(value) =>
            setForm((f) => ({
              ...f,
              experience_level: value as ProfileFormData['experience_level'],
            }))
          }
        >
          <SelectTrigger id="experience_level" className="max-w-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="beginner">Beginner</SelectItem>
            <SelectItem value="intermediate">Intermediate</SelectItem>
            <SelectItem value="advanced">Advanced</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Study Goals */}
      <div className="grid grid-cols-2 gap-4 max-w-sm">
        <div className="space-y-2">
          <Label htmlFor="daily_goal">Daily Goal (min)</Label>
          <Input
            id="daily_goal"
            type="number"
            min={10}
            max={480}
            value={form.daily_study_goal_mins}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                daily_study_goal_mins: parseInt(e.target.value) || 60,
              }))
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="weekly_goal">Weekly Goal (min)</Label>
          <Input
            id="weekly_goal"
            type="number"
            min={30}
            max={3360}
            value={form.weekly_study_goal_mins}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                weekly_study_goal_mins: parseInt(e.target.value) || 300,
              }))
            }
          />
        </div>
      </div>

      <Button onClick={handleSave} disabled={!isDirty || isSaving}>
        {isSaving ? 'Saving...' : 'Save Changes'}
      </Button>
    </div>
  );
}
