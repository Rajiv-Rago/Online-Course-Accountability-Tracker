import { vi } from 'vitest';

/**
 * Helpers to access the mocked next/cache functions.
 */
export async function getRevalidatePath() {
  const mod = await import('next/cache');
  return vi.mocked(mod.revalidatePath);
}

export async function getRevalidateTag() {
  const mod = await import('next/cache');
  return vi.mocked(mod.revalidateTag);
}

/**
 * Create a mock NextResponse-like object for testing cron routes.
 */
export function createMockRequest(options: {
  url?: string;
  method?: string;
  headers?: Record<string, string>;
}): Request {
  const url = options.url ?? 'http://localhost:3000/api/cron/test';
  const request = new Request(url, {
    method: options.method ?? 'GET',
    headers: options.headers ?? {},
  });
  return request;
}
