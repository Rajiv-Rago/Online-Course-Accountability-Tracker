'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useProfile } from '../hooks/use-profile';
import {
  updateWebhookUrls,
  testSlackWebhook,
  testDiscordWebhook,
} from '../actions/notification-actions';

export function IntegrationSettings() {
  const { profile, isLoading, refetch } = useProfile();
  const [slackUrl, setSlackUrl] = useState('');
  const [discordUrl, setDiscordUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [slackStatus, setSlackStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [discordStatus, setDiscordStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

  useEffect(() => {
    if (profile) {
      setSlackUrl(profile.slack_webhook_url ?? '');
      setDiscordUrl(profile.discord_webhook_url ?? '');
    }
  }, [profile]);

  const handleTestSlack = async () => {
    if (!slackUrl) return;
    setSlackStatus('testing');
    const result = await testSlackWebhook(slackUrl);
    setSlackStatus(result.success ? 'success' : 'error');
    if (result.success) {
      toast.success('Slack webhook test successful');
    } else {
      toast.error(result.error ?? 'Slack test failed');
    }
  };

  const handleTestDiscord = async () => {
    if (!discordUrl) return;
    setDiscordStatus('testing');
    const result = await testDiscordWebhook(discordUrl);
    setDiscordStatus(result.success ? 'success' : 'error');
    if (result.success) {
      toast.success('Discord webhook test successful');
    } else {
      toast.error(result.error ?? 'Discord test failed');
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateWebhookUrls({
        slack_webhook_url: slackUrl || null,
        discord_webhook_url: discordUrl || null,
      });
      await refetch();
      toast.success('Integration settings saved');
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
        <h3 className="text-lg font-semibold">Integrations</h3>
        <p className="text-sm text-muted-foreground">
          Connect external services to receive notifications.
        </p>
      </div>
      <Separator />

      {/* Slack */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-medium">Slack Integration</h4>
          <StatusBadge status={slackStatus} hasUrl={!!slackUrl} />
        </div>
        <p className="text-sm text-muted-foreground">
          Send notifications to a Slack channel via webhook.
        </p>
        <div className="flex gap-2">
          <Input
            value={slackUrl}
            onChange={(e) => {
              setSlackUrl(e.target.value);
              setSlackStatus('idle');
            }}
            placeholder="https://hooks.slack.com/services/..."
            className="flex-1"
          />
          <Button
            variant="outline"
            onClick={handleTestSlack}
            disabled={!slackUrl || slackStatus === 'testing'}
          >
            {slackStatus === 'testing' ? 'Testing...' : 'Test'}
          </Button>
        </div>
      </div>

      <Separator />

      {/* Discord */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-medium">Discord Integration</h4>
          <StatusBadge status={discordStatus} hasUrl={!!discordUrl} />
        </div>
        <p className="text-sm text-muted-foreground">
          Send notifications to a Discord channel via webhook.
        </p>
        <div className="flex gap-2">
          <Input
            value={discordUrl}
            onChange={(e) => {
              setDiscordUrl(e.target.value);
              setDiscordStatus('idle');
            }}
            placeholder="https://discord.com/api/webhooks/..."
            className="flex-1"
          />
          <Button
            variant="outline"
            onClick={handleTestDiscord}
            disabled={!discordUrl || discordStatus === 'testing'}
          >
            {discordStatus === 'testing' ? 'Testing...' : 'Test'}
          </Button>
        </div>
      </div>

      <Separator />

      {/* Instructions */}
      <div className="space-y-2">
        <Label>How to set up webhooks</Label>
        <ul className="text-sm text-muted-foreground list-disc ml-5 space-y-1">
          <li>Slack: Apps &rarr; Incoming Webhooks &rarr; Add New</li>
          <li>Discord: Server Settings &rarr; Integrations &rarr; Webhooks</li>
        </ul>
      </div>

      <Button onClick={handleSave} disabled={isSaving}>
        {isSaving ? 'Saving...' : 'Save Integrations'}
      </Button>
    </div>
  );
}

function StatusBadge({
  status,
  hasUrl,
}: {
  status: 'idle' | 'testing' | 'success' | 'error';
  hasUrl: boolean;
}) {
  if (status === 'success') return <Badge variant="default">Connected</Badge>;
  if (status === 'error') return <Badge variant="destructive">Error</Badge>;
  if (status === 'testing') return <Badge variant="secondary">Testing...</Badge>;
  if (!hasUrl) return <Badge variant="outline">Not connected</Badge>;
  return null;
}
