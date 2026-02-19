import { z } from 'zod';

export const createSessionSchema = z.object({
  courseId: z.string().uuid('Invalid course ID'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  durationMinutes: z
    .number()
    .int()
    .min(1, 'Minimum 1 minute')
    .max(480, 'Maximum 8 hours'),
  modulesCompleted: z.number().int().min(0).default(0),
  notes: z.string().max(500, 'Notes too long').nullable().optional(),
});

export const updateSessionSchema = z.object({
  durationMinutes: z.number().int().min(1).max(480).optional(),
  modulesCompleted: z.number().int().min(0).optional(),
  notes: z.string().max(500).nullable().optional(),
});

export const fetchSessionsSchema = z.object({
  courseId: z.string().uuid().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  limit: z.number().int().min(1).max(50).default(10),
  cursor: z.string().uuid().optional(),
});

export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type UpdateSessionInput = z.infer<typeof updateSessionSchema>;
export type FetchSessionsInput = z.infer<typeof fetchSessionsSchema>;
