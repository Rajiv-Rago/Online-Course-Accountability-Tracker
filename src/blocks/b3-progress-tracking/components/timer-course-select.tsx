'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getCourses } from '@/blocks/b2-course-management/actions/course-actions';

interface TimerCourseSelectProps {
  selectedCourseId: string | null;
  onSelect: (courseId: string) => void;
  disabled: boolean;
}

export function TimerCourseSelect({
  selectedCourseId,
  onSelect,
  disabled,
}: TimerCourseSelectProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['courses-for-timer'],
    queryFn: async () => {
      const result = await getCourses();
      if (result.error) throw new Error(result.error);
      return (result.data ?? []).filter(
        (c) => c.status === 'in_progress' || c.status === 'not_started'
      );
    },
    staleTime: 60_000,
  });

  const courses = data ?? [];

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Course</label>
      <Select
        value={selectedCourseId ?? undefined}
        onValueChange={onSelect}
        disabled={disabled || isLoading}
      >
        <SelectTrigger className="w-full">
          <SelectValue
            placeholder={
              isLoading ? 'Loading courses...' : 'Select a course...'
            }
          />
        </SelectTrigger>
        <SelectContent>
          {courses.map((course) => (
            <SelectItem key={course.id} value={course.id}>
              {course.title}
            </SelectItem>
          ))}
          {courses.length === 0 && !isLoading && (
            <div className="px-2 py-4 text-sm text-muted-foreground text-center">
              No active courses found
            </div>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
