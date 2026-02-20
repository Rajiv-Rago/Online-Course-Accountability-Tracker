import { describe, it, expect, vi, beforeEach } from 'vitest';

beforeEach(() => {
  vi.clearAllMocks();
  // Ensure CRON_SECRET is set
  process.env.CRON_SECRET = 'test-cron-secret';
});

function makeRequest(headers: Record<string, string> = {}): Request {
  return new Request('http://localhost:3000/api/cron/test', {
    method: 'GET',
    headers,
  });
}

describe('daily-analysis cron auth', () => {
  it('rejects missing authorization header', async () => {
    const { GET } = await import('./daily-analysis/route');
    const response = await GET(makeRequest());
    expect(response.status).toBe(401);
  });

  it('rejects wrong secret', async () => {
    const { GET } = await import('./daily-analysis/route');
    const response = await GET(makeRequest({ authorization: 'Bearer wrong-secret' }));
    expect(response.status).toBe(401);
  });

  it('rejects empty secret', async () => {
    const origSecret = process.env.CRON_SECRET;
    process.env.CRON_SECRET = '';

    const { GET } = await import('./daily-analysis/route');
    const response = await GET(makeRequest({ authorization: 'Bearer ' }));
    expect(response.status).toBe(401);

    process.env.CRON_SECRET = origSecret;
  });

  it('accepts correct secret', async () => {
    // Mock the pipeline to avoid actual execution
    vi.mock('@/blocks/b4-ai-analysis/lib/ai-pipeline', () => ({
      runDailyAnalysis: vi.fn().mockResolvedValue({ usersProcessed: 0, analysesCreated: 0 }),
      generateWeeklyReports: vi.fn().mockResolvedValue({ reportsGenerated: 0 }),
    }));

    const { GET } = await import('./daily-analysis/route');
    const response = await GET(makeRequest({ authorization: 'Bearer test-cron-secret' }));
    expect(response.status).toBe(200);
  });
});

describe('weekly-report cron auth', () => {
  it('rejects missing authorization', async () => {
    const { GET } = await import('./weekly-report/route');
    const response = await GET(makeRequest());
    expect(response.status).toBe(401);
  });

  it('rejects wrong secret', async () => {
    const { GET } = await import('./weekly-report/route');
    const response = await GET(makeRequest({ authorization: 'Bearer nope' }));
    expect(response.status).toBe(401);
  });

  it('accepts correct secret', async () => {
    const { GET } = await import('./weekly-report/route');
    const response = await GET(makeRequest({ authorization: 'Bearer test-cron-secret' }));
    expect(response.status).toBe(200);
  });
});

describe('send-reminders cron auth', () => {
  it('rejects missing authorization', async () => {
    // Mock reminder scheduler
    vi.mock('@/blocks/b6-notifications/lib/reminder-scheduler', () => ({
      processReminders: vi.fn().mockResolvedValue({ processed: 0 }),
    }));

    const { GET } = await import('./send-reminders/route');
    const response = await GET(makeRequest());
    expect(response.status).toBe(401);
  });

  it('accepts correct secret', async () => {
    const { GET } = await import('./send-reminders/route');
    const response = await GET(makeRequest({ authorization: 'Bearer test-cron-secret' }));
    expect(response.status).toBe(200);
  });
});

describe('daily-stats cron auth', () => {
  it('rejects missing authorization', async () => {
    const { GET } = await import('./daily-stats/route');
    const response = await GET(makeRequest());
    expect(response.status).toBe(401);
  });

  it('accepts correct secret and returns success', async () => {
    // Mock the admin client since the route now queries Supabase
    const { createAdminClient } = await import('@/lib/supabase/admin');
    const chainResult = { data: [], error: null };
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      then: (resolve: (v: unknown) => void) => resolve(chainResult),
    };
    const mockClient = { from: vi.fn().mockReturnValue(chain) };
    vi.mocked(createAdminClient).mockReturnValue(mockClient as unknown as ReturnType<typeof createAdminClient>);

    const { GET } = await import('./daily-stats/route');
    const response = await GET(makeRequest({ authorization: 'Bearer test-cron-secret' }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.message).toContain('Daily stats aggregation complete');
  });
});
