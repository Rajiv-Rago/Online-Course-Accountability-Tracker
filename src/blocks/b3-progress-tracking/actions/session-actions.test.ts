import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setMockUser, clearMockUser, DEFAULT_USER } from '@/test/helpers/auth';
import { buildSession } from '@/test/factories';
import type { MockSupabaseClient } from '@/test/mocks/supabase';

let mockClient: MockSupabaseClient;

beforeEach(async () => {
  vi.clearAllMocks();
  mockClient = await setMockUser();
});

describe('createSession', () => {
  it('inserts a manual session with correct computed fields', async () => {
    const session = buildSession({ session_type: 'manual', duration_minutes: 45, modules_completed: 2 });
    mockClient.__setResult('study_sessions', 'insert', { data: session, error: null });
    mockClient.__setResult('courses', 'select', {
      data: { completed_modules: 5, completed_hours: 2.5, status: 'in_progress' },
      error: null,
    });
    mockClient.__setResult('courses', 'update', { data: null, error: null });
    mockClient.__setResult('study_sessions', 'select', { data: [], error: null });
    mockClient.__setResult('daily_stats', 'upsert', { data: null, error: null });

    const { createSession } = await import('./session-actions');
    const result = await createSession({
      courseId: session.course_id,
      date: '2024-06-15',
      durationMinutes: 45,
      modulesCompleted: 2,
      notes: 'Test session',
    });

    expect(result.error).toBeUndefined();
    expect(result.data).toEqual(session);

    // Verify the insert was called with correct data
    const insertCalls = mockClient.__getCalls('study_sessions', 'insert');
    expect(insertCalls).toHaveLength(1);
    const insertedData = insertCalls[0].data as Record<string, unknown>;
    expect(insertedData.user_id).toBe(DEFAULT_USER.id);
    expect(insertedData.course_id).toBe(session.course_id);
    expect(insertedData.duration_minutes).toBe(45);
    expect(insertedData.modules_completed).toBe(2);
    expect(insertedData.session_type).toBe('manual');
    expect(insertedData.notes).toBe('Test session');

    // Verify started_at is derived from date at noon UTC
    expect(insertedData.started_at).toBe('2024-06-15T12:00:00.000Z');

    // Verify ended_at is started_at + durationMinutes
    const expectedEndedAt = new Date(
      new Date('2024-06-15T12:00:00.000Z').getTime() + 45 * 60000
    ).toISOString();
    expect(insertedData.ended_at).toBe(expectedEndedAt);
  });

  it('updates course progress by adding modules and converting minutes to hours', async () => {
    const session = buildSession();
    mockClient.__setResult('study_sessions', 'insert', { data: session, error: null });
    mockClient.__setResult('courses', 'select', {
      data: { completed_modules: 5, completed_hours: 2.5, status: 'in_progress' },
      error: null,
    });
    mockClient.__setResult('courses', 'update', { data: null, error: null });
    mockClient.__setResult('study_sessions', 'select', { data: [], error: null });
    mockClient.__setResult('daily_stats', 'upsert', { data: null, error: null });

    const { createSession } = await import('./session-actions');
    await createSession({
      courseId: session.course_id,
      date: '2024-06-15',
      durationMinutes: 90,
      modulesCompleted: 3,
    });

    // Verify course progress update: 5 + 3 modules = 8, 2.5 + (90/60) hours = 4.0
    const courseUpdates = mockClient.__getCalls('courses', 'update');
    expect(courseUpdates).toHaveLength(1);
    const courseUpdateData = courseUpdates[0].data as Record<string, unknown>;
    expect(courseUpdateData.completed_modules).toBe(8);
    expect(courseUpdateData.completed_hours).toBe(4);
  });

  it('auto-transitions course from not_started to in_progress', async () => {
    const session = buildSession();
    mockClient.__setResult('study_sessions', 'insert', { data: session, error: null });
    mockClient.__setResult('courses', 'select', {
      data: { completed_modules: 0, completed_hours: 0, status: 'not_started' },
      error: null,
    });
    mockClient.__setResult('courses', 'update', { data: null, error: null });
    mockClient.__setResult('study_sessions', 'select', { data: [], error: null });
    mockClient.__setResult('daily_stats', 'upsert', { data: null, error: null });

    const { createSession } = await import('./session-actions');
    await createSession({
      courseId: session.course_id,
      date: '2024-06-15',
      durationMinutes: 30,
      modulesCompleted: 1,
    });

    const courseUpdates = mockClient.__getCalls('courses', 'update');
    const updateData = courseUpdates[0].data as Record<string, unknown>;
    expect(updateData.status).toBe('in_progress');
  });

  it('does NOT auto-transition when course is already in_progress', async () => {
    const session = buildSession();
    mockClient.__setResult('study_sessions', 'insert', { data: session, error: null });
    mockClient.__setResult('courses', 'select', {
      data: { completed_modules: 5, completed_hours: 2.5, status: 'in_progress' },
      error: null,
    });
    mockClient.__setResult('courses', 'update', { data: null, error: null });
    mockClient.__setResult('study_sessions', 'select', { data: [], error: null });
    mockClient.__setResult('daily_stats', 'upsert', { data: null, error: null });

    const { createSession } = await import('./session-actions');
    await createSession({
      courseId: session.course_id,
      date: '2024-06-15',
      durationMinutes: 30,
      modulesCompleted: 1,
    });

    const courseUpdates = mockClient.__getCalls('courses', 'update');
    const updateData = courseUpdates[0].data as Record<string, unknown>;
    expect(updateData.status).toBeUndefined(); // no status change
  });

  it('triggers daily stats recalculation with correct user and date', async () => {
    const session = buildSession();
    mockClient.__setResult('study_sessions', 'insert', { data: session, error: null });
    mockClient.__setResult('courses', 'select', {
      data: { completed_modules: 0, completed_hours: 0, status: 'in_progress' },
      error: null,
    });
    mockClient.__setResult('courses', 'update', { data: null, error: null });
    // upsertDailyStats will query sessions for the date
    mockClient.__setResult('study_sessions', 'select', { data: [], error: null });
    mockClient.__setResult('daily_stats', 'upsert', { data: null, error: null });

    const { createSession } = await import('./session-actions');
    await createSession({
      courseId: session.course_id,
      date: '2024-06-15',
      durationMinutes: 30,
      modulesCompleted: 0,
    });

    // upsertDailyStats should have been called, which triggers a daily_stats upsert
    const dailyUpserts = mockClient.__getCalls('daily_stats', 'upsert');
    expect(dailyUpserts.length).toBeGreaterThanOrEqual(1);
  });

  it('returns error when unauthenticated', async () => {
    await clearMockUser();

    const { createSession } = await import('./session-actions');
    const result = await createSession({
      courseId: '00000000-0000-0000-0000-000000000010',
      date: '2024-06-15',
      durationMinutes: 45,
      modulesCompleted: 0,
    });

    expect(result.error).toBe('Unauthorized');
  });

  it('rejects zero duration via validation schema', async () => {
    const { createSession } = await import('./session-actions');
    const result = await createSession({
      courseId: '00000000-0000-0000-0000-000000000010',
      date: '2024-06-15',
      durationMinutes: 0,
      modulesCompleted: 0,
    });

    expect(result.error).toBeDefined();
    // No DB calls should have been made
    const insertCalls = mockClient.__getCalls('study_sessions', 'insert');
    expect(insertCalls).toHaveLength(0);
  });

  it('rejects duration over 480 minutes via validation schema', async () => {
    const { createSession } = await import('./session-actions');
    const result = await createSession({
      courseId: '00000000-0000-0000-0000-000000000010',
      date: '2024-06-15',
      durationMinutes: 481,
      modulesCompleted: 0,
    });

    expect(result.error).toBeDefined();
    const insertCalls = mockClient.__getCalls('study_sessions', 'insert');
    expect(insertCalls).toHaveLength(0);
  });
});

describe('updateSession', () => {
  it('recalculates ended_at from started_at + new duration', async () => {
    const startedAt = '2024-06-15T10:00:00.000Z';
    const existing = buildSession({
      duration_minutes: 30,
      modules_completed: 1,
      started_at: startedAt,
    });
    const updated = buildSession({ ...existing, duration_minutes: 60, modules_completed: 3 });

    mockClient.__setResult('study_sessions', 'select', { data: existing, error: null });
    mockClient.__setResult('study_sessions', 'update', { data: updated, error: null });
    mockClient.__setResult('courses', 'select', {
      data: { completed_modules: 5, completed_hours: 2.5, status: 'in_progress' },
      error: null,
    });
    mockClient.__setResult('courses', 'update', { data: null, error: null });
    mockClient.__setResult('daily_stats', 'upsert', { data: null, error: null });

    const { updateSession } = await import('./session-actions');
    await updateSession(existing.id, {
      durationMinutes: 60,
      modulesCompleted: 3,
    });

    // Verify the update payload includes recalculated ended_at
    const updateCalls = mockClient.__getCalls('study_sessions', 'update');
    expect(updateCalls).toHaveLength(1);
    const updateData = updateCalls[0].data as Record<string, unknown>;
    expect(updateData.duration_minutes).toBe(60);
    expect(updateData.modules_completed).toBe(3);

    // ended_at should be started_at + 60 minutes
    const expectedEndedAt = new Date(
      new Date(startedAt).getTime() + 60 * 60000
    ).toISOString();
    expect(updateData.ended_at).toBe(expectedEndedAt);
  });

  it('computes correct delta for course progress (new - old values)', async () => {
    const existing = buildSession({
      duration_minutes: 30,
      modules_completed: 1,
      course_id: '00000000-0000-0000-0000-000000000100',
    });
    const updated = buildSession({ ...existing, duration_minutes: 90, modules_completed: 4 });

    mockClient.__setResult('study_sessions', 'select', { data: existing, error: null });
    mockClient.__setResult('study_sessions', 'update', { data: updated, error: null });
    mockClient.__setResult('courses', 'select', {
      data: { completed_modules: 10, completed_hours: 5.0, status: 'in_progress' },
      error: null,
    });
    mockClient.__setResult('courses', 'update', { data: null, error: null });
    mockClient.__setResult('daily_stats', 'upsert', { data: null, error: null });

    const { updateSession } = await import('./session-actions');
    await updateSession(existing.id, { durationMinutes: 90, modulesCompleted: 4 });

    // Delta: 4-1 = 3 modules, 90-30 = 60 minutes = 1 hour
    // Course: 10 + 3 = 13 modules, 5.0 + 1.0 = 6.0 hours
    const courseUpdates = mockClient.__getCalls('courses', 'update');
    expect(courseUpdates).toHaveLength(1);
    const courseData = courseUpdates[0].data as Record<string, unknown>;
    expect(courseData.completed_modules).toBe(13);
    expect(courseData.completed_hours).toBe(6);
  });

  it('skips course progress update when no delta', async () => {
    const existing = buildSession({ duration_minutes: 30, modules_completed: 2 });
    const updated = buildSession({ ...existing, notes: 'Updated notes' });

    mockClient.__setResult('study_sessions', 'select', { data: existing, error: null });
    mockClient.__setResult('study_sessions', 'update', { data: updated, error: null });
    mockClient.__setResult('daily_stats', 'upsert', { data: null, error: null });
    mockClient.__setResult('study_sessions', 'select', { data: [], error: null });

    const { updateSession } = await import('./session-actions');
    await updateSession(existing.id, { notes: 'Updated notes' });

    // No course updates because modules and duration didn't change
    const courseUpdates = mockClient.__getCalls('courses', 'update');
    expect(courseUpdates).toHaveLength(0);
  });

  it('rejects when session belongs to another user', async () => {
    const existing = buildSession({ user_id: 'other-user-id' });
    mockClient.__setResult('study_sessions', 'select', { data: existing, error: null });

    const { updateSession } = await import('./session-actions');
    const result = await updateSession(existing.id, { durationMinutes: 30 });
    expect(result.error).toBe('Unauthorized');

    // No update should have been attempted
    const updateCalls = mockClient.__getCalls('study_sessions', 'update');
    expect(updateCalls).toHaveLength(0);
  });

  it('rejects when session not found', async () => {
    mockClient.__setResult('study_sessions', 'select', { data: null, error: { message: 'not found' } });

    const { updateSession } = await import('./session-actions');
    const result = await updateSession('nonexistent', { durationMinutes: 30 });
    expect(result.error).toBe('Session not found');
  });
});

describe('deleteSession', () => {
  it('reverses course progress with negative deltas', async () => {
    const existing = buildSession({
      duration_minutes: 60,
      modules_completed: 3,
      course_id: '00000000-0000-0000-0000-000000000100',
    });
    mockClient.__setResult('study_sessions', 'select', { data: existing, error: null });
    mockClient.__setResult('study_sessions', 'delete', { data: null, error: null });
    mockClient.__setResult('courses', 'select', {
      data: { completed_modules: 10, completed_hours: 5.0, status: 'in_progress' },
      error: null,
    });
    mockClient.__setResult('courses', 'update', { data: null, error: null });
    mockClient.__setResult('daily_stats', 'upsert', { data: null, error: null });

    const { deleteSession } = await import('./session-actions');
    const result = await deleteSession(existing.id);
    expect(result.error).toBeUndefined();

    // Course progress should subtract: 10 - 3 = 7 modules, 5.0 - 1.0 = 4.0 hours
    const courseUpdates = mockClient.__getCalls('courses', 'update');
    expect(courseUpdates).toHaveLength(1);
    const courseData = courseUpdates[0].data as Record<string, unknown>;
    expect(courseData.completed_modules).toBe(7);
    expect(courseData.completed_hours).toBe(4);
  });

  it('clamps course progress at zero (never goes negative)', async () => {
    const existing = buildSession({
      duration_minutes: 120,
      modules_completed: 5,
    });
    mockClient.__setResult('study_sessions', 'select', { data: existing, error: null });
    mockClient.__setResult('study_sessions', 'delete', { data: null, error: null });
    mockClient.__setResult('courses', 'select', {
      data: { completed_modules: 3, completed_hours: 1.0, status: 'in_progress' },
      error: null,
    });
    mockClient.__setResult('courses', 'update', { data: null, error: null });
    mockClient.__setResult('daily_stats', 'upsert', { data: null, error: null });

    const { deleteSession } = await import('./session-actions');
    await deleteSession(existing.id);

    // Should clamp at 0: max(0, 3-5)=0 modules, max(0, 1.0-2.0)=0 hours
    const courseUpdates = mockClient.__getCalls('courses', 'update');
    const courseData = courseUpdates[0].data as Record<string, unknown>;
    expect(courseData.completed_modules).toBe(0);
    expect(courseData.completed_hours).toBe(0);
  });

  it('rejects unauthorized deletion without touching DB', async () => {
    const existing = buildSession({ user_id: 'other-user' });
    mockClient.__setResult('study_sessions', 'select', { data: existing, error: null });

    const { deleteSession } = await import('./session-actions');
    const result = await deleteSession(existing.id);
    expect(result.error).toBe('Unauthorized');

    // No delete should have been attempted
    const deleteCalls = mockClient.__getCalls('study_sessions', 'delete');
    expect(deleteCalls).toHaveLength(0);
  });

  it('returns error when session not found', async () => {
    mockClient.__setResult('study_sessions', 'select', { data: null, error: { message: 'not found' } });

    const { deleteSession } = await import('./session-actions');
    const result = await deleteSession('nonexistent');
    expect(result.error).toBe('Session not found');
  });
});

describe('fetchSessions', () => {
  it('transforms joined course data into flat fields', async () => {
    const sessions = [
      { ...buildSession(), courses: { title: 'React Mastery', platform: 'udemy' } },
      { ...buildSession(), courses: { title: 'TypeScript Deep Dive', platform: null } },
    ];
    mockClient.__setTableResult('study_sessions', { data: sessions, error: null });

    const { fetchSessions } = await import('./session-actions');
    const result = await fetchSessions({ limit: 10 });

    expect(result.data!.sessions).toHaveLength(2);
    // Verify data transformation: nested courses -> flat course_title/course_platform
    expect(result.data!.sessions[0].course_title).toBe('React Mastery');
    expect(result.data!.sessions[0].course_platform).toBe('udemy');
    expect(result.data!.sessions[1].course_title).toBe('TypeScript Deep Dive');
    expect(result.data!.sessions[1].course_platform).toBeNull();
  });

  it('detects next page when results exceed limit', async () => {
    // Return limit + 1 items to signal hasNextPage
    const sessions = Array.from({ length: 4 }, () => ({
      ...buildSession(),
      courses: { title: 'Test', platform: null },
    }));
    mockClient.__setTableResult('study_sessions', { data: sessions, error: null });

    const { fetchSessions } = await import('./session-actions');
    const result = await fetchSessions({ limit: 3 });

    // Should return only 3 (the limit), with hasNextPage = true
    expect(result.data!.sessions).toHaveLength(3);
    expect(result.data!.hasNextPage).toBe(true);
  });

  it('reports no next page when results are within limit', async () => {
    const sessions = [
      { ...buildSession(), courses: { title: 'Test', platform: null } },
    ];
    mockClient.__setTableResult('study_sessions', { data: sessions, error: null });

    const { fetchSessions } = await import('./session-actions');
    const result = await fetchSessions({ limit: 10 });

    expect(result.data!.sessions).toHaveLength(1);
    expect(result.data!.hasNextPage).toBe(false);
  });

  it('defaults to limit=10 when not specified', async () => {
    // 11 items -> hasNextPage true at default limit 10
    const sessions = Array.from({ length: 11 }, () => ({
      ...buildSession(),
      courses: { title: 'Test', platform: null },
    }));
    mockClient.__setTableResult('study_sessions', { data: sessions, error: null });

    const { fetchSessions } = await import('./session-actions');
    const result = await fetchSessions();

    expect(result.data!.sessions).toHaveLength(10);
    expect(result.data!.hasNextPage).toBe(true);
  });

  it('returns error on DB failure', async () => {
    mockClient.__setTableResult('study_sessions', { data: null, error: { message: 'DB error' } });

    const { fetchSessions } = await import('./session-actions');
    const result = await fetchSessions();
    expect(result.error).toBe('DB error');
  });
});
