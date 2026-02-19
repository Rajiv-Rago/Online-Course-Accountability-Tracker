'use client';

import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { Course, CoursePriority, CoursePlatform } from '@/lib/types';
import type {
  CreateCourseInput,
  UpdateCourseInput,
} from '../lib/course-validation';
import { PlatformSelect } from './platform-select';
import { PrioritySelector } from './priority-selector';
import { useCourseMutations } from '../hooks/use-course-mutations';

interface FormValues {
  title: string;
  platform: CoursePlatform | null;
  url: string | null;
  total_modules: number | null;
  total_hours: number | null;
  target_completion_date: string | null;
  priority: CoursePriority;
  notes: string | null;
  completed_modules?: number;
  completed_hours?: number;
}

interface CourseFormProps {
  mode: 'create' | 'edit';
  course?: Course;
}

export function CourseForm({ mode, course }: CourseFormProps) {
  const router = useRouter();
  const mutations = useCourseMutations();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      title: course?.title ?? '',
      platform: (course?.platform as CoursePlatform) ?? null,
      url: course?.url ?? '',
      total_modules: course?.total_modules ?? null,
      total_hours: course?.total_hours ?? null,
      target_completion_date: course?.target_completion_date ?? null,
      priority: (course?.priority as CoursePriority) ?? 2,
      notes: course?.notes ?? '',
      ...(mode === 'edit' && course
        ? {
            completed_modules: course.completed_modules,
            completed_hours: course.completed_hours,
          }
        : {}),
    },
  });

  const priority = watch('priority') as CoursePriority;

  const onSubmit = (data: FormValues) => {
    if (mode === 'create') {
      mutations.createCourse.mutate(data as CreateCourseInput, {
        onSuccess: (result) => {
          if (!result.error && result.data) {
            router.push(`/courses/${result.data.id}`);
          }
        },
      });
    } else if (course) {
      mutations.updateCourse.mutate(
        { id: course.id, data: data as UpdateCourseInput },
        {
          onSuccess: (result) => {
            if (!result.error) {
              router.push(`/courses/${course.id}`);
            }
          },
        }
      );
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title">
          Course Title <span className="text-destructive">*</span>
        </Label>
        <Input
          id="title"
          {...register('title', { required: 'Title is required' })}
          placeholder="e.g., React - The Complete Guide 2026"
        />
        {errors.title && (
          <p className="text-sm text-destructive">{errors.title.message}</p>
        )}
      </div>

      {/* Platform */}
      <div className="space-y-2">
        <Label>Platform</Label>
        <PlatformSelect
          value={watch('platform') as CoursePlatform | null}
          onChange={(v) => setValue('platform', v)}
        />
      </div>

      {/* URL */}
      <div className="space-y-2">
        <Label htmlFor="url">Course URL</Label>
        <Input
          id="url"
          {...register('url')}
          placeholder="https://..."
          type="url"
        />
        {errors.url && (
          <p className="text-sm text-destructive">{errors.url.message}</p>
        )}
      </div>

      {/* Modules & Hours */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="total_modules">Total Modules</Label>
          <Input
            id="total_modules"
            type="number"
            min={1}
            {...register('total_modules')}
            placeholder="e.g., 29"
          />
          {errors.total_modules && (
            <p className="text-sm text-destructive">
              {errors.total_modules.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="total_hours">Estimated Total Hours</Label>
          <Input
            id="total_hours"
            type="number"
            min={0}
            step={0.5}
            {...register('total_hours')}
            placeholder="e.g., 28"
          />
          {errors.total_hours && (
            <p className="text-sm text-destructive">
              {errors.total_hours.message}
            </p>
          )}
        </div>
      </div>

      {/* Edit mode: completed fields */}
      {mode === 'edit' && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="completed_modules">Completed Modules</Label>
            <Input
              id="completed_modules"
              type="number"
              min={0}
              {...register('completed_modules')}
            />
            {errors.completed_modules && (
              <p className="text-sm text-destructive">
                {errors.completed_modules.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="completed_hours">Completed Hours</Label>
            <Input
              id="completed_hours"
              type="number"
              min={0}
              step={0.5}
              {...register('completed_hours')}
            />
            {errors.completed_hours && (
              <p className="text-sm text-destructive">
                {errors.completed_hours.message}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Target Date */}
      <div className="space-y-2">
        <Label htmlFor="target_completion_date">Target Completion Date</Label>
        <Input
          id="target_completion_date"
          type="date"
          {...register('target_completion_date')}
        />
        {errors.target_completion_date && (
          <p className="text-sm text-destructive">
            {errors.target_completion_date.message}
          </p>
        )}
      </div>

      {/* Priority */}
      <div className="space-y-2">
        <Label>Priority</Label>
        <PrioritySelector
          value={priority}
          onChange={(v) => setValue('priority', v)}
        />
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          {...register('notes')}
          placeholder="Optional notes about this course..."
          rows={4}
        />
        {errors.notes && (
          <p className="text-sm text-destructive">{errors.notes.message}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={mutations.isLoading}
        >
          {mutations.isLoading
            ? mode === 'create'
              ? 'Creating...'
              : 'Saving...'
            : mode === 'create'
            ? 'Create Course'
            : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
}
