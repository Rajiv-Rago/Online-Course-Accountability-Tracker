export async function sendSlack(params: {
  webhookUrl: string;
  title: string;
  message: string;
  notificationType: string;
  actionUrl?: string;
}): Promise<{ success: boolean; error?: string }> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';

  try {
    const blocks: unknown[] = [
      {
        type: 'header',
        text: { type: 'plain_text', text: params.title },
      },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: params.message },
      },
    ];

    if (params.actionUrl) {
      blocks.push({
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: 'View in App' },
            url: `${appUrl}${params.actionUrl}`,
          },
        ],
      });
    }

    const response = await fetch(params.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blocks }),
    });

    if (!response.ok) {
      return { success: false, error: `Slack webhook returned ${response.status}` };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}
