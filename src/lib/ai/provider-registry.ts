import { createProviderRegistry } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createGroq } from '@ai-sdk/groq';
import { createCerebras } from '@ai-sdk/cerebras';

// Re-export model config from the lightweight models module
export { SUPPORTED_MODELS, SUPPORTED_MODEL_IDS, DEFAULT_MODEL, isValidModelId } from './models';
export type { SupportedModel } from './models';

// ---------------------------------------------------------------------------
// Provider Registry (lazy initialization)
// ---------------------------------------------------------------------------

let _registry: ReturnType<typeof createProviderRegistry> | null = null;

function getRegistry() {
  if (!_registry) {
    // Each provider SDK returns a slightly different type, but createProviderRegistry
    // accepts Record<string, Provider> where Provider is the common interface.
    // We build the record dynamically, only including providers with configured keys.
    const providers: Record<string, unknown> = {};
    if (process.env.OPENAI_API_KEY) {
      providers.openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
    if (process.env.ANTHROPIC_API_KEY) {
      providers.anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    }
    if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      providers.google = createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY });
    }
    if (process.env.GROQ_API_KEY) {
      providers.groq = createGroq({ apiKey: process.env.GROQ_API_KEY });
    }
    if (process.env.CEREBRAS_API_KEY) {
      providers.cerebras = createCerebras({ apiKey: process.env.CEREBRAS_API_KEY });
    }
    _registry = createProviderRegistry(providers as Parameters<typeof createProviderRegistry>[0]);
  }
  return _registry;
}

// Fallback order: one model per provider, ordered by general reliability.
const FALLBACK_CHAIN = [
  'openai:gpt-4o',
  'anthropic:claude-sonnet-4-6',
  'google:gemini-2.0-flash',
  'groq:llama-3.3-70b-versatile',
  'cerebras:llama-3.3-70b',
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Resolve a "provider:model" string to an AI SDK model instance. */
export function getModel(modelId: string) {
  return getRegistry().languageModel(modelId as Parameters<ReturnType<typeof createProviderRegistry>['languageModel']>[0]);
}

/** Check if a provider has an API key configured. */
function isProviderAvailable(provider: string): boolean {
  switch (provider) {
    case 'openai': return !!process.env.OPENAI_API_KEY;
    case 'anthropic': return !!process.env.ANTHROPIC_API_KEY;
    case 'google': return !!process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    case 'groq': return !!process.env.GROQ_API_KEY;
    case 'cerebras': return !!process.env.CEREBRAS_API_KEY;
    default: return false;
  }
}

/** Check if an error is retryable (rate limit, server error, network). */
function isRetryableError(err: unknown): boolean {
  const status = (err as { status?: number }).status;
  const code = (err as { code?: string }).code;
  return status === 429 || (!!status && status >= 500) || code === 'ECONNREFUSED' || code === 'ETIMEDOUT';
}

// ---------------------------------------------------------------------------
// Fallback Execution
// ---------------------------------------------------------------------------

export interface FallbackResult<T> {
  result: T;
  modelUsed: string;
}

/**
 * Try calling `fn` with the preferred model. On retryable failures (rate limit,
 * 5xx, network errors), fall back to the next available provider in the chain.
 * Non-retryable errors (schema validation, bad request) throw immediately.
 */
export async function callWithFallback<T>(
  preferredModel: string,
  fn: (modelId: string) => Promise<T>,
): Promise<FallbackResult<T>> {
  // Build ordered list: preferred first, then fallback chain (no duplicates)
  const chain = [preferredModel, ...FALLBACK_CHAIN.filter((m) => m !== preferredModel)];

  let lastError: unknown;
  for (const modelId of chain) {
    const provider = modelId.split(':')[0];
    if (!isProviderAvailable(provider)) continue;

    try {
      const result = await fn(modelId);
      return { result, modelUsed: modelId };
    } catch (err: unknown) {
      lastError = err;
      if (isRetryableError(err)) {
        continue; // Try next provider
      }
      throw err; // Non-retryable — surface immediately
    }
  }

  throw lastError ?? new Error('All AI providers failed. Check your API keys.');
}
