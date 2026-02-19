'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { CalendarIcon, Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { getCourses } from '@/blocks/b2-course-management/actions/course-actions';
import { useSessionMutations } from '../hooks/use-sessions';

export function SessionLogForm() {
  const router = useRouter();
  const mutations = useSessionMutations();

  const [courseId, setCourseId] = useState('');
  const [date, setDate] = useState<Date>(new Date());
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [modulesCompleted, setModulesCompleted] = useState(0);
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: courses, isLoading: coursesLoading } = useQuery({
    queryKey: ['courses-for-log'],
    queryFn: async () => {
      // Fetch in_progress courses, plus not_started ones (user might want to log for those too)
      const result = await getCourses();
      if (result.error) throw new Error(result.error);
      return (result.data ?? []).filter(
        (c) => c.status === 'in_progress' || c.status === 'not_started'
      );
    },
    staleTime: 60_000,
  });

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!courseId) errs.courseId = 'Please select a course';
    if (durationMinutes < 1) errs.duration = 'Minimum 1 minute';
    if (durationMinutes > 480) errs.duration = 'Maximum 8 hours (480 min)';
    if (date > new Date()) errs.date = 'Cannot log future sessions';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    mutations.createSession.mutate(
      {
        courseId,
        date: format(date, 'yyyy-MM-dd'),
        durationMinutes,
        modulesCompleted,
        notes: notes || undefined,
      },
      {
        onSuccess: (result) => {
          if (!result.error) {
            router.push('/progress');
          }
        },
      }
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-lg">
      {/* Course Select */}
      <div className="space-y-2">
        <Label>
          Course <span className="text-destructive">*</span>
        </Label>
        <Select value={courseId} onValueChange={setCourseId}>
          <SelectTrigger>
            <SelectValue
              placeholder={
                coursesLoading ? 'Loading...' : 'Select a course...'
              }
            />
          </SelectTrigger>
          <SelectContent>
            {(courses ?? []).map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.courseId && (
          <p className="text-sm text-destructive">{errors.courseId}</p>
        )}
      </div>

      {/* Date Picker */}
      <div className="space-y-2">
        <Label>
          Date <span className="text-destructive">*</span>
        </Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className={cn(
                'w-full justify-start text-left font-normal',
                !date && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date ? format(date, 'PPP') : 'Pick a date'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(d) => d && setDate(d)}
              disabled={(d) => d > new Date()}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        {errors.date && (
          <p className="text-sm text-destructive">{errors.date}</p>
        )}
      </div>

      {/* Duration with stepper */}
      <div className="space-y-2">
        <Label>
          Duration <span className="text-destructive">*</span>
        </Label>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={() =>
              setDurationMinutes(Math.max(1, durationMinutes - 5))
            }
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Input
            type="number"
            min={1}
            max={480}
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(Number(e.target.value) || 0)}
            className="text-center"
          />
          <span className="text-sm text-muted-foreground shrink-0">
            minutes
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={() =>
              setDurationMinutes(Math.min(480, durationMinutes + 5))
            }
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {errors.duration && (
          <p className="text-sm text-destructive">{errors.duration}</p>
        )}
      </div>

      {/* Modules Completed */}
      <div className="space-y-2">
        <Label>Modules Completed</Label>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={() =>
              setModulesCompleted(Math.max(0, modulesCompleted - 1))
            }
            disabled={modulesCompleted <= 0}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Input
            type="number"
            min={0}
            value={modulesCompleted}
            onChange={(e) => setModulesCompleted(Number(e.target.value) || 0)}
            className="text-center w-20"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={() => setModulesCompleted(modulesCompleted + 1)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="session-notes">Notes (optional)</Label>
        <Textarea
          id="session-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="What did you work on?"
          rows={3}
          maxLength={500}
        />
        <p className="text-xs text-muted-foreground text-right">
          {notes.length}/500 characters
        </p>
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
        <Button type="submit" disabled={mutations.isLoading}>
          {mutations.isLoading ? 'Logging...' : 'Log Session'}
        </Button>
      </div>
    </form>
  );
}
