'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  reminderCreateSchema,
  reminderUpdateSchema,
  type ReminderCreateInput,
  type ReminderUpdateInput,
} from '../lib/notification-validation';
import type { ReminderWithCourse } from '../actions/reminder-actions';

const DAYS = [
  { value: 'mon', label: 'Mon' },
  { value: 'tue', label: 'Tue' },
  { value: 'wed', label: 'Wed' },
  { value: 'thu', label: 'Thu' },
  { value: 'fri', label: 'Fri' },
  { value: 'sat', label: 'Sat' },
  { value: 'sun', label: 'Sun' },
] as const;

const CHANNELS = [
  { value: 'in_app', label: 'In-App' },
  { value: 'push', label: 'Push Notification' },
  { value: 'email', label: 'Email' },
  { value: 'slack', label: 'Slack' },
  { value: 'discord', label: 'Discord' },
] as const;

interface ReminderFormProps {
  mode: 'create' | 'edit';
  initialData?: ReminderWithCourse;
  courses: { id: string; title: string }[];
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ReminderCreateInput) => void;
  isPending?: boolean;
}

export function ReminderForm({
  mode,
  initialData,
  courses,
  isOpen,
  onClose,
  onSubmit,
  isPending,
}: ReminderFormProps) {
  const createResolver = zodResolver(reminderCreateSchema);
  const updateResolver = zodResolver(reminderUpdateSchema);
  const form = useForm<ReminderCreateInput>({
    resolver: (mode === 'edit' ? updateResolver : createResolver) as typeof createResolver,
    defaultValues: {
      courseId: initialData?.course_id ?? '',
      daysOfWeek: initialData?.days_of_week ?? ['mon', 'wed', 'fri'],
      time: initialData?.time?.substring(0, 5) ?? '19:00',
      channels: initialData?.channels ?? ['in_app'],
    },
  });

  const selectedDays = form.watch('daysOfWeek');
  const selectedChannels = form.watch('channels');

  const handleSubmit = form.handleSubmit((data) => {
    onSubmit(data);
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Create Study Reminder' : 'Edit Reminder'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Course */}
          <div className="space-y-2">
            <Label htmlFor="course">Course</Label>
            <Select
              value={form.watch('courseId')}
              onValueChange={(v) => form.setValue('courseId', v)}
            >
              <SelectTrigger id="course">
                <SelectValue placeholder="Select a course" />
              </SelectTrigger>
              <SelectContent>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.courseId && (
              <p className="text-xs text-destructive">
                {form.formState.errors.courseId.message}
              </p>
            )}
          </div>

          {/* Days of Week */}
          <div className="space-y-2">
            <Label>Days</Label>
            <div className="flex flex-wrap gap-2">
              {DAYS.map(({ value, label }) => {
                const checked = selectedDays?.includes(value) ?? false;
                return (
                  <label
                    key={value}
                    className="flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm cursor-pointer hover:bg-accent transition-colors data-[checked=true]:bg-primary/10 data-[checked=true]:border-primary"
                    data-checked={checked}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(isChecked) => {
                        const current = form.getValues('daysOfWeek') ?? [];
                        if (isChecked) {
                          form.setValue('daysOfWeek', [...current, value] as ReminderCreateInput['daysOfWeek']);
                        } else {
                          form.setValue(
                            'daysOfWeek',
                            current.filter((d) => d !== value) as ReminderCreateInput['daysOfWeek']
                          );
                        }
                      }}
                      className="h-3.5 w-3.5"
                    />
                    {label}
                  </label>
                );
              })}
            </div>
            {form.formState.errors.daysOfWeek && (
              <p className="text-xs text-destructive">
                {form.formState.errors.daysOfWeek.message}
              </p>
            )}
          </div>

          {/* Time */}
          <div className="space-y-2">
            <Label htmlFor="time">Time</Label>
            <Input
              id="time"
              type="time"
              {...form.register('time')}
              className="w-40"
            />
            {form.formState.errors.time && (
              <p className="text-xs text-destructive">
                {form.formState.errors.time.message}
              </p>
            )}
          </div>

          {/* Channels */}
          <div className="space-y-2">
            <Label>Delivery Channels</Label>
            <div className="space-y-2">
              {CHANNELS.map(({ value, label }) => {
                const checked = selectedChannels?.includes(value) ?? false;
                return (
                  <label
                    key={value}
                    className="flex items-center gap-2 text-sm cursor-pointer"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(isChecked) => {
                        const current = form.getValues('channels') ?? [];
                        if (isChecked) {
                          form.setValue('channels', [...current, value] as ReminderCreateInput['channels']);
                        } else {
                          form.setValue(
                            'channels',
                            current.filter((c) => c !== value) as ReminderCreateInput['channels']
                          );
                        }
                      }}
                    />
                    {label}
                  </label>
                );
              })}
            </div>
            {form.formState.errors.channels && (
              <p className="text-xs text-destructive">
                {form.formState.errors.channels.message}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving...' : mode === 'create' ? 'Create Reminder' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
