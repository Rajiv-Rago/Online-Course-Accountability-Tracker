import { describe, it, expect } from 'vitest';
import {
  createSessionSchema,
  updateSessionSchema,
  fetchSessionsSchema,
} from './session-validation';

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';

describe('createSessionSchema', () => {
  it('accepts valid input', () => {
    const result = createSessionSchema.safeParse({
      courseId: VALID_UUID,
      date: '2026-03-15',
      durationMinutes: 60,
      modulesCompleted: 2,
      notes: 'Covered chapters 3-4',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid UUID for courseId', () => {
    const result = createSessionSchema.safeParse({
      courseId: 'bad-id',
      date: '2026-03-15',
      durationMinutes: 60,
    });
    expect(result.success).toBe(false);
  });

  it('rejects bad date format (MM/DD/YYYY)', () => {
    const result = createSessionSchema.safeParse({
      courseId: VALID_UUID,
      date: '03/15/2026',
      durationMinutes: 60,
    });
    expect(result.success).toBe(false);
  });

  it('rejects bad date format (no dashes)', () => {
    const result = createSessionSchema.safeParse({
      courseId: VALID_UUID,
      date: '20260315',
      durationMinutes: 60,
    });
    expect(result.success).toBe(false);
  });

  it('rejects duration of 0 minutes', () => {
    const result = createSessionSchema.safeParse({
      courseId: VALID_UUID,
      date: '2026-03-15',
      durationMinutes: 0,
    });
    expect(result.success).toBe(false);
  });

  it('rejects duration of 481 minutes', () => {
    const result = createSessionSchema.safeParse({
      courseId: VALID_UUID,
      date: '2026-03-15',
      durationMinutes: 481,
    });
    expect(result.success).toBe(false);
  });

  it('accepts duration of exactly 1 minute', () => {
    const result = createSessionSchema.safeParse({
      courseId: VALID_UUID,
      date: '2026-03-15',
      durationMinutes: 1,
    });
    expect(result.success).toBe(true);
  });

  it('accepts duration of exactly 480 minutes', () => {
    const result = createSessionSchema.safeParse({
      courseId: VALID_UUID,
      date: '2026-03-15',
      durationMinutes: 480,
    });
    expect(result.success).toBe(true);
  });

  it('rejects notes longer than 500 characters', () => {
    const result = createSessionSchema.safeParse({
      courseId: VALID_UUID,
      date: '2026-03-15',
      durationMinutes: 60,
      notes: 'X'.repeat(501),
    });
    expect(result.success).toBe(false);
  });

  it('defaults modulesCompleted to 0', () => {
    const result = createSessionSchema.safeParse({
      courseId: VALID_UUID,
      date: '2026-03-15',
      durationMinutes: 60,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.modulesCompleted).toBe(0);
    }
  });
});

describe('updateSessionSchema', () => {
  it('accepts valid partial update with durationMinutes only', () => {
    const result = updateSessionSchema.safeParse({
      durationMinutes: 45,
    });
    expect(result.success).toBe(true);
  });

  it('accepts valid partial update with modulesCompleted only', () => {
    const result = updateSessionSchema.safeParse({
      modulesCompleted: 3,
    });
    expect(result.success).toBe(true);
  });

  it('accepts empty object (all fields optional)', () => {
    const result = updateSessionSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts notes set to null', () => {
    const result = updateSessionSchema.safeParse({
      notes: null,
    });
    expect(result.success).toBe(true);
  });
});

describe('fetchSessionsSchema', () => {
  it('defaults limit to 10 when not provided', () => {
    const result = fetchSessionsSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(10);
    }
  });

  it('rejects invalid cursor UUID', () => {
    const result = fetchSessionsSchema.safeParse({
      cursor: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });

  it('accepts valid courseId filter', () => {
    const result = fetchSessionsSchema.safeParse({
      courseId: VALID_UUID,
    });
    expect(result.success).toBe(true);
  });
});
