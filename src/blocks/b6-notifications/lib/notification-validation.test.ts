import { describe, it, expect } from 'vitest';
import {
  notificationTypeEnum,
  channelEnum,
  notificationCreateSchema,
  reminderCreateSchema,
} from './notification-validation';

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';

// ---------------------------------------------------------------------------
// notificationTypeEnum
// ---------------------------------------------------------------------------

describe('notificationTypeEnum', () => {
  const validTypes = [
    'reminder',
    'risk_alert',
    'achievement',
    'buddy_update',
    'weekly_report',
    'streak_warning',
  ] as const;

  it.each(validTypes)('accepts valid type "%s"', (type) => {
    const result = notificationTypeEnum.safeParse(type);
    expect(result.success).toBe(true);
  });

  it('rejects unknown type', () => {
    const result = notificationTypeEnum.safeParse('sms_alert');
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// channelEnum
// ---------------------------------------------------------------------------

describe('channelEnum', () => {
  const validChannels = ['in_app', 'email', 'push', 'slack', 'discord'] as const;

  it.each(validChannels)('accepts valid channel "%s"', (channel) => {
    const result = channelEnum.safeParse(channel);
    expect(result.success).toBe(true);
  });

  it('rejects unknown channel', () => {
    const result = channelEnum.safeParse('telegram');
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// notificationCreateSchema
// ---------------------------------------------------------------------------

describe('notificationCreateSchema', () => {
  it('accepts valid notification', () => {
    const result = notificationCreateSchema.safeParse({
      userId: VALID_UUID,
      type: 'reminder',
      title: 'Study time!',
      message: 'Time to study React patterns.',
      actionUrl: '/courses/123',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid UUID for userId', () => {
    const result = notificationCreateSchema.safeParse({
      userId: 'bad-id',
      type: 'reminder',
      title: 'Study time!',
      message: 'Go study.',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty title', () => {
    const result = notificationCreateSchema.safeParse({
      userId: VALID_UUID,
      type: 'reminder',
      title: '',
      message: 'Go study.',
    });
    expect(result.success).toBe(false);
  });

  it('rejects message longer than 2000 characters', () => {
    const result = notificationCreateSchema.safeParse({
      userId: VALID_UUID,
      type: 'reminder',
      title: 'Reminder',
      message: 'X'.repeat(2001),
    });
    expect(result.success).toBe(false);
  });

  it('rejects actionUrl that does not start with /', () => {
    const result = notificationCreateSchema.safeParse({
      userId: VALID_UUID,
      type: 'reminder',
      title: 'Reminder',
      message: 'Go study.',
      actionUrl: 'courses/123',
    });
    expect(result.success).toBe(false);
  });

  it('accepts actionUrl starting with /', () => {
    const result = notificationCreateSchema.safeParse({
      userId: VALID_UUID,
      type: 'achievement',
      title: 'Badge earned',
      message: 'You earned a badge!',
      actionUrl: '/achievements/new',
    });
    expect(result.success).toBe(true);
  });

  it('accepts notification without optional actionUrl', () => {
    const result = notificationCreateSchema.safeParse({
      userId: VALID_UUID,
      type: 'streak_warning',
      title: 'Streak at risk',
      message: 'Log a session to maintain your streak.',
    });
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// reminderCreateSchema
// ---------------------------------------------------------------------------

describe('reminderCreateSchema', () => {
  it('accepts valid reminder', () => {
    const result = reminderCreateSchema.safeParse({
      courseId: VALID_UUID,
      daysOfWeek: ['mon', 'wed', 'fri'],
      time: '09:00',
      channels: ['in_app', 'email'],
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty daysOfWeek array', () => {
    const result = reminderCreateSchema.safeParse({
      courseId: VALID_UUID,
      daysOfWeek: [],
      time: '09:00',
      channels: ['in_app'],
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid time format (single digit hour)', () => {
    const result = reminderCreateSchema.safeParse({
      courseId: VALID_UUID,
      daysOfWeek: ['mon'],
      time: '9:00',
      channels: ['in_app'],
    });
    expect(result.success).toBe(false);
  });

  it('accepts valid time "09:00"', () => {
    const result = reminderCreateSchema.safeParse({
      courseId: VALID_UUID,
      daysOfWeek: ['tue'],
      time: '09:00',
      channels: ['push'],
    });
    expect(result.success).toBe(true);
  });

  it('accepts valid time "23:59"', () => {
    const result = reminderCreateSchema.safeParse({
      courseId: VALID_UUID,
      daysOfWeek: ['sat'],
      time: '23:59',
      channels: ['slack'],
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid time "25:00"', () => {
    const result = reminderCreateSchema.safeParse({
      courseId: VALID_UUID,
      daysOfWeek: ['sun'],
      time: '25:00',
      channels: ['in_app'],
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty channels array', () => {
    const result = reminderCreateSchema.safeParse({
      courseId: VALID_UUID,
      daysOfWeek: ['mon'],
      time: '10:00',
      channels: [],
    });
    expect(result.success).toBe(false);
  });
});
