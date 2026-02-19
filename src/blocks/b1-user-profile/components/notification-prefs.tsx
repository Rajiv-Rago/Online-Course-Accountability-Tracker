'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { useProfile } from '../hooks/use-profile';
import { updateNotificationPrefs } from '../actions/notification-actions';
import type { NotificationPrefs as NotifPrefsType } from '../lib/profile-validation';

const NOTIFICATION_TYPES = [
  { key: 'notify_daily_reminder' as const, label: 'Daily Reminder' },
  { key: 'notify_streak_warning' as const, label: 'Streak Warning' },
  { key: 'notify_weekly_report' as const, label: 'Weekly Report' },
  { key: 'notify_achievement' as const, label: 'Achievement Unlocked' },
  { key: 'notify_risk_alert' as const, label: 'Course At-Risk Alert' },
];

const CHANNELS = [
  { key: 'notify_email' as const, label: 'Email' },
  { key: 'notify_push' as const, label: 'Push' },
  { key: 'notify_slack' as const, label: 'Slack' },
  { key: 'notify_discord' as const, label: 'Discord' },
];

export function NotificationPrefs() {
  const { profile, isLoading, refetch } = useProfile();
  const [isSaving, setIsSaving] = useState(false);
  const [prefs, setPrefs] = useState<NotifPrefsType>({
    notify_email: true,
    notify_push: true,
    notify_slack: false,
    notify_discord: false,
    notify_daily_reminder: true,
    notify_streak_warning: true,
    notify_weekly_report: true,
    notify_achievement: true,
    notify_risk_alert: true,
  });

  useEffect(() => {
    if (profile) {
      setPrefs({
        notify_email: profile.notify_email,
        notify_push: profile.notify_push,
        notify_slack: profile.notify_slack,
        notify_discord: profile.notify_discord,
        notify_daily_reminder: profile.notify_daily_reminder,
        notify_streak_warning: profile.notify_streak_warning,
        notify_weekly_report: profile.notify_weekly_report,
        notify_achievement: profile.notify_achievement,
        notify_risk_alert: profile.notify_risk_alert,
      });
    }
  }, [profile]);

  const toggle = (key: keyof NotifPrefsType) => {
    setPrefs((p) => ({ ...p, [key]: !p[key] }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateNotificationPrefs(prefs);
      await refetch();
      toast.success('Notification preferences saved');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Notification Preferences</h3>
        <p className="text-sm text-muted-foreground">
          Choose which notifications you receive and how.
        </p>
      </div>
      <Separator />

      {/* Notification type toggles */}
      <div className="space-y-4">
        {NOTIFICATION_TYPES.map(({ key, label }) => (
          <div key={key} className="flex items-center justify-between">
            <Label htmlFor={key}>{label}</Label>
            <Switch
              id={key}
              checked={prefs[key]}
              onCheckedChange={() => toggle(key)}
            />
          </div>
        ))}
      </div>

      <Separator />

      {/* Channel master switches */}
      <div>
        <h4 className="text-sm font-medium mb-3">Channel Toggles (master switches)</h4>
        <div className="space-y-4">
          {CHANNELS.map(({ key, label }) => {
            const needsWebhook =
              (key === 'notify_slack' && !profile?.slack_webhook_url) ||
              (key === 'notify_discord' && !profile?.discord_webhook_url);

            return (
              <div key={key} className="flex items-center justify-between">
                <div>
                  <Label htmlFor={key}>{label}</Label>
                  {needsWebhook && (
                    <p className="text-xs text-muted-foreground">
                      Configure in Integrations tab
                    </p>
                  )}
                </div>
                <Switch
                  id={key}
                  checked={prefs[key]}
                  onCheckedChange={() => toggle(key)}
                  disabled={needsWebhook}
                />
              </div>
            );
          })}
        </div>
      </div>

      <Button onClick={handleSave} disabled={isSaving}>
        {isSaving ? 'Saving...' : 'Save Preferences'}
      </Button>
    </div>
  );
}
