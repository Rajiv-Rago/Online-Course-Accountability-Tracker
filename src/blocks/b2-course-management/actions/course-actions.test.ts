import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setMockUser, clearMockUser, DEFAULT_USER } from '@/test/helpers/auth';
import { buildCourse } from '@/test/factories';
import type { MockSupabaseClient } from '@/test/mocks/supabase';

let mockClient: MockSupabaseClient;

beforeEach(async () => {
  vi.clearAllMocks();
  mockClient = await setMockUser();
});

describe('getCourses', () => {
  it('returns courses array from DB', async () => {
    const courses = [buildCourse({ title: 'React' }), buildCourse({ title: 'TypeScript' })];
    mockClient.__setTableResult('courses', { data: courses, error: null });

    const { getCourses } = await import('./course-actions');
    const result = await getCourses();

    expect(result.data).toHaveLength(2);
    expect(result.data![0].title).toBe('React');
    expect(result.data![1].title).toBe('TypeScript');
  });

  it('returns empty array when no courses', async () => {
    mockClient.__setTableResult('courses', { data: [], error: null });

    const { getCourses } = await import('./course-actions');
    const result = await getCourses();
    expect(result.data).toEqual([]);
  });

  it('propagates DB error', async () => {
    mockClient.__setTableResult('courses', { data: null, error: { message: 'Connection refused' } });

    const { getCourses } = await import('./course-actions');
    const result = await getCourses();
    expect(result.error).toBe('Connection refused');
  });
});

describe('createCourse', () => {
  it('inserts with status=not_started, completed=0, and auto-incremented sort_order', async () => {
    // Existing max sort_order is 2
    mockClient.__setResult('courses', 'select', {
      data: { sort_order: 2 },
      error: null,
    });
    const newCourse = buildCourse({ status: 'not_started', sort_order: 3 });
    mockClient.__setResult('courses', 'insert', { data: newCourse, error: null });

    const { createCourse } = await import('./course-actions');
    const result = await createCourse({
      title: 'New Course',
      platform: 'udemy',
      url: 'https://udemy.com/test',
      total_modules: 20,
      total_hours: null,
      target_completion_date: '2026-12-31',
      priority: 1,
      notes: 'Important course',
    });

    expect(result.data).toEqual(newCourse);

    // Verify insert payload has correct defaults and computed sort_order
    const insertCalls = mockClient.__getCalls('courses', 'insert');
    expect(insertCalls).toHaveLength(1);
    const insertedData = insertCalls[0].data as Record<string, unknown>;
    expect(insertedData.user_id).toBe(DEFAULT_USER.id);
    expect(insertedData.title).toBe('New Course');
    expect(insertedData.platform).toBe('udemy');
    expect(insertedData.url).toBe('https://udemy.com/test');
    expect(insertedData.total_modules).toBe(20);
    expect(insertedData.priority).toBe(1);
    expect(insertedData.notes).toBe('Important course');
    // Defaults
    expect(insertedData.status).toBe('not_started');
    expect(insertedData.completed_modules).toBe(0);
    expect(insertedData.completed_hours).toBe(0);
    // sort_order: max(2) + 1 = 3
    expect(insertedData.sort_order).toBe(3);
  });

  it('starts sort_order at 0 when no existing courses', async () => {
    // No existing courses (single returns error)
    mockClient.__setResult('courses', 'select', { data: null, error: { message: 'not found' } });
    const newCourse = buildCourse({ sort_order: 0 });
    mockClient.__setResult('courses', 'insert', { data: newCourse, error: null });

    const { createCourse } = await import('./course-actions');
    await createCourse({
      title: 'First Course',
      platform: null,
      url: null,
      total_modules: null,
      total_hours: null,
      target_completion_date: null,
      priority: 2,
      notes: null,
    });

    const insertCalls = mockClient.__getCalls('courses', 'insert');
    const insertedData = insertCalls[0].data as Record<string, unknown>;
    // (null ?? -1) + 1 = 0
    expect(insertedData.sort_order).toBe(0);
  });

  it('returns specific message when unauthenticated', async () => {
    await clearMockUser();

    const { createCourse } = await import('./course-actions');
    const result = await createCourse({
      title: 'New Course',
      platform: null,
      url: null,
      total_modules: null,
      total_hours: null,
      target_completion_date: null,
      priority: 2,
      notes: null,
    });

    expect(result.error).toBe('You must be logged in');
  });

  it('rejects empty title via validation', async () => {
    const { createCourse } = await import('./course-actions');
    const result = await createCourse({
      title: '',
      platform: null,
      url: null,
      total_modules: null,
      total_hours: null,
      target_completion_date: null,
      priority: 2,
      notes: null,
    });

    expect(result.error).toBeDefined();
    // No DB calls should have been made
    const insertCalls = mockClient.__getCalls('courses', 'insert');
    expect(insertCalls).toHaveLength(0);
  });
});

describe('updateCourse', () => {
  it('sends only the validated fields to Supabase update', async () => {
    const updated = buildCourse({ title: 'Updated Title' });
    mockClient.__setResult('courses', 'update', { data: updated, error: null });

    const { updateCourse } = await import('./course-actions');
    const result = await updateCourse('course-id', { title: 'Updated Title' });

    expect(result.data!.title).toBe('Updated Title');

    const updateCalls = mockClient.__getCalls('courses', 'update');
    expect(updateCalls).toHaveLength(1);
    const updateData = updateCalls[0].data as Record<string, unknown>;
    expect(updateData.title).toBe('Updated Title');
  });
});

describe('deleteCourse', () => {
  it('deletes the course by ID', async () => {
    mockClient.__setResult('courses', 'delete', { data: null, error: null });

    const { deleteCourse } = await import('./course-actions');
    const result = await deleteCourse('course-123');
    expect(result.error).toBeUndefined();

    const deleteCalls = mockClient.__getCalls('courses', 'delete');
    expect(deleteCalls).toHaveLength(1);
    const eqFilters = deleteCalls[0].filters.filter((f) => f.method === 'eq');
    expect(eqFilters).toContainEqual({ method: 'eq', args: ['id', 'course-123'] });
  });

  it('returns error when unauthenticated', async () => {
    await clearMockUser();

    const { deleteCourse } = await import('./course-actions');
    const result = await deleteCourse('some-id');
    expect(result.error).toBeDefined();
  });
});

describe('transitionStatus', () => {
  it('updates status on valid transition: in_progress -> paused', async () => {
    const course = buildCourse({ status: 'in_progress' });
    const paused = buildCourse({ ...course, status: 'paused' });
    mockClient.__setResult('courses', 'select', { data: course, error: null });
    mockClient.__setResult('courses', 'update', { data: paused, error: null });

    const { transitionStatus } = await import('./course-actions');
    const result = await transitionStatus(course.id, 'paused');

    expect(result.error).toBeUndefined();
    expect(result.data!.status).toBe('paused');

    // Verify update payload contains { status: 'paused' }
    const updateCalls = mockClient.__getCalls('courses', 'update');
    expect(updateCalls).toHaveLength(1);
    expect(updateCalls[0].data).toEqual({ status: 'paused' });
  });

  it('rejects invalid transition: not_started -> completed', async () => {
    const course = buildCourse({ status: 'not_started' });
    mockClient.__setTableResult('courses', { data: course, error: null });

    const { transitionStatus } = await import('./course-actions');
    const result = await transitionStatus(course.id, 'completed');

    expect(result.error).toBe('Cannot transition from not_started to completed');

    // No update should have been attempted
    const updateCalls = mockClient.__getCalls('courses', 'update');
    expect(updateCalls).toHaveLength(0);
  });

  it('rejects invalid transition: completed -> paused', async () => {
    const course = buildCourse({ status: 'completed' });
    mockClient.__setTableResult('courses', { data: course, error: null });

    const { transitionStatus } = await import('./course-actions');
    const result = await transitionStatus(course.id, 'paused');
    expect(result.error).toBe('Cannot transition from completed to paused');
  });

  it('allows abandoned -> in_progress (restart)', async () => {
    const course = buildCourse({ status: 'abandoned' });
    const restarted = buildCourse({ ...course, status: 'in_progress' });
    mockClient.__setResult('courses', 'select', { data: course, error: null });
    mockClient.__setResult('courses', 'update', { data: restarted, error: null });

    const { transitionStatus } = await import('./course-actions');
    const result = await transitionStatus(course.id, 'in_progress');
    expect(result.error).toBeUndefined();
    expect(result.data!.status).toBe('in_progress');
  });

  it('allows in_progress -> completed', async () => {
    const course = buildCourse({ status: 'in_progress' });
    const completed = buildCourse({ ...course, status: 'completed' });
    mockClient.__setResult('courses', 'select', { data: course, error: null });
    mockClient.__setResult('courses', 'update', { data: completed, error: null });

    const { transitionStatus } = await import('./course-actions');
    const result = await transitionStatus(course.id, 'completed');
    expect(result.error).toBeUndefined();
    expect(result.data!.status).toBe('completed');
  });

  it('returns error when course not found', async () => {
    mockClient.__setTableResult('courses', { data: null, error: { message: 'not found' } });

    const { transitionStatus } = await import('./course-actions');
    const result = await transitionStatus('nonexistent', 'in_progress');
    expect(result.error).toBe('Course not found');
  });
});

describe('getCourseStats', () => {
  it('computes aggregated stats from sessions', async () => {
    const sessions = [
      { duration_minutes: 30, started_at: '2024-06-14T10:00:00Z' },
      { duration_minutes: 60, started_at: '2024-06-15T14:00:00Z' },
      { duration_minutes: 45, started_at: '2024-06-13T09:00:00Z' },
    ];
    mockClient.__setTableResult('study_sessions', { data: sessions, error: null });

    const { getCourseStats } = await import('./course-actions');
    const result = await getCourseStats('course-1');

    expect(result.data!.total_sessions).toBe(3);
    // 30 + 60 + 45 = 135
    expect(result.data!.total_minutes).toBe(135);
    // 135 / 3 = 45
    expect(result.data!.avg_session_minutes).toBe(45);
    // Latest started_at
    expect(result.data!.last_session_at).toBe('2024-06-15T14:00:00Z');
  });

  it('returns zeros for no sessions', async () => {
    mockClient.__setTableResult('study_sessions', { data: [], error: null });

    const { getCourseStats } = await import('./course-actions');
    const result = await getCourseStats('course-1');

    expect(result.data!.total_sessions).toBe(0);
    expect(result.data!.total_minutes).toBe(0);
    expect(result.data!.avg_session_minutes).toBe(0);
    expect(result.data!.last_session_at).toBeNull();
  });
});

describe('bulkUpdateStatus', () => {
  it('updates status and filters by IDs using .in()', async () => {
    mockClient.__setResult('courses', 'update', { data: null, error: null });

    const { bulkUpdateStatus } = await import('./course-actions');
    const result = await bulkUpdateStatus(['id1', 'id2', 'id3'], 'paused');
    expect(result.error).toBeUndefined();

    const updateCalls = mockClient.__getCalls('courses', 'update');
    expect(updateCalls).toHaveLength(1);
    expect(updateCalls[0].data).toEqual({ status: 'paused' });

    // Verify .in() filter was used with the course IDs
    const inFilter = updateCalls[0].filters.find((f) => f.method === 'in');
    expect(inFilter?.args).toEqual(['id', ['id1', 'id2', 'id3']]);
  });
});

describe('bulkDeleteCourses', () => {
  it('deletes multiple courses by IDs using .in()', async () => {
    mockClient.__setResult('courses', 'delete', { data: null, error: null });

    const { bulkDeleteCourses } = await import('./course-actions');
    const result = await bulkDeleteCourses(['id1', 'id2']);
    expect(result.error).toBeUndefined();

    const deleteCalls = mockClient.__getCalls('courses', 'delete');
    expect(deleteCalls).toHaveLength(1);

    const inFilter = deleteCalls[0].filters.find((f) => f.method === 'in');
    expect(inFilter?.args).toEqual(['id', ['id1', 'id2']]);
  });
});

describe('reorderCourses', () => {
  it('assigns sort_order based on array index position', async () => {
    mockClient.__setResult('courses', 'update', { data: null, error: null });

    const { reorderCourses } = await import('./course-actions');
    const result = await reorderCourses(['id-a', 'id-b', 'id-c']);
    expect(result.error).toBeUndefined();

    // Should issue 3 updates, one per course
    const updateCalls = mockClient.__getCalls('courses', 'update');
    expect(updateCalls).toHaveLength(3);

    // Verify each gets its index as sort_order
    expect(updateCalls[0].data).toEqual({ sort_order: 0 });
    expect(updateCalls[1].data).toEqual({ sort_order: 1 });
    expect(updateCalls[2].data).toEqual({ sort_order: 2 });

    // Verify each targets the correct course ID
    const ids = updateCalls.map((c) =>
      c.filters.find((f) => f.method === 'eq')?.args[1]
    );
    expect(ids).toEqual(['id-a', 'id-b', 'id-c']);
  });
});
