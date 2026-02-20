export async function sendDiscord(params: {
  webhookUrl: string;
  title: string;
  message: string;
  notificationType: string;
  actionUrl?: string;
}): Promise<{ success: boolean; error?: string }> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';

  const typeEmoji: Record<string, string> = {
    reminder: '\u{1F514}',
    risk_alert: '\u26A0\uFE0F',
    achievement: '\u{1F3C6}',
    buddy_update: '\u{1F465}',
    weekly_report: '\u{1F4CA}',
    streak_warning: '\u{1F525}',
  };

  try {
    const response = await fetch(params.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [
          {
            title: `${typeEmoji[params.notificationType] ?? ''} ${params.title}`,
            description: params.message,
            color: getDiscordColor(params.notificationType),
            url: params.actionUrl ? `${appUrl}${params.actionUrl}` : undefined,
            timestamp: new Date().toISOString(),
            footer: { text: 'Course Accountability Tracker' },
          },
        ],
      }),
    });

    if (!response.ok) {
      return { success: false, error: `Discord webhook returned ${response.status}` };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

function getDiscordColor(type: string): number {
  const colors: Record<string, number> = {
    reminder: 0x3b82f6,
    risk_alert: 0xef4444,
    achievement: 0xeab308,
    buddy_update: 0x22c55e,
    weekly_report: 0xa855f7,
    streak_warning: 0xf97316,
  };
  return colors[type] ?? 0x6b7280;
}
