'use client';

import { useState } from 'react';
import { Plus, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useReminders } from '../hooks/use-reminders';
import { ReminderItem } from './reminder-item';
import { ReminderForm } from './reminder-form';
import type { ReminderWithCourse } from '../actions/reminder-actions';
import type { ReminderCreateInput } from '../lib/notification-validation';

export function ReminderList() {
  const {
    reminders,
    courses,
    isLoading,
    createReminder,
    updateReminder,
    toggleReminder,
    deleteReminder,
  } = useReminders();

  const [formOpen, setFormOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<ReminderWithCourse | null>(null);

  const handleCreate = (data: ReminderCreateInput) => {
    createReminder.mutate(data, {
      onSuccess: (result) => {
        if (!result.error) setFormOpen(false);
      },
    });
  };

  const handleEdit = (data: ReminderCreateInput) => {
    if (!editingReminder) return;
    updateReminder.mutate(
      { id: editingReminder.id, data },
      {
        onSuccess: (result) => {
          if (!result.error) setEditingReminder(null);
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-36" />
          <Skeleton className="h-9 w-32" />
        </div>
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Study Reminders</h2>
        <Button size="sm" onClick={() => setFormOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          Add Reminder
        </Button>
      </div>

      {reminders.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-10 text-center">
          <Clock className="mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium">No reminders configured</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Set up reminders to stay on track with your study goals.
          </p>
          <Button size="sm" className="mt-4" onClick={() => setFormOpen(true)}>
            Create Your First Reminder
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {reminders.map((reminder) => (
            <ReminderItem
              key={reminder.id}
              reminder={reminder}
              onToggle={(id, enabled) => toggleReminder.mutate({ id, enabled })}
              onEdit={(r) => setEditingReminder(r)}
              onDelete={(id) => deleteReminder.mutate(id)}
            />
          ))}
        </div>
      )}

      {/* Create form */}
      <ReminderForm
        mode="create"
        courses={courses}
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleCreate}
        isPending={createReminder.isPending}
      />

      {/* Edit form */}
      {editingReminder && (
        <ReminderForm
          mode="edit"
          initialData={editingReminder}
          courses={courses}
          isOpen={!!editingReminder}
          onClose={() => setEditingReminder(null)}
          onSubmit={handleEdit}
          isPending={updateReminder.isPending}
        />
      )}
    </div>
  );
}
