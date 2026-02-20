import { vi } from 'vitest';

type QueryResult = { data: unknown; error: unknown; count?: number };

export interface RecordedCall {
  table: string;
  operation: string;
  data: unknown;
  filters: Array<{ method: string; args: unknown[] }>;
}

/**
 * Chainable Supabase mock with closure-based chain isolation.
 * Each from() call creates an independent chain with its own state.
 *
 * Captures all mutation calls (insert/update/upsert/delete) with their
 * arguments and filters so tests can verify actual data passed to Supabase.
 *
 * Usage:
 *   const mock = createMockSupabaseClient();
 *   mock.__setResult('user_profiles', 'select', { data: profile, error: null });
 *   vi.mocked(createClient).mockResolvedValue(mock as any);
 *
 *   // After calling your action:
 *   const insertCalls = mock.__getCalls('study_sessions', 'insert');
 *   expect(insertCalls[0].data).toMatchObject({ duration_minutes: 45 });
 */
export function createMockSupabaseClient() {
  // Results map: "table:operation" -> result
  const results = new Map<string, QueryResult>();
  // Recorded mutation calls for assertion
  const calls: RecordedCall[] = [];

  function createChain(table: string, operation: string) {
    const chain: Record<string, unknown> = {};
    const chainFilters: Array<{ method: string; args: unknown[] }> = [];
    let chainData: unknown = undefined;
    let hasMutation = false;

    function getResult(): QueryResult {
      // Try table:operation first, then just table
      return results.get(`${table}:${operation}`) ?? results.get(table) ?? { data: null, error: null };
    }

    // Mutation methods that capture data (deferred recording until .then())
    for (const method of ['insert', 'update', 'upsert'] as const) {
      chain[method] = vi.fn((data: unknown, ...rest: unknown[]) => {
        if (operation === '') operation = method;
        chainData = data;
        hasMutation = true;
        return chain;
      });
    }

    chain['delete'] = vi.fn(() => {
      if (operation === '') operation = 'delete';
      hasMutation = true;
      return chain;
    });

    // Filter methods that capture query conditions
    for (const method of ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'ilike', 'is', 'in', 'or', 'and', 'not', 'filter', 'contains', 'containedBy', 'overlaps', 'textSearch', 'match'] as const) {
      chain[method] = vi.fn((...args: unknown[]) => {
        chainFilters.push({ method, args });
        return chain;
      });
    }

    chain['select'] = vi.fn((..._args: unknown[]) => {
      if (operation === '') operation = 'select';
      return chain;
    });

    for (const method of ['order', 'limit', 'range', 'offset', 'single', 'maybeSingle']) {
      chain[method] = vi.fn(() => chain);
    }

    // Make it thenable (await-able)
    // Recording happens here so filters added AFTER mutation methods are captured
    chain.then = function (
      resolve: (v: unknown) => void,
      reject?: (e: unknown) => void
    ) {
      try {
        if (hasMutation) {
          calls.push({
            table,
            operation,
            data: chainData,
            filters: [...chainFilters],
          });
        }
        resolve(getResult());
      } catch (e) {
        reject?.(e);
      }
    };

    return chain;
  }

  const client = {
    from: vi.fn((table: string) => createChain(table, '')),
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: null },
        error: null,
      }),
      updateUser: vi.fn().mockResolvedValue({ data: {}, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      signInWithPassword: vi.fn().mockResolvedValue({ data: {}, error: null }),
      admin: {
        deleteUser: vi.fn().mockResolvedValue({ error: null }),
        listUsers: vi.fn().mockResolvedValue({ data: { users: [] }, error: null }),
      },
    },
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ data: { path: 'test.jpg' }, error: null }),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://test.supabase.co/test.jpg' } })),
        remove: vi.fn().mockResolvedValue({ data: [], error: null }),
      })),
    },
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),

    // Test helpers
    __setResult(table: string, operation: string, result: QueryResult) {
      results.set(`${table}:${operation}`, result);
    },
    __setTableResult(table: string, result: QueryResult) {
      results.set(table, result);
    },
    __setUser(user: { id: string; email?: string } | null) {
      if (user) {
        client.auth.getUser.mockResolvedValue({
          data: { user },
          error: null,
        });
      } else {
        client.auth.getUser.mockResolvedValue({
          data: { user: null },
          error: { message: 'Not authenticated' },
        });
      }
    },
    /** Get recorded mutation calls, optionally filtered by table and/or operation */
    __getCalls(table?: string, operation?: string): RecordedCall[] {
      return calls.filter(
        (c) =>
          (!table || c.table === table) &&
          (!operation || c.operation === operation)
      );
    },
    __reset() {
      results.clear();
      calls.length = 0;
      client.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    },
  };

  return client;
}

export type MockSupabaseClient = ReturnType<typeof createMockSupabaseClient>;
