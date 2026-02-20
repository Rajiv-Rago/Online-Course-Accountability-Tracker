import { describe, it, expect } from 'vitest';
import {
  createCourseSchema,
  updateCourseSchema,
  statusTransitionSchema,
  bulkActionSchema,
  reorderSchema,
} from './course-validation';

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';

// Helpers using local date to match validation logic
function localDateStr(d: Date): string {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
}

function futureDate(daysAhead = 30): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return localDateStr(d);
}

function pastDate(daysAgo = 30): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return localDateStr(d);
}

function todayDate(): string {
  return localDateStr(new Date());
}

describe('createCourseSchema', () => {
  it('accepts valid minimal input', () => {
    const result = createCourseSchema.safeParse({
      title: 'Learn TypeScript',
      platform: null,
      url: null,
      total_modules: null,
      total_hours: null,
      target_completion_date: null,
      notes: null,
    });
    expect(result.success).toBe(true);
  });

  it('accepts valid full input', () => {
    const result = createCourseSchema.safeParse({
      title: 'Advanced React Patterns',
      platform: 'udemy',
      url: 'https://udemy.com/course/react',
      total_modules: 42,
      total_hours: 20,
      target_completion_date: futureDate(),
      priority: 1,
      notes: 'Focus on hooks and context patterns.',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty title', () => {
    const result = createCourseSchema.safeParse({
      title: '',
      platform: null,
      url: null,
      total_modules: null,
      total_hours: null,
      target_completion_date: null,
      notes: null,
    });
    expect(result.success).toBe(false);
  });

  it('rejects title longer than 200 characters', () => {
    const result = createCourseSchema.safeParse({
      title: 'A'.repeat(201),
      platform: null,
      url: null,
      total_modules: null,
      total_hours: null,
      target_completion_date: null,
      notes: null,
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid URL', () => {
    const result = createCourseSchema.safeParse({
      title: 'Test',
      platform: null,
      url: 'not-a-url',
      total_modules: null,
      total_hours: null,
      target_completion_date: null,
      notes: null,
    });
    expect(result.success).toBe(false);
  });

  it('transforms empty URL to null', () => {
    const result = createCourseSchema.safeParse({
      title: 'Test',
      platform: null,
      url: '',
      total_modules: null,
      total_hours: null,
      target_completion_date: null,
      notes: null,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.url).toBeNull();
    }
  });

  it('rejects past target_completion_date', () => {
    const result = createCourseSchema.safeParse({
      title: 'Test',
      platform: null,
      url: null,
      total_modules: null,
      total_hours: null,
      target_completion_date: pastDate(),
      notes: null,
    });
    expect(result.success).toBe(false);
  });

  it('accepts today as target_completion_date', () => {
    const result = createCourseSchema.safeParse({
      title: 'Test',
      platform: null,
      url: null,
      total_modules: null,
      total_hours: null,
      target_completion_date: todayDate(),
      notes: null,
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid priority value', () => {
    const result = createCourseSchema.safeParse({
      title: 'Test',
      platform: null,
      url: null,
      total_modules: null,
      total_hours: null,
      target_completion_date: null,
      priority: 5,
      notes: null,
    });
    expect(result.success).toBe(false);
  });

  it('rejects notes longer than 5000 characters', () => {
    const result = createCourseSchema.safeParse({
      title: 'Test',
      platform: null,
      url: null,
      total_modules: null,
      total_hours: null,
      target_completion_date: null,
      notes: 'X'.repeat(5001),
    });
    expect(result.success).toBe(false);
  });

  it('defaults priority to 2 when not provided', () => {
    const result = createCourseSchema.safeParse({
      title: 'Test',
      platform: null,
      url: null,
      total_modules: null,
      total_hours: null,
      target_completion_date: null,
      notes: null,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.priority).toBe(2);
    }
  });
});

describe('updateCourseSchema', () => {
  it('rejects completed_modules exceeding total_modules', () => {
    const result = updateCourseSchema.safeParse({
      total_modules: 10,
      completed_modules: 15,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'));
      expect(paths).toContain('completed_modules');
    }
  });

  it('rejects completed_hours exceeding total_hours', () => {
    const result = updateCourseSchema.safeParse({
      total_hours: 20,
      completed_hours: 25,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'));
      expect(paths).toContain('completed_hours');
    }
  });

  it('accepts valid partial update', () => {
    const result = updateCourseSchema.safeParse({
      title: 'Updated Title',
      completed_modules: 5,
      total_modules: 10,
    });
    expect(result.success).toBe(true);
  });
});

describe('statusTransitionSchema', () => {
  it('accepts valid input', () => {
    const result = statusTransitionSchema.safeParse({
      courseId: VALID_UUID,
      newStatus: 'in_progress',
      reason: 'Starting the course now',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid UUID for courseId', () => {
    const result = statusTransitionSchema.safeParse({
      courseId: 'not-a-uuid',
      newStatus: 'in_progress',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid status value', () => {
    const result = statusTransitionSchema.safeParse({
      courseId: VALID_UUID,
      newStatus: 'invalid_status',
    });
    expect(result.success).toBe(false);
  });
});

describe('bulkActionSchema', () => {
  it('accepts valid array of UUIDs', () => {
    const result = bulkActionSchema.safeParse({
      ids: [VALID_UUID],
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty array', () => {
    const result = bulkActionSchema.safeParse({
      ids: [],
    });
    expect(result.success).toBe(false);
  });

  it('rejects array with more than 50 UUIDs', () => {
    const ids = Array.from({ length: 51 }, (_, i) =>
      `550e8400-e29b-41d4-a716-${String(i).padStart(12, '0')}`
    );
    const result = bulkActionSchema.safeParse({ ids });
    expect(result.success).toBe(false);
  });

  it('rejects invalid UUID in array', () => {
    const result = bulkActionSchema.safeParse({
      ids: [VALID_UUID, 'not-a-uuid'],
    });
    expect(result.success).toBe(false);
  });
});

describe('reorderSchema', () => {
  it('accepts valid array of UUIDs', () => {
    const result = reorderSchema.safeParse({
      orderedIds: [VALID_UUID],
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty array', () => {
    const result = reorderSchema.safeParse({
      orderedIds: [],
    });
    expect(result.success).toBe(false);
  });
});
