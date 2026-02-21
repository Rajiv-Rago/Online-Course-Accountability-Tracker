import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// ---------------------------------------------------------------------------
// Environment variables
// ---------------------------------------------------------------------------
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
process.env.OPENAI_API_KEY = 'test-openai-key';
process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'test-google-key';
process.env.GROQ_API_KEY = 'test-groq-key';
process.env.CEREBRAS_API_KEY = 'test-cerebras-key';
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
process.env.CRON_SECRET = 'test-cron-secret';

// ---------------------------------------------------------------------------
// Mock next/cache
// ---------------------------------------------------------------------------
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Mock next/headers
// ---------------------------------------------------------------------------
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    getAll: vi.fn(() => []),
    set: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
  })),
  headers: vi.fn(() => new Map()),
}));

// ---------------------------------------------------------------------------
// Mock next/navigation
// ---------------------------------------------------------------------------
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  })),
  usePathname: vi.fn(() => '/'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
  redirect: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Mock Supabase clients
// ---------------------------------------------------------------------------
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Mock Vercel AI SDK
// ---------------------------------------------------------------------------
vi.mock('ai', () => ({
  generateObject: vi.fn().mockResolvedValue({
    object: {
      risk_score: 35,
      insights: [{ type: 'suggestion', title: 'Test', description: 'Test insight', confidence: 0.8 }],
      interventions: [{ type: 'encouragement', message: 'Keep going!', priority: 'low', action_url: null }],
      patterns: { optimal_time: null, avg_session_length: 30, consistency_score: 0.7, preferred_day: null },
    },
    usage: { totalTokens: 700 },
  }),
  createProviderRegistry: vi.fn(() => ({
    languageModel: vi.fn(),
  })),
}));

const MOCK_SUPPORTED_MODELS = [
  { id: 'openai:gpt-4o', label: 'GPT-4o', provider: 'openai', description: 'Test model', tier: 'premium' },
  { id: 'anthropic:claude-sonnet-4-6', label: 'Claude Sonnet 4.6', provider: 'anthropic', description: 'Test model', tier: 'standard' },
];
const MOCK_MODEL_IDS = MOCK_SUPPORTED_MODELS.map((m) => m.id);

vi.mock('@/lib/ai/models', () => ({
  SUPPORTED_MODELS: MOCK_SUPPORTED_MODELS,
  SUPPORTED_MODEL_IDS: MOCK_MODEL_IDS,
  DEFAULT_MODEL: 'openai:gpt-4o',
  isValidModelId: vi.fn((id: string) => MOCK_MODEL_IDS.includes(id)),
}));

vi.mock('@/lib/ai/provider-registry', () => ({
  getModel: vi.fn(),
  callWithFallback: vi.fn(async (_modelId: string, fn: (id: string) => Promise<unknown>) => {
    const result = await fn('openai:gpt-4o');
    return { result, modelUsed: 'openai:gpt-4o' };
  }),
  SUPPORTED_MODELS: MOCK_SUPPORTED_MODELS,
  SUPPORTED_MODEL_IDS: MOCK_MODEL_IDS,
  DEFAULT_MODEL: 'openai:gpt-4o',
  isValidModelId: vi.fn((id: string) => MOCK_MODEL_IDS.includes(id)),
}));
