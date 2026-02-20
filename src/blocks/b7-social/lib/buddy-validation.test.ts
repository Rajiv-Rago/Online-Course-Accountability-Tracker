import { describe, it, expect } from 'vitest';
import {
  sendBuddyRequestSchema,
  respondToRequestSchema,
  removeBuddySchema,
  buddySearchSchema,
  shareAchievementSchema,
  checkAchievementsSchema,
} from './buddy-validation';

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';

// ---------------------------------------------------------------------------
// sendBuddyRequestSchema
// ---------------------------------------------------------------------------

describe('sendBuddyRequestSchema', () => {
  it('accepts valid UUID', () => {
    const result = sendBuddyRequestSchema.safeParse({
      recipientId: VALID_UUID,
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid UUID', () => {
    const result = sendBuddyRequestSchema.safeParse({
      recipientId: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// respondToRequestSchema
// ---------------------------------------------------------------------------

describe('respondToRequestSchema', () => {
  it('accepts valid UUID', () => {
    const result = respondToRequestSchema.safeParse({
      relationshipId: VALID_UUID,
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid UUID', () => {
    const result = respondToRequestSchema.safeParse({
      relationshipId: 'bad',
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// removeBuddySchema
// ---------------------------------------------------------------------------

describe('removeBuddySchema', () => {
  it('accepts valid UUID', () => {
    const result = removeBuddySchema.safeParse({
      relationshipId: VALID_UUID,
    });
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// buddySearchSchema
// ---------------------------------------------------------------------------

describe('buddySearchSchema', () => {
  it('accepts valid 2-character query', () => {
    const result = buddySearchSchema.safeParse({ query: 'ab' });
    expect(result.success).toBe(true);
  });

  it('rejects 1-character query', () => {
    const result = buddySearchSchema.safeParse({ query: 'a' });
    expect(result.success).toBe(false);
  });

  it('rejects query longer than 100 characters', () => {
    const result = buddySearchSchema.safeParse({ query: 'x'.repeat(101) });
    expect(result.success).toBe(false);
  });

  it('trims whitespace before validation', () => {
    const result = buddySearchSchema.safeParse({ query: '  hello  ' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.query).toBe('hello');
    }
  });

  it('rejects query that is only whitespace (under min after trim)', () => {
    // A single space trims to empty string which is < 2 chars
    const result = buddySearchSchema.safeParse({ query: ' ' });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// shareAchievementSchema
// ---------------------------------------------------------------------------

describe('shareAchievementSchema', () => {
  it('accepts valid input with shared true', () => {
    const result = shareAchievementSchema.safeParse({
      achievementId: VALID_UUID,
      shared: true,
    });
    expect(result.success).toBe(true);
  });

  it('accepts valid input with shared false', () => {
    const result = shareAchievementSchema.safeParse({
      achievementId: VALID_UUID,
      shared: false,
    });
    expect(result.success).toBe(true);
  });

  it('rejects non-boolean shared value', () => {
    const result = shareAchievementSchema.safeParse({
      achievementId: VALID_UUID,
      shared: 'yes',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid achievementId', () => {
    const result = shareAchievementSchema.safeParse({
      achievementId: 'bad',
      shared: true,
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// checkAchievementsSchema
// ---------------------------------------------------------------------------

describe('checkAchievementsSchema', () => {
  const validTriggers = [
    'session_logged',
    'daily_stats_updated',
    'course_status_changed',
    'buddy_count_changed',
  ] as const;

  it.each(validTriggers)('accepts valid trigger "%s"', (trigger) => {
    const result = checkAchievementsSchema.safeParse({ trigger });
    expect(result.success).toBe(true);
  });

  it('rejects unknown trigger', () => {
    const result = checkAchievementsSchema.safeParse({
      trigger: 'unknown_event',
    });
    expect(result.success).toBe(false);
  });
});
