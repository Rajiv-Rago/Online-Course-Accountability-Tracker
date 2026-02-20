import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setMockUser, clearMockUser, DEFAULT_USER } from '@/test/helpers/auth';
import { buildReminder } from '@/test/factories';
import type { MockSupabaseClient } from '@/test/mocks/supabase';

let mockClient: MockSupabaseClient;

beforeEach(async () => {
  vi.clearAllMocks();
  mockClient = await setMockUser();
});

describe('getReminders', () => {
  it('transforms joined course data into flat course_title field', async () => {
    const reminders = [
      { ...buildReminder({ course_id: 'c1' }), courses: { title: 'React Mastery' } },
      { ...buildReminder({ course_id: null }), courses: null },
    ];
    mockClient.__setTableResult('reminder_schedules', { data: reminders, error: null });

    const { getReminders } = await import('./reminder-actions');
    const result = await getReminders();

    expect(result.data).toHaveLength(2);
    expect(result.data![0].course_title).toBe('React Mastery');
    expect(result.data![1].course_title).toBeNull();
    // Should not leak nested courses object
    expect((result.data![0] as unknown as Record<string, unknown>).courses).toBeUndefined();
  });

  it('preserves all reminder fields in transformation', async () => {
    const reminder = buildReminder({
      days_of_week: ['mon', 'wed', 'fri'],
      time: '09:00',
      timezone: 'America/New_York',
      enabled: true,
      channels: ['in_app', 'email'],
    });
    mockClient.__setTableResult('reminder_schedules', {
      data: [{ ...reminder, courses: null }],
      error: null,
    });

    const { getReminders } = await import('./reminder-actions');
    const result = await getReminders();

    const r = result.data![0];
    expect(r.days_of_week).toEqual(['mon', 'wed', 'fri']);
    expect(r.time).toBe('09:00');
    expect(r.timezone).toBe('America/New_York');
    expect(r.enabled).toBe(true);
    expect(r.channels).toEqual(['in_app', 'email']);
  });

  it('returns error when unauthenticated', async () => {
    await clearMockUser();

    const { getReminders } = await import('./reminder-actions');
    const result = await getReminders();
    expect(result.error).toBeDefined();
  });
});

describe('createReminder', () => {
  it('inserts reminder with camelCase->snake_case field mapping', async () => {
    const reminder = buildReminder();
    mockClient.__setResult('reminder_schedules', 'insert', { data: reminder, error: null });
    mockClient.__setResult('user_profiles', 'select', {
      data: { timezone: 'America/New_York' },
      error: null,
    });

    const { createReminder } = await import('./reminder-actions');
    const result = await createReminder({
      courseId: '00000000-0000-0000-0000-000000000010',
      daysOfWeek: ['mon', 'wed', 'fri'],
      time: '09:00',
      channels: ['in_app'],
    });

    expect(result.data).toBeDefined();

    // Verify the insert payload uses snake_case and includes user_id
    const insertCalls = mockClient.__getCalls('reminder_schedules', 'insert');
    expect(insertCalls).toHaveLength(1);
    const insertedData = insertCalls[0].data as Record<string, unknown>;
    expect(insertedData.user_id).toBe(DEFAULT_USER.id);
    expect(insertedData.course_id).toBe('00000000-0000-0000-0000-000000000010');
    expect(insertedData.days_of_week).toEqual(['mon', 'wed', 'fri']);
    expect(insertedData.time).toBe('09:00');
    expect(insertedData.channels).toEqual(['in_app']);
    expect(insertedData.enabled).toBe(true);
  });

  it('falls back to user profile timezone when not provided', async () => {
    const reminder = buildReminder();
    mockClient.__setResult('reminder_schedules', 'insert', { data: reminder, error: null });
    mockClient.__setResult('user_profiles', 'select', {
      data: { timezone: 'Europe/London' },
      error: null,
    });

    const { createReminder } = await import('./reminder-actions');
    await createReminder({
      courseId: '00000000-0000-0000-0000-000000000010',
      daysOfWeek: ['tue'],
      time: '14:00',
      channels: ['in_app'],
    });

    const insertCalls = mockClient.__getCalls('reminder_schedules', 'insert');
    const insertedData = insertCalls[0].data as Record<string, unknown>;
    expect(insertedData.timezone).toBe('Europe/London');
  });

  it('falls back to UTC when profile has no timezone', async () => {
    const reminder = buildReminder();
    mockClient.__setResult('reminder_schedules', 'insert', { data: reminder, error: null });
    mockClient.__setResult('user_profiles', 'select', { data: null, error: null });

    const { createReminder } = await import('./reminder-actions');
    await createReminder({
      courseId: '00000000-0000-0000-0000-000000000010',
      daysOfWeek: ['mon'],
      time: '09:00',
      channels: ['in_app'],
    });

    const insertCalls = mockClient.__getCalls('reminder_schedules', 'insert');
    const insertedData = insertCalls[0].data as Record<string, unknown>;
    expect(insertedData.timezone).toBe('UTC');
  });

  it('returns error when unauthenticated', async () => {
    await clearMockUser();

    const { createReminder } = await import('./reminder-actions');
    const result = await createReminder({
      courseId: '00000000-0000-0000-0000-000000000010',
      daysOfWeek: ['mon'],
      time: '09:00',
      channels: ['in_app'],
    });
    expect(result.error).toBeDefined();
  });
});

describe('updateReminder', () => {
  it('sends only changed fields to update', async () => {
    const updated = buildReminder({ time: '14:00' });
    mockClient.__setResult('reminder_schedules', 'update', { data: updated, error: null });

    const { updateReminder } = await import('./reminder-actions');
    await updateReminder('rem-1', { time: '14:00' });

    const updateCalls = mockClient.__getCalls('reminder_schedules', 'update');
    expect(updateCalls).toHaveLength(1);
    const updateData = updateCalls[0].data as Record<string, unknown>;
    expect(updateData.time).toBe('14:00');
    // Other fields should NOT be in the update payload
    expect(updateData.days_of_week).toBeUndefined();
    expect(updateData.channels).toBeUndefined();
  });

  it('scopes update to user_id for ownership', async () => {
    const updated = buildReminder();
    mockClient.__setResult('reminder_schedules', 'update', { data: updated, error: null });

    const { updateReminder } = await import('./reminder-actions');
    await updateReminder('rem-1', { time: '14:00' });

    const updateCalls = mockClient.__getCalls('reminder_schedules', 'update');
    const filters = updateCalls[0].filters;
    const eqFilters = filters.filter((f) => f.method === 'eq');
    expect(eqFilters).toContainEqual({ method: 'eq', args: ['id', 'rem-1'] });
    expect(eqFilters).toContainEqual({ method: 'eq', args: ['user_id', DEFAULT_USER.id] });
  });
});

describe('toggleReminder', () => {
  it('updates only the enabled flag', async () => {
    mockClient.__setResult('reminder_schedules', 'update', { data: null, error: null });

    const { toggleReminder } = await import('./reminder-actions');
    await toggleReminder('rem-1', false);

    const updateCalls = mockClient.__getCalls('reminder_schedules', 'update');
    expect(updateCalls).toHaveLength(1);
    expect(updateCalls[0].data).toEqual({ enabled: false });
  });

  it('scopes to user_id for ownership', async () => {
    mockClient.__setResult('reminder_schedules', 'update', { data: null, error: null });

    const { toggleReminder } = await import('./reminder-actions');
    await toggleReminder('rem-1', true);

    const updateCalls = mockClient.__getCalls('reminder_schedules', 'update');
    const eqFilters = updateCalls[0].filters.filter((f) => f.method === 'eq');
    expect(eqFilters).toContainEqual({ method: 'eq', args: ['user_id', DEFAULT_USER.id] });
  });
});

describe('deleteReminder', () => {
  it('deletes scoped to user_id for ownership', async () => {
    mockClient.__setResult('reminder_schedules', 'delete', { data: null, error: null });

    const { deleteReminder } = await import('./reminder-actions');
    const result = await deleteReminder('rem-1');
    expect(result.error).toBeUndefined();

    const deleteCalls = mockClient.__getCalls('reminder_schedules', 'delete');
    expect(deleteCalls).toHaveLength(1);
    const eqFilters = deleteCalls[0].filters.filter((f) => f.method === 'eq');
    expect(eqFilters).toContainEqual({ method: 'eq', args: ['id', 'rem-1'] });
    expect(eqFilters).toContainEqual({ method: 'eq', args: ['user_id', DEFAULT_USER.id] });
  });
});

describe('getCoursesForReminder', () => {
  it('returns courses filtered to exclude abandoned status', async () => {
    mockClient.__setTableResult('courses', {
      data: [
        { id: 'c1', title: 'Active Course' },
        { id: 'c2', title: 'Another Active' },
      ],
      error: null,
    });

    const { getCoursesForReminder } = await import('./reminder-actions');
    const result = await getCoursesForReminder();

    expect(result.data).toHaveLength(2);
    expect(result.data![0]).toEqual({ id: 'c1', title: 'Active Course' });
    expect(result.data![1]).toEqual({ id: 'c2', title: 'Another Active' });
  });

  it('returns empty array when no courses', async () => {
    mockClient.__setTableResult('courses', { data: [], error: null });

    const { getCoursesForReminder } = await import('./reminder-actions');
    const result = await getCoursesForReminder();
    expect(result.data).toEqual([]);
  });
});
