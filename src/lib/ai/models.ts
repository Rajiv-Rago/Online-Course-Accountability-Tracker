// ---------------------------------------------------------------------------
// Supported AI Models — lightweight config with no SDK imports.
// Used by validation schemas (client + server) and provider-registry.ts.
// ---------------------------------------------------------------------------

export interface SupportedModel {
  id: string;        // "provider:model" format
  label: string;     // Human-readable label
  provider: string;  // Provider key
  description: string;
  tier: 'free' | 'budget' | 'standard' | 'premium';
}

export const SUPPORTED_MODELS: SupportedModel[] = [
  // OpenAI
  { id: 'openai:gpt-4o', label: 'GPT-4o', provider: 'openai', description: 'Most capable OpenAI model, best for complex analysis', tier: 'premium' },
  { id: 'openai:gpt-4o-mini', label: 'GPT-4o Mini', provider: 'openai', description: 'Fast and affordable, good for routine analysis', tier: 'budget' },
  // Anthropic
  { id: 'anthropic:claude-sonnet-4-6', label: 'Claude Sonnet 4.6', provider: 'anthropic', description: 'Excellent reasoning and instruction following', tier: 'standard' },
  { id: 'anthropic:claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5', provider: 'anthropic', description: 'Fast and cost-effective', tier: 'budget' },
  // Google
  { id: 'google:gemini-2.0-flash', label: 'Gemini 2.0 Flash', provider: 'google', description: 'Fast Google model with strong capabilities', tier: 'budget' },
  { id: 'google:gemini-2.5-pro-preview-06-05', label: 'Gemini 2.5 Pro', provider: 'google', description: 'Most capable Google model', tier: 'premium' },
  // Groq
  { id: 'groq:llama-3.3-70b-versatile', label: 'Llama 3.3 70B (Groq)', provider: 'groq', description: 'Ultra-fast inference via Groq', tier: 'free' },
  // Cerebras
  { id: 'cerebras:llama-3.3-70b', label: 'Llama 3.3 70B (Cerebras)', provider: 'cerebras', description: 'Ultra-fast inference via Cerebras', tier: 'free' },
];

export const SUPPORTED_MODEL_IDS = SUPPORTED_MODELS.map((m) => m.id);

export const DEFAULT_MODEL = 'openai:gpt-4o';

/** Validate that a model ID is in the supported list. */
export function isValidModelId(modelId: string): boolean {
  return SUPPORTED_MODEL_IDS.includes(modelId);
}
