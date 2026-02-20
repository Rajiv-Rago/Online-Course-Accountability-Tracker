export async function sendEmail(params: {
  to: string;
  subject: string;
  body: string;
  notificationType: string;
  actionUrl?: string;
}): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { success: false, error: 'RESEND_API_KEY not configured' };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `Study Tracker <notifications@${process.env.NEXT_PUBLIC_APP_URL?.replace(/^https?:\/\//, '') ?? 'localhost'}>`,
        to: params.to,
        subject: params.subject,
        html: buildEmailHtml(params),
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return { success: false, error: `Email API returned ${response.status}: ${err}` };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildEmailHtml(params: {
  subject: string;
  body: string;
  notificationType: string;
  actionUrl?: string;
}): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';
  const safeSubject = escapeHtml(params.subject);
  const safeBody = escapeHtml(params.body);
  const ctaHtml = params.actionUrl
    ? `<p style="margin-top:16px"><a href="${escapeHtml(appUrl)}${escapeHtml(params.actionUrl)}" style="background:#f97316;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;">View in App</a></p>`
    : '';

  return `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
      <div style="text-align:center;margin-bottom:24px;">
        <h2 style="margin:0;color:#1a1a1a;">Course Accountability Tracker</h2>
      </div>
      <div style="background:#f9fafb;border-radius:8px;padding:20px;">
        <h3 style="margin:0 0 8px;color:#1a1a1a;">${safeSubject}</h3>
        <p style="margin:0;color:#4b5563;line-height:1.5;">${safeBody}</p>
        ${ctaHtml}
      </div>
      <p style="margin-top:24px;font-size:12px;color:#9ca3af;text-align:center;">
        You received this because of your notification settings.
      </p>
    </div>
  `;
}
