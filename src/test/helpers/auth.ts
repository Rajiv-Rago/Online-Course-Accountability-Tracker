import { vi } from 'vitest';
import { createMockSupabaseClient, type MockSupabaseClient } from '../mocks/supabase';

const DEFAULT_USER = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'test@example.com',
};

/**
 * Set up a mock authenticated user. Returns the mock client for further configuration.
 */
export async function setMockUser(
  user: { id: string; email?: string } = DEFAULT_USER
): Promise<MockSupabaseClient> {
  const { createClient } = await import('@/lib/supabase/server');
  const mockClient = createMockSupabaseClient();
  mockClient.__setUser(user);
  vi.mocked(createClient).mockResolvedValue(mockClient as never);
  return mockClient;
}

/**
 * Set up mock for unauthenticated state.
 */
export async function clearMockUser(): Promise<MockSupabaseClient> {
  const { createClient } = await import('@/lib/supabase/server');
  const mockClient = createMockSupabaseClient();
  mockClient.__setUser(null);
  vi.mocked(createClient).mockResolvedValue(mockClient as never);
  return mockClient;
}

/**
 * Set up a mock admin client.
 */
export async function setMockAdminClient(): Promise<MockSupabaseClient> {
  const { createAdminClient } = await import('@/lib/supabase/admin');
  const mockAdmin = createMockSupabaseClient();
  vi.mocked(createAdminClient).mockReturnValue(mockAdmin as never);
  return mockAdmin;
}

export { DEFAULT_USER };
