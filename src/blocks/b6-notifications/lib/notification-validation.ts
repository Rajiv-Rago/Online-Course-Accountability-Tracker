import { z } from 'zod';

// ─── Notification Types ───────────────────────────────────────────
export const notificationTypeEnum = z.enum([
  'reminder',
  'risk_alert',
  'achievement',
  'buddy_update',
  'weekly_report',
  'streak_warning',
]);

export const channelEnum = z.enum([
  'in_app',
  'email',
  'push',
  'slack',
  'discord',
]);

export const dayOfWeekEnum = z.enum([
  'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun',
]);

// ─── Notification Schemas ─────────────────────────────────────────
export const notificationCreateSchema = z.object({
  userId: z.string().uuid(),
  type: notificationTypeEnum,
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(2000),
  actionUrl: z.string().startsWith('/').optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const notificationFilterSchema = z.object({
  type: notificationTypeEnum.optional().nullable(),
  unreadOnly: z.boolean().optional().default(false),
  cursor: z.string().optional().nullable(),
  limit: z.number().int().min(1).max(50).optional().default(20),
});

// ─── Reminder Schemas ─────────────────────────────────────────────
export const reminderCreateSchema = z.object({
  courseId: z.string().uuid(),
  daysOfWeek: z.array(dayOfWeekEnum).min(1, 'Select at least one day'),
  time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:MM)'),
  timezone: z.string().optional(),
  channels: z.array(channelEnum).min(1, 'Select at least one channel'),
});

export const reminderUpdateSchema = z.object({
  courseId: z.string().uuid().optional(),
  daysOfWeek: z.array(dayOfWeekEnum).min(1).optional(),
  time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
  timezone: z.string().optional(),
  channels: z.array(channelEnum).min(1).optional(),
});

// ─── Inferred Types ───────────────────────────────────────────────
export type NotificationTypeValue = z.infer<typeof notificationTypeEnum>;
export type Channel = z.infer<typeof channelEnum>;
export type DayOfWeekValue = z.infer<typeof dayOfWeekEnum>;
export type NotificationCreateInput = z.infer<typeof notificationCreateSchema>;
export type NotificationFilterInput = z.infer<typeof notificationFilterSchema>;
export type ReminderCreateInput = z.infer<typeof reminderCreateSchema>;
export type ReminderUpdateInput = z.infer<typeof reminderUpdateSchema>;
