import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setMockUser, clearMockUser, DEFAULT_USER } from '@/test/helpers/auth';
import { buildSession } from '@/test/factories';
import type { MockSupabaseClient } from '@/test/mocks/supabase';

let mockClient: MockSupabaseClient;

beforeEach(async () => {
  vi.clearAllMocks();
  mockClient = await setMockUser();
});

describe('startTimerSession', () => {
  it('inserts a timer session with ended_at=null and session_type=timer', async () => {
    mockClient.__setResult('study_sessions', 'insert', {
      data: { id: 'timer-sess-1' },
      error: null,
    });

    const { startTimerSession } = await import('./timer-actions');
    const result = await startTimerSession('00000000-0000-0000-0000-000000000100');

    expect(result.data?.sessionId).toBe('timer-sess-1');
    expect(result.error).toBeUndefined();

    // Verify the insert payload has correct fields for a timer session
    const insertCalls = mockClient.__getCalls('study_sessions', 'insert');
    expect(insertCalls).toHaveLength(1);
    const insertedData = insertCalls[0].data as Record<string, unknown>;
    expect(insertedData.user_id).toBe(DEFAULT_USER.id);
    expect(insertedData.course_id).toBe('00000000-0000-0000-0000-000000000100');
    expect(insertedData.ended_at).toBeNull();
    expect(insertedData.duration_minutes).toBe(0);
    expect(insertedData.modules_completed).toBe(0);
    expect(insertedData.session_type).toBe('timer');
    expect(insertedData.notes).toBeNull();
    // started_at should be a valid ISO date string
    expect(typeof insertedData.started_at).toBe('string');
    expect(new Date(insertedData.started_at as string).getTime()).not.toBeNaN();
  });

  it('returns error when unauthenticated', async () => {
    await clearMockUser();

    const { startTimerSession } = await import('./timer-actions');
    const result = await startTimerSession('course-123');
    expect(result.error).toBe('Unauthorized');
  });

  it('propagates DB error messages', async () => {
    mockClient.__setResult('study_sessions', 'insert', {
      data: null,
      error: { message: 'duplicate key violation' },
    });

    const { startTimerSession } = await import('./timer-actions');
    const result = await startTimerSession('course-123');
    expect(result.error).toBe('duplicate key violation');
  });
});

describe('autoSaveTimerProgress', () => {
  it('updates only duration_minutes on an active (ended_at=null) session', async () => {
    mockClient.__setResult('study_sessions', 'update', { data: null, error: null });

    const { autoSaveTimerProgress } = await import('./timer-actions');
    const result = await autoSaveTimerProgress('sess-1', 25);
    expect(result.error).toBeUndefined();

    // Verify the update data contains only duration_minutes
    const updateCalls = mockClient.__getCalls('study_sessions', 'update');
    expect(updateCalls).toHaveLength(1);
    const updateData = updateCalls[0].data as Record<string, unknown>;
    expect(updateData).toEqual({ duration_minutes: 25 });

    // Verify filter includes ended_at IS null (to only update active sessions)
    const filters = updateCalls[0].filters;
    const eqFilter = filters.find((f) => f.method === 'eq');
    const isFilter = filters.find((f) => f.method === 'is');
    expect(eqFilter?.args).toEqual(['id', 'sess-1']);
    expect(isFilter?.args).toEqual(['ended_at', null]);
  });

  it('propagates DB error', async () => {
    mockClient.__setResult('study_sessions', 'update', {
      data: null,
      error: { message: 'connection timeout' },
    });

    const { autoSaveTimerProgress } = await import('./timer-actions');
    const result = await autoSaveTimerProgress('sess-1', 25);
    expect(result.error).toBe('connection timeout');
  });
});

describe('finalizeTimerSession', () => {
  it('sets ended_at and updates course progress with correct arithmetic', async () => {
    const session = buildSession({
      session_type: 'timer',
      duration_minutes: 45,
      modules_completed: 2,
      course_id: '00000000-0000-0000-0000-000000000100',
      started_at: '2024-06-15T10:00:00.000Z',
    });
    mockClient.__setResult('study_sessions', 'update', { data: session, error: null });
    mockClient.__setResult('courses', 'select', {
      data: { completed_modules: 8, completed_hours: 3.0, status: 'in_progress' },
      error: null,
    });
    mockClient.__setResult('courses', 'update', { data: null, error: null });
    mockClient.__setResult('study_sessions', 'select', { data: [], error: null });
    mockClient.__setResult('daily_stats', 'upsert', { data: null, error: null });

    const { finalizeTimerSession } = await import('./timer-actions');
    const result = await finalizeTimerSession('sess-1', 45, 'Good focus session', 2);

    expect(result.data).toEqual(session);

    // Verify session update payload
    const sessionUpdates = mockClient.__getCalls('study_sessions', 'update');
    expect(sessionUpdates).toHaveLength(1);
    const sessionData = sessionUpdates[0].data as Record<string, unknown>;
    expect(sessionData.duration_minutes).toBe(45);
    expect(sessionData.modules_completed).toBe(2);
    expect(sessionData.notes).toBe('Good focus session');
    expect(typeof sessionData.ended_at).toBe('string'); // should be set

    // Verify filter: only finalize active sessions
    const sessionFilters = sessionUpdates[0].filters;
    expect(sessionFilters.find((f) => f.method === 'is')?.args).toEqual(['ended_at', null]);

    // Verify course progress: 8 + 2 = 10 modules, 3.0 + 45/60 = 3.75 hours
    const courseUpdates = mockClient.__getCalls('courses', 'update');
    expect(courseUpdates).toHaveLength(1);
    const courseData = courseUpdates[0].data as Record<string, unknown>;
    expect(courseData.completed_modules).toBe(10);
    expect(courseData.completed_hours).toBe(3.75);
  });

  it('enforces minimum 1 minute duration when given 0', async () => {
    const session = buildSession({ duration_minutes: 1, modules_completed: 0 });
    mockClient.__setResult('study_sessions', 'update', { data: session, error: null });
    mockClient.__setResult('courses', 'select', {
      data: { completed_modules: 0, completed_hours: 0, status: 'in_progress' },
      error: null,
    });
    mockClient.__setResult('courses', 'update', { data: null, error: null });
    mockClient.__setResult('study_sessions', 'select', { data: [], error: null });
    mockClient.__setResult('daily_stats', 'upsert', { data: null, error: null });

    const { finalizeTimerSession } = await import('./timer-actions');
    await finalizeTimerSession('sess-1', 0);

    const sessionUpdates = mockClient.__getCalls('study_sessions', 'update');
    const sessionData = sessionUpdates[0].data as Record<string, unknown>;
    // Math.max(1, 0) = 1
    expect(sessionData.duration_minutes).toBe(1);
  });

  it('auto-transitions course from not_started on finalize', async () => {
    const session = buildSession({ duration_minutes: 30, modules_completed: 0 });
    mockClient.__setResult('study_sessions', 'update', { data: session, error: null });
    mockClient.__setResult('courses', 'select', {
      data: { completed_modules: 0, completed_hours: 0, status: 'not_started' },
      error: null,
    });
    mockClient.__setResult('courses', 'update', { data: null, error: null });
    mockClient.__setResult('study_sessions', 'select', { data: [], error: null });
    mockClient.__setResult('daily_stats', 'upsert', { data: null, error: null });

    const { finalizeTimerSession } = await import('./timer-actions');
    await finalizeTimerSession('sess-1', 30);

    const courseUpdates = mockClient.__getCalls('courses', 'update');
    const courseData = courseUpdates[0].data as Record<string, unknown>;
    expect(courseData.status).toBe('in_progress');
  });

  it('defaults modules_completed to 0 and notes to null when omitted', async () => {
    const session = buildSession({ duration_minutes: 20, modules_completed: 0 });
    mockClient.__setResult('study_sessions', 'update', { data: session, error: null });
    mockClient.__setResult('courses', 'select', {
      data: { completed_modules: 0, completed_hours: 0, status: 'in_progress' },
      error: null,
    });
    mockClient.__setResult('courses', 'update', { data: null, error: null });
    mockClient.__setResult('study_sessions', 'select', { data: [], error: null });
    mockClient.__setResult('daily_stats', 'upsert', { data: null, error: null });

    const { finalizeTimerSession } = await import('./timer-actions');
    await finalizeTimerSession('sess-1', 20); // no notes, no modules

    const sessionUpdates = mockClient.__getCalls('study_sessions', 'update');
    const sessionData = sessionUpdates[0].data as Record<string, unknown>;
    expect(sessionData.modules_completed).toBe(0);
    expect(sessionData.notes).toBeNull();
  });

  it('returns error when unauthenticated', async () => {
    await clearMockUser();

    const { finalizeTimerSession } = await import('./timer-actions');
    const result = await finalizeTimerSession('sess-1', 30);
    expect(result.error).toBe('Unauthorized');
  });
});

describe('recoverTimerSession', () => {
  it('returns active session data when found', async () => {
    const active = buildSession({
      ended_at: null,
      session_type: 'timer',
      duration_minutes: 15,
      course_id: '00000000-0000-0000-0000-000000000100',
    });
    mockClient.__setResult('study_sessions', 'select', { data: active, error: null });

    const { recoverTimerSession } = await import('./timer-actions');
    const result = await recoverTimerSession('sess-1');

    expect(result.data).toEqual(active);
    expect(result.data?.session_type).toBe('timer');
    expect(result.data?.ended_at).toBeNull();
  });

  it('returns null (not error) when no active session found', async () => {
    mockClient.__setResult('study_sessions', 'select', {
      data: null,
      error: { message: 'PGRST116' }, // single row not found
    });

    const { recoverTimerSession } = await import('./timer-actions');
    const result = await recoverTimerSession('sess-1');

    // Should gracefully return null, not propagate DB error
    expect(result.data).toBeNull();
    expect(result.error).toBeUndefined();
  });
});
