import { z } from 'zod';

export const platformEnum = z.enum([
  'udemy', 'coursera', 'youtube', 'skillshare', 'pluralsight', 'custom',
]);

export const courseStatusEnum = z.enum([
  'not_started', 'in_progress', 'paused', 'completed', 'abandoned',
]);

export const priorityEnum = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
]);

export const createCourseSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200).trim(),
  platform: platformEnum.nullable(),
  url: z.string().url('Must be a valid URL').or(z.literal('')).nullable().transform(v => v || null),
  total_modules: z.coerce.number().int().min(1, 'Must have at least 1 module').max(9999).nullable(),
  total_hours: z.coerce.number().min(0).max(9999).nullable().transform(v => v || null),
  target_completion_date: z.string().nullable().refine(
    (val) => {
      if (!val) return true;
      // Compare as YYYY-MM-DD strings to avoid UTC vs local timezone mismatch
      const today = new Date();
      const todayStr = [
        today.getFullYear(),
        String(today.getMonth() + 1).padStart(2, '0'),
        String(today.getDate()).padStart(2, '0'),
      ].join('-');
      return val >= todayStr;
    },
    { message: 'Target date must be in the future' }
  ),
  priority: priorityEnum.default(2),
  notes: z.string().max(5000).nullable().transform(v => v || null),
});

export const updateCourseSchema = createCourseSchema.partial().extend({
  completed_modules: z.coerce.number().int().min(0).optional(),
  completed_hours: z.coerce.number().min(0).optional(),
}).refine(
  (data) => {
    if (data.completed_modules !== undefined && data.total_modules !== undefined && data.total_modules !== null) {
      return data.completed_modules <= data.total_modules;
    }
    return true;
  },
  { message: 'Completed modules cannot exceed total modules', path: ['completed_modules'] }
).refine(
  (data) => {
    if (data.completed_hours !== undefined && data.total_hours !== undefined && data.total_hours !== null) {
      return data.completed_hours <= data.total_hours;
    }
    return true;
  },
  { message: 'Completed hours cannot exceed total hours', path: ['completed_hours'] }
);

export const statusTransitionSchema = z.object({
  courseId: z.string().uuid(),
  newStatus: courseStatusEnum,
  reason: z.string().max(500).optional(),
  overrideCompletion: z.boolean().default(false),
});

export const reorderSchema = z.object({
  orderedIds: z.array(z.string().uuid()).min(1),
});

export const bulkActionSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(50),
});

export type CreateCourseInput = z.infer<typeof createCourseSchema>;
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;
export type StatusTransitionInput = z.infer<typeof statusTransitionSchema>;
