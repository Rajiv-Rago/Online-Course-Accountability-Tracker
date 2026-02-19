# Block B6 -- Notifications

> **Block ID:** B6
> **Block Name:** `b6-notifications`
> **Owner:** Notification delivery and reminder scheduling
> **Last Updated:** 2026-02-19

---

## Table of Contents

1. [Overview](#overview)
2. [Table Dependencies](#table-dependencies)
3. [Routes](#routes)
4. [File Structure](#file-structure)
5. [Component Specifications](#component-specifications)
6. [Hooks](#hooks)
7. [Server Actions](#server-actions)
8. [Validation Schemas](#validation-schemas)
9. [Notification Sender](#notification-sender)
10. [Channel Adapters](#channel-adapters)
11. [Reminder Scheduler](#reminder-scheduler)
12. [Notification Types & Templates](#notification-types--templates)
13. [Channel Delivery Logic](#channel-delivery-logic)
14. [UI Mockups](#ui-mockups)
15. [Component Tree](#component-tree)
16. [Realtime Subscriptions](#realtime-subscriptions)
17. [State Management](#state-management)
18. [TypeScript Interfaces](#typescript-interfaces)
19. [Supabase Queries](#supabase-queries)
20. [Edge Cases & Error Handling](#edge-cases--error-handling)
21. [Accessibility](#accessibility)
22. [Performance Considerations](#performance-considerations)
23. [Testing Plan](#testing-plan)
24. [Do Not Touch Boundaries](#do-not-touch-boundaries)

---

## Overview

The Notifications block owns the `notifications` and `reminder_schedules` tables. It is responsible for:

1. **Displaying notifications** -- a full notification center page, a slide-out drawer, and a bell icon with unread count badge
2. **Managing reminders** -- CRUD operations for recurring study reminder schedules
3. **Delivering notifications** -- multi-channel delivery (in-app, email, push, Slack, Discord) based on user preferences
4. **Scheduling reminders** -- a cron-based system that evaluates reminder schedules every 15 minutes and creates + sends notifications when due

Other blocks (B4 AI Engine, B3 Progress, B8 Achievements) insert rows into the `notifications` table directly. B6 reads those rows and handles display + delivery. B6 does NOT decide when to create risk alerts or achievement notifications -- it only delivers them.

---

## Table Dependencies

| Relationship | Table | What B6 Does |
|---|---|---|
| **Owns** | `notifications` | Full CRUD: insert (from reminder triggers), select, update (`read` status), delete |
| **Owns** | `reminder_schedules` | Full CRUD: create, read, update (enable/disable, edit schedule), delete |
| **Reads** | `user_profiles` | `timezone` (for reminder time conversion), notification preferences (future: `notification_preferences` JSONB column or separate table), `daily_study_goal_minutes` (for reminder message templates) |
| **Reads** | `courses` | `title` (for reminder notification messages), `id` (to link reminders to courses) |
| **Reads** | `ai_analyses` | `risk_level`, `course_id` (for risk alert notification context -- only when constructing delivery messages) |

---

## Routes

| Route | Page Component | Auth Required | Description |
|---|---|---|---|
| `/notifications` | `NotificationCenter` | Yes | Full-page notification list with filters and pagination |

The `/notifications` route is defined in:
```
src/app/(authenticated)/notifications/page.tsx
```

This page file is a thin server component:
```tsx
import { NotificationCenter } from '@/blocks/b6-notifications/components/notification-center';

export default function Page() {
  return <NotificationCenter />;
}
```

**Note:** The notification bell and drawer are embedded in the app shell header but are defined in this block's components. The app layout imports `NotificationBell` from B6:
```tsx
import { NotificationBell } from '@/blocks/b6-notifications/components/notification-bell';
```

**Settings integration:** Notification preferences UI lives in B1's settings page. B6 only reads those preferences at delivery time. B6 does NOT render preference controls.

---

## File Structure

```
src/blocks/b6-notifications/
  components/
    notification-center.tsx       # Full-page notification list with filters, pagination, bulk actions
    notification-item.tsx         # Single notification row: icon, content, time, action buttons
    notification-bell.tsx         # Bell icon button with unread count badge (for app header)
    notification-drawer.tsx       # Slide-out drawer with recent notifications (opened from bell)
    notification-filters.tsx      # Filter controls: type dropdown, read/unread toggle
    reminder-list.tsx             # List of user's configured reminder schedules
    reminder-form.tsx             # Create/edit reminder form (course, days, time, channels)
    reminder-item.tsx             # Single reminder row with schedule info and enable/disable toggle
    empty-notifications.tsx       # Empty state for notification center
    notification-type-icon.tsx    # Maps notification type to appropriate icon + color
  hooks/
    use-notifications.ts          # Fetch notifications with filters, pagination, infinite scroll
    use-unread-count.ts           # Realtime unread count via Supabase Realtime subscription
    use-reminders.ts              # Fetch user's reminder schedules with CRUD mutations
  actions/
    notification-actions.ts       # Server actions: mark read, mark all read, delete, fetch
    reminder-actions.ts           # Server actions: create, update, delete, toggle reminders
  lib/
    notification-validation.ts    # Zod schemas for notifications and reminders
    notification-sender.ts        # Core delivery orchestrator: determines channels, dispatches
    reminder-scheduler.ts         # Cron logic: evaluate schedules, create + send due reminders
    channel-adapters/
      email-adapter.ts            # Send notification via Resend API (or Supabase email)
      push-adapter.ts             # Send Web Push notification via Web Push API
      slack-adapter.ts            # Send via Slack incoming webhook
      discord-adapter.ts          # Send via Discord incoming webhook
```

---

## Component Specifications

### `notification-center.tsx`

**Type:** Server Component (with client component children)

**Responsibilities:**
- Fetch initial notification list server-side
- Render filter controls, notification list, and bulk action bar
- Support infinite scroll pagination (20 items per page)
- "Mark All as Read" button in header

**Layout:**
- Page title "Notifications" with unread count
- Filter bar: type dropdown (All, Reminders, Risk Alerts, Achievements, Buddy Updates, Weekly Reports, Streak Warnings) + read/unread toggle
- Scrollable notification list
- Load more trigger at bottom (intersection observer)

---

### `notification-item.tsx`

**Type:** Client Component

**Responsibilities:**
- Render a single notification with appropriate icon, title, message, timestamp, and action buttons
- Visual distinction between read (muted) and unread (bold, left border accent)
- "Mark as Read" button (only for unread)
- "Delete" button (with confirmation)
- Clickable: navigates to `action_url` if present
- Shows delivery channels as small badges ("in-app", "email", etc.)

**Props:**
```typescript
interface NotificationItemProps {
  notification: {
    id: string;
    type: 'reminder' | 'risk_alert' | 'achievement' | 'buddy_update' | 'weekly_report' | 'streak_warning';
    title: string;
    message: string;
    read: boolean;
    actionUrl: string | null;
    channelsSent: string[];
    metadata: Record<string, unknown> | null;
    createdAt: string;
  };
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
}
```

**Visual States:**
- **Unread:** White/light background, bold title, 3px left border in accent color matching notification type, dot indicator
- **Read:** Slightly muted background, normal weight title, no border accent

---

### `notification-bell.tsx`

**Type:** Client Component

**Responsibilities:**
- Render a bell icon button suitable for embedding in the app header
- Show a red circular badge with unread count (if > 0)
- Badge shows count up to 9, then "9+" for higher counts
- On click, toggle the `NotificationDrawer`
- Unread count updates in realtime via Supabase Realtime subscription

**Props:**
```typescript
interface NotificationBellProps {
  initialUnreadCount: number;        // Server-rendered initial count
}
```

**Badge Rendering:**
```
count = 0    → No badge shown
count = 1-9  → Red badge with number
count >= 10  → Red badge with "9+"
```

---

### `notification-drawer.tsx`

**Type:** Client Component

**Responsibilities:**
- Slide-out panel from the right side of the screen
- Shows the 3 most recent notifications
- "See All" link at top navigates to `/notifications`
- "Mark All as Read" button at bottom
- Closes on outside click or Escape key
- Animated entrance/exit using CSS transitions or Framer Motion

**Props:**
```typescript
interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItemData[];
  onMarkAllAsRead: () => void;
}
```

---

### `notification-filters.tsx`

**Type:** Client Component

**Responsibilities:**
- Type filter dropdown using shadcn `Select`
- Read/unread toggle using shadcn `Switch` or `Checkbox`
- Filters update URL search params for shareable filter state
- Changing filters resets pagination to page 1

**Props:**
```typescript
interface NotificationFiltersProps {
  currentType: string | null;         // null = "All"
  showUnreadOnly: boolean;
  onTypeChange: (type: string | null) => void;
  onUnreadOnlyChange: (unreadOnly: boolean) => void;
  typeCounts: Record<string, number>; // Count per type for badges
}
```

**Type Options:**
| Value | Label | Icon |
|---|---|---|
| `null` | All | -- |
| `reminder` | Reminders | `Bell` |
| `risk_alert` | Risk Alerts | `AlertTriangle` |
| `achievement` | Achievements | `Trophy` |
| `buddy_update` | Buddy Updates | `Users` |
| `weekly_report` | Weekly Reports | `BarChart3` |
| `streak_warning` | Streak Warnings | `Flame` |

---

### `reminder-list.tsx`

**Type:** Client Component

**Responsibilities:**
- Display all user's reminder schedules
- "Add Reminder" button opens `ReminderForm` in create mode
- Each reminder rendered via `ReminderItem`
- Empty state if no reminders configured

**Props:**
```typescript
interface ReminderListProps {
  reminders: ReminderData[];
  courses: { id: string; title: string }[];  // For the form dropdown
}
```

---

### `reminder-form.tsx`

**Type:** Client Component

**Responsibilities:**
- Create or edit a reminder schedule
- Rendered in a shadcn `Dialog` or `Sheet`
- Form fields: course selector, days of week checkboxes, time picker, channel checkboxes
- Validation via Zod schema
- Submit calls `createReminder` or `updateReminder` server action

**Props:**
```typescript
interface ReminderFormProps {
  mode: 'create' | 'edit';
  initialData?: ReminderData;
  courses: { id: string; title: string }[];
  onSuccess: () => void;
  onCancel: () => void;
}
```

**Form Fields:**

| Field | Type | Validation |
|---|---|---|
| Course | Select dropdown | Required. Lists all non-abandoned courses. |
| Days of Week | Checkbox group | At least 1 day required. Options: Mon, Tue, Wed, Thu, Fri, Sat, Sun. |
| Time | Time input | Required. HH:MM format in 24h. |
| Channels | Checkbox group | At least 1 channel required. Options: In-App, Push, Email, Slack, Discord. |

**Channel availability:** Slack and Discord checkboxes are disabled with "(Configure in Settings)" hint if the user has not set up webhook URLs. Push is disabled with "(Enable in Settings)" if push subscription is not registered.

---

### `reminder-item.tsx`

**Type:** Client Component

**Responsibilities:**
- Display a single reminder schedule
- Show course name, days, time, and active channels
- Enable/disable toggle (calls `toggleReminder` server action)
- Edit button opens `ReminderForm` in edit mode
- Delete button with confirmation

**Props:**
```typescript
interface ReminderItemProps {
  reminder: ReminderData;
  onToggle: (id: string, enabled: boolean) => void;
  onEdit: (reminder: ReminderData) => void;
  onDelete: (id: string) => void;
}
```

**Visual:**
```
[Toggle] React Course                    [Edit] [Delete]
         Mon, Wed, Fri at 7:00 PM
         via: In-App, Push
```

---

### `empty-notifications.tsx`

**Type:** Client Component

**Props:**
```typescript
interface EmptyNotificationsProps {
  hasFiltersApplied: boolean;
}
```

**Copy:**
- No filters: "You're all caught up! No notifications yet."
- With filters: "No notifications match your current filters."

---

### `notification-type-icon.tsx`

**Type:** Client Component

**Purpose:** Maps a notification type string to a Lucide icon and color.

**Mapping:**

| Type | Icon | Color |
|---|---|---|
| `reminder` | `Bell` | Blue (`text-blue-500`) |
| `risk_alert` | `AlertTriangle` | Red (`text-red-500`) |
| `achievement` | `Trophy` | Yellow (`text-yellow-500`) |
| `buddy_update` | `Users` | Green (`text-green-500`) |
| `weekly_report` | `BarChart3` | Purple (`text-purple-500`) |
| `streak_warning` | `Flame` | Orange (`text-orange-500`) |

---

## Hooks

### `use-notifications.ts`

**Purpose:** React Query hook for fetching notifications with filtering, sorting, and infinite scroll pagination.

**Parameters:**
```typescript
interface UseNotificationsOptions {
  type?: string | null;              // Filter by notification type
  unreadOnly?: boolean;              // Filter to unread only
  pageSize?: number;                 // Items per page (default: 20)
}
```

**Return:**
```typescript
interface UseNotificationsReturn {
  notifications: NotificationItemData[];
  isLoading: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  totalCount: number;
  refetch: () => void;
}
```

**Query Key:** `['notifications', userId, type, unreadOnly]`

**Implementation:** Uses React Query's `useInfiniteQuery` with cursor-based pagination. The cursor is the `created_at` timestamp of the last item on the current page.

---

### `use-unread-count.ts`

**Purpose:** Realtime unread notification count using Supabase Realtime.

**Behavior:**
1. Initial count fetched via server action
2. Subscribe to Supabase Realtime channel on `notifications` table
3. On `INSERT` event where `read = false`: increment count
4. On `UPDATE` event where `read` changed to `true`: decrement count
5. On `DELETE` event where `read = false`: decrement count
6. Count never goes below 0

**Return:**
```typescript
interface UseUnreadCountReturn {
  unreadCount: number;
  isConnected: boolean;              // Realtime connection status
}
```

**Query Key:** `['notifications', 'unread-count', userId]`

---

### `use-reminders.ts`

**Purpose:** React Query hook with mutations for reminder CRUD operations.

**Return:**
```typescript
interface UseRemindersReturn {
  reminders: ReminderData[];
  isLoading: boolean;
  createReminder: UseMutationResult<...>;
  updateReminder: UseMutationResult<...>;
  deleteReminder: UseMutationResult<...>;
  toggleReminder: UseMutationResult<...>;
}
```

**Query Key:** `['reminders', userId]`

**Optimistic Updates:**
- `toggleReminder`: Immediately flip the `enabled` flag in the cache, revert on error
- `deleteReminder`: Immediately remove from cache, revert on error
- `createReminder`: Add to cache on success (no optimistic insert since we need the server-generated ID)

---

## Server Actions

### `notification-actions.ts`

All actions use `'use server'` directive and authenticate via Supabase server client.

#### `getNotifications(options)`

**Purpose:** Fetch paginated, filtered notifications.

**Parameters:**
```typescript
interface GetNotificationsOptions {
  type?: string | null;
  unreadOnly?: boolean;
  cursor?: string | null;            // ISO timestamp for cursor-based pagination
  limit?: number;                    // Default: 20
}
```

**Implementation:**
```typescript
'use server';

export async function getNotifications(options: GetNotificationsOptions) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  let query = supabase
    .from('notifications')
    .select('id, type, title, message, read, action_url, channels_sent, metadata, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(options.limit ?? 20);

  if (options.type) {
    query = query.eq('type', options.type);
  }

  if (options.unreadOnly) {
    query = query.eq('read', false);
  }

  if (options.cursor) {
    query = query.lt('created_at', options.cursor);
  }

  const { data, error } = await query;
  if (error) throw error;

  return {
    notifications: data ?? [],
    nextCursor: data && data.length === (options.limit ?? 20)
      ? data[data.length - 1].created_at
      : null,
  };
}
```

#### `getUnreadCount()`

**Purpose:** Get the count of unread notifications.

```typescript
'use server';

export async function getUnreadCount() {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('read', false);

  if (error) throw error;
  return count ?? 0;
}
```

#### `markAsRead(notificationId: string)`

**Purpose:** Mark a single notification as read.

```typescript
'use server';

export async function markAsRead(notificationId: string) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId)
    .eq('user_id', user.id);  // RLS + explicit check

  if (error) throw error;
  return { success: true };
}
```

#### `markAllAsRead()`

**Purpose:** Mark all unread notifications as read for the current user.

```typescript
'use server';

export async function markAllAsRead() {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', user.id)
    .eq('read', false);

  if (error) throw error;
  return { success: true };
}
```

#### `deleteNotification(notificationId: string)`

**Purpose:** Delete a single notification.

```typescript
'use server';

export async function deleteNotification(notificationId: string) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId)
    .eq('user_id', user.id);

  if (error) throw error;
  return { success: true };
}
```

#### `createNotificationForDelivery(payload)`

**Purpose:** Create a notification record and trigger multi-channel delivery. This is called by the reminder scheduler and can be called by other blocks' server-side code.

```typescript
'use server';

export async function createNotificationForDelivery(payload: {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}) {
  const supabase = createServerClient();

  // 1. Insert the notification row (in-app delivery is implicit)
  const { data: notification, error } = await supabase
    .from('notifications')
    .insert({
      user_id: payload.userId,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      action_url: payload.actionUrl ?? null,
      metadata: payload.metadata ?? null,
      channels_sent: ['in_app'],
    })
    .select()
    .single();

  if (error) throw error;

  // 2. Trigger multi-channel delivery asynchronously
  // (does not block the notification insert)
  await sendToChannels(notification);

  return notification;
}
```

---

### `reminder-actions.ts`

#### `getReminders()`

**Purpose:** Fetch all reminder schedules for the current user.

```typescript
'use server';

export async function getReminders() {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const { data, error } = await supabase
    .from('reminder_schedules')
    .select(`
      id, course_id, days_of_week, time, timezone, enabled, channels,
      created_at, updated_at,
      courses!inner(title)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}
```

#### `createReminder(input)`

**Purpose:** Create a new reminder schedule.

**Parameters:** Validated via `reminderCreateSchema` (see Validation Schemas).

```typescript
'use server';

export async function createReminder(input: ReminderCreateInput) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  // Validate input
  const validated = reminderCreateSchema.parse(input);

  // Get user's timezone if not provided
  const timezone = validated.timezone ?? (await getUserTimezone(user.id, supabase));

  const { data, error } = await supabase
    .from('reminder_schedules')
    .insert({
      user_id: user.id,
      course_id: validated.courseId,
      days_of_week: validated.daysOfWeek,
      time: validated.time,
      timezone,
      enabled: true,
      channels: validated.channels,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}
```

#### `updateReminder(id, input)`

**Purpose:** Update an existing reminder schedule.

```typescript
'use server';

export async function updateReminder(id: string, input: ReminderUpdateInput) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const validated = reminderUpdateSchema.parse(input);

  const { data, error } = await supabase
    .from('reminder_schedules')
    .update({
      course_id: validated.courseId,
      days_of_week: validated.daysOfWeek,
      time: validated.time,
      timezone: validated.timezone,
      channels: validated.channels,
    })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) throw error;
  return data;
}
```

#### `toggleReminder(id, enabled)`

**Purpose:** Enable or disable a reminder.

```typescript
'use server';

export async function toggleReminder(id: string, enabled: boolean) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const { error } = await supabase
    .from('reminder_schedules')
    .update({ enabled })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) throw error;
  return { success: true };
}
```

#### `deleteReminder(id)`

**Purpose:** Delete a reminder schedule.

```typescript
'use server';

export async function deleteReminder(id: string) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const { error } = await supabase
    .from('reminder_schedules')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) throw error;
  return { success: true };
}
```

---

## Validation Schemas

### `notification-validation.ts`

```typescript
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
  actionUrl: z.string().url().optional().or(z.string().startsWith('/')),
  metadata: z.record(z.unknown()).optional(),
});

export const notificationFilterSchema = z.object({
  type: notificationTypeEnum.optional().nullable(),
  unreadOnly: z.boolean().optional().default(false),
  cursor: z.string().datetime().optional().nullable(),
  limit: z.number().int().min(1).max(50).optional().default(20),
});

// ─── Reminder Schemas ─────────────────────────────────────────────
export const reminderCreateSchema = z.object({
  courseId: z.string().uuid(),
  daysOfWeek: z.array(dayOfWeekEnum).min(1, 'Select at least one day'),
  time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:MM)'),
  timezone: z.string().optional(),   // Falls back to user_profiles.timezone
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
export type NotificationType = z.infer<typeof notificationTypeEnum>;
export type Channel = z.infer<typeof channelEnum>;
export type DayOfWeek = z.infer<typeof dayOfWeekEnum>;
export type NotificationCreateInput = z.infer<typeof notificationCreateSchema>;
export type NotificationFilterInput = z.infer<typeof notificationFilterSchema>;
export type ReminderCreateInput = z.infer<typeof reminderCreateSchema>;
export type ReminderUpdateInput = z.infer<typeof reminderUpdateSchema>;
```

---

## Notification Sender

### `notification-sender.ts`

The core delivery orchestrator. When a notification is created (either by B6's reminder scheduler or by another block inserting into the `notifications` table), this module determines which channels to use and dispatches delivery.

**Algorithm:**

```
sendToChannels(notification):
  1. Fetch user's notification preferences from user_profiles
     - Which notification types are enabled for which channels
     - Quiet hours start/end times
     - Configured webhook URLs (Slack, Discord)
     - Push subscription status

  2. Determine applicable channels:
     a. in_app: ALWAYS enabled (already inserted into notifications table)
     b. For each external channel (email, push, slack, discord):
        - Check if channel is enabled for this notification type
        - Check if channel is configured (e.g., webhook URL exists)
        - Check quiet hours:
          * Convert current time to user's timezone
          * If within quiet hours, SKIP external channels
          * Exception: risk_alert with critical level bypasses quiet hours

  3. For each applicable channel:
     - Call the appropriate channel adapter
     - On success: append channel to notification.channels_sent
     - On failure: log error, do NOT retry (fire-and-forget for MVP)
     - Update the notification record with final channels_sent array

  4. Return summary: { channelsSent: string[], errors: string[] }
```

**Quiet Hours Logic:**
```typescript
function isInQuietHours(
  userTimezone: string,
  quietStart: string,    // "22:00"
  quietEnd: string,      // "08:00"
): boolean {
  const now = getCurrentTimeInTimezone(userTimezone);
  // Handle overnight quiet hours (e.g., 22:00 - 08:00)
  if (quietStart > quietEnd) {
    return now >= quietStart || now < quietEnd;
  }
  return now >= quietStart && now < quietEnd;
}
```

**Default notification preferences (if user has not customized):**

| Notification Type | In-App | Email | Push | Slack | Discord |
|---|---|---|---|---|---|
| `reminder` | Yes | No | Yes | No | No |
| `risk_alert` | Yes | Yes | Yes | No | No |
| `achievement` | Yes | No | No | No | No |
| `buddy_update` | Yes | No | No | No | No |
| `weekly_report` | Yes | Yes | No | No | No |
| `streak_warning` | Yes | No | Yes | No | No |

---

## Channel Adapters

### `email-adapter.ts`

**Purpose:** Send notification as an email using Resend API.

**Implementation:**
```typescript
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail(params: {
  to: string;
  subject: string;
  body: string;
  notificationType: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const { data, error } = await resend.emails.send({
      from: 'Study Tracker <notifications@yourdomain.com>',
      to: params.to,
      subject: params.subject,
      html: buildEmailHtml(params.body, params.notificationType),
    });

    if (error) return { success: false, error: error.message };
    return { success: true, messageId: data?.id };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}
```

**Email Template:** Simple, branded HTML email with:
- Header with app logo
- Notification type badge
- Title + message body
- CTA button (if action_url exists)
- Unsubscribe link in footer

---

### `push-adapter.ts`

**Purpose:** Send Web Push notification via the Web Push protocol.

**Implementation:**
```typescript
import webpush from 'web-push';

webpush.setVapidDetails(
  'mailto:support@yourdomain.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

export async function sendPush(params: {
  subscription: PushSubscription;   // Stored per-user in user_profiles or separate table
  title: string;
  body: string;
  actionUrl?: string;
  icon?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await webpush.sendNotification(
      params.subscription,
      JSON.stringify({
        title: params.title,
        body: params.body,
        url: params.actionUrl,
        icon: params.icon ?? '/icons/notification-icon.png',
        badge: '/icons/badge-icon.png',
      }),
    );
    return { success: true };
  } catch (err: any) {
    if (err.statusCode === 410) {
      // Subscription expired, should be cleaned up
      return { success: false, error: 'subscription_expired' };
    }
    return { success: false, error: String(err) };
  }
}
```

**Service Worker:** A service worker at `public/sw.js` handles push event display and notification click (navigates to `actionUrl`). This is registered in the app shell.

---

### `slack-adapter.ts`

**Purpose:** Send notification via Slack incoming webhook.

**Implementation:**
```typescript
export async function sendSlack(params: {
  webhookUrl: string;                // User's configured Slack webhook URL
  title: string;
  message: string;
  notificationType: string;
  actionUrl?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(params.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        blocks: [
          {
            type: 'header',
            text: { type: 'plain_text', text: params.title },
          },
          {
            type: 'section',
            text: { type: 'mrkdwn', text: params.message },
          },
          ...(params.actionUrl ? [{
            type: 'actions',
            elements: [{
              type: 'button',
              text: { type: 'plain_text', text: 'View in App' },
              url: `${process.env.NEXT_PUBLIC_APP_URL}${params.actionUrl}`,
            }],
          }] : []),
        ],
      }),
    });

    if (!response.ok) {
      return { success: false, error: `Slack webhook returned ${response.status}` };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}
```

---

### `discord-adapter.ts`

**Purpose:** Send notification via Discord incoming webhook.

**Implementation:**
```typescript
export async function sendDiscord(params: {
  webhookUrl: string;                // User's configured Discord webhook URL
  title: string;
  message: string;
  notificationType: string;
  actionUrl?: string;
}): Promise<{ success: boolean; error?: string }> {
  const typeEmoji: Record<string, string> = {
    reminder: '🔔',
    risk_alert: '⚠️',
    achievement: '🏆',
    buddy_update: '👥',
    weekly_report: '📊',
    streak_warning: '🔥',
  };

  try {
    const response = await fetch(params.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [{
          title: `${typeEmoji[params.notificationType] ?? ''} ${params.title}`,
          description: params.message,
          color: getDiscordColor(params.notificationType),
          url: params.actionUrl
            ? `${process.env.NEXT_PUBLIC_APP_URL}${params.actionUrl}`
            : undefined,
          timestamp: new Date().toISOString(),
          footer: { text: 'Course Accountability Tracker' },
        }],
      }),
    });

    if (!response.ok) {
      return { success: false, error: `Discord webhook returned ${response.status}` };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

function getDiscordColor(type: string): number {
  const colors: Record<string, number> = {
    reminder: 0x3B82F6,      // Blue
    risk_alert: 0xEF4444,    // Red
    achievement: 0xEAB308,   // Yellow
    buddy_update: 0x22C55E,  // Green
    weekly_report: 0xA855F7, // Purple
    streak_warning: 0xF97316, // Orange
  };
  return colors[type] ?? 0x6B7280; // Gray fallback
}
```

---

## Reminder Scheduler

### `reminder-scheduler.ts`

**Purpose:** Evaluate all enabled reminder schedules and create + send notifications for those that are due. Designed to be called by a cron job every 15 minutes.

**Invocation:** Via a Next.js API route at `src/app/api/cron/reminders/route.ts` protected by a cron secret:

```typescript
// src/app/api/cron/reminders/route.ts
import { processReminders } from '@/blocks/b6-notifications/lib/reminder-scheduler';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const result = await processReminders();
  return Response.json(result);
}
```

**Cron Configuration (Vercel):** In `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/cron/reminders",
    "schedule": "*/15 * * * *"
  }]
}
```

**Algorithm:**

```
processReminders():
  1. Get current UTC time
  2. Calculate the 15-minute window: [now - 7.5min, now + 7.5min]
     (This ensures we don't miss schedules that fall between cron runs)

  3. Fetch ALL enabled reminder_schedules with their user's timezone:
     SELECT rs.*, up.timezone, up.email, c.title as course_title
     FROM reminder_schedules rs
     JOIN user_profiles up ON up.id = rs.user_id
     LEFT JOIN courses c ON c.id = rs.course_id
     WHERE rs.enabled = true

  4. For each schedule:
     a. Convert schedule time to UTC:
        - schedule_utc = convertToUTC(rs.time, rs.timezone || up.timezone)

     b. Check if schedule_utc falls within the 15-minute window:
        - If not: skip

     c. Check if today's day_of_week (in user's timezone) is in rs.days_of_week:
        - If not: skip

     d. Check for duplicate prevention:
        - Query: SELECT id FROM notifications
                 WHERE user_id = rs.user_id
                   AND type = 'reminder'
                   AND metadata->>'reminder_schedule_id' = rs.id
                   AND created_at >= today_start_utc
                   AND created_at < tomorrow_start_utc
        - If found: skip (already sent today)

     e. Create notification:
        - type: 'reminder'
        - title: "Time to study {course_title}!"
        - message: "Your scheduled study time for {course_title} is starting now. Your daily goal is {daily_goal} minutes."
        - action_url: "/progress/timer?course={course_id}"
        - metadata: { reminder_schedule_id: rs.id, course_id: rs.course_id }

     f. Send via configured channels (rs.channels)
        - Call sendToChannels() from notification-sender.ts

  5. Return: { processed: number, sent: number, skipped: number, errors: string[] }
```

**Timezone Conversion:**
```typescript
function convertToUTC(localTime: string, timezone: string): string {
  // localTime is "HH:MM" format
  // Returns UTC "HH:MM" for today in the given timezone
  // Uses date-fns-tz or Intl.DateTimeFormat for conversion

  const [hours, minutes] = localTime.split(':').map(Number);
  const now = new Date();
  const localDate = new Date(
    now.toLocaleDateString('en-US', { timeZone: timezone })
  );
  localDate.setHours(hours, minutes, 0, 0);

  // Convert to UTC
  const utcDate = zonedTimeToUtc(localDate, timezone);
  return `${String(utcDate.getUTCHours()).padStart(2, '0')}:${String(utcDate.getUTCMinutes()).padStart(2, '0')}`;
}
```

**Window Matching:**
```typescript
function isWithinWindow(
  scheduleTimeUTC: string,     // "HH:MM"
  windowCenterUTC: Date,       // Current time
  windowSizeMinutes: number,   // 15
): boolean {
  const [h, m] = scheduleTimeUTC.split(':').map(Number);
  const scheduleDate = new Date(windowCenterUTC);
  scheduleDate.setUTCHours(h, m, 0, 0);

  const diffMs = Math.abs(windowCenterUTC.getTime() - scheduleDate.getTime());
  const diffMinutes = diffMs / (1000 * 60);

  return diffMinutes <= windowSizeMinutes / 2;
}
```

---

## Notification Types & Templates

Each notification type has a predefined template for its `title` and `message` fields. The templates use placeholder variables that are resolved at creation time.

| Type | Title Template | Message Template |
|---|---|---|
| `reminder` | `"Time to study {course_title}!"` | `"Your scheduled study time for {course_title} is starting now. Your daily goal is {daily_goal} minutes."` |
| `risk_alert` | `"{course_title} risk is now {risk_level}"` | `"{intervention_message}"` (from `ai_analyses.interventions`) |
| `achievement` | `"Achievement Unlocked: {achievement_name}!"` | `"{achievement_description}"` (from `achievements.metadata`) |
| `buddy_update` | `"Your buddy {buddy_name} just studied!"` | `"{buddy_name} completed a {duration}-minute session on {course_title}."` |
| `weekly_report` | `"Your weekly report is ready"` | `"You studied {total_hours}h across {total_sessions} sessions this week. Tap to see your full report."` |
| `streak_warning` | `"Your {streak_count}-day streak is at risk!"` | `"You haven't studied today and your {streak_count}-day streak is at risk. You have {freezes_remaining} streak freezes remaining."` |

**Template Resolution:**
```typescript
function resolveTemplate(
  template: string,
  variables: Record<string, string | number>,
): string {
  return template.replace(
    /\{(\w+)\}/g,
    (_, key) => String(variables[key] ?? `{${key}}`),
  );
}
```

---

## Channel Delivery Logic

Detailed flow for delivering a single notification across all channels:

```
┌─────────────────────────────────────────────────┐
│ Notification Created (by any block or scheduler) │
└─────────────┬───────────────────────────────────┘
              │
              v
┌─────────────────────────────────────┐
│ 1. Insert into notifications table   │
│    (in_app delivery is automatic)    │
│    channels_sent = ["in_app"]        │
└─────────────┬───────────────────────┘
              │
              v
┌─────────────────────────────────────┐
│ 2. Fetch user notification prefs     │
│    - Enabled channels per type       │
│    - Quiet hours (start, end)        │
│    - Webhook URLs (Slack, Discord)   │
│    - Push subscription object        │
└─────────────┬───────────────────────┘
              │
              v
┌─────────────────────────────────────┐
│ 3. Is it quiet hours?               │
│    YES + type != critical risk_alert │
│    → Skip external channels          │
│    NO or critical risk_alert         │
│    → Continue to step 4              │
└─────────────┬───────────────────────┘
              │
              v
┌─────────────────────────────────────┐
│ 4. For each enabled channel:         │
│                                      │
│    ┌─ email ──────────────────────┐  │
│    │ Call email-adapter.ts        │  │
│    │ Requires: user email         │  │
│    └──────────────────────────────┘  │
│                                      │
│    ┌─ push ───────────────────────┐  │
│    │ Call push-adapter.ts         │  │
│    │ Requires: push subscription  │  │
│    │ Handle 410 (expired sub)     │  │
│    └──────────────────────────────┘  │
│                                      │
│    ┌─ slack ──────────────────────┐  │
│    │ Call slack-adapter.ts        │  │
│    │ Requires: webhook URL        │  │
│    └──────────────────────────────┘  │
│                                      │
│    ┌─ discord ────────────────────┐  │
│    │ Call discord-adapter.ts      │  │
│    │ Requires: webhook URL        │  │
│    └──────────────────────────────┘  │
│                                      │
└─────────────┬───────────────────────┘
              │
              v
┌─────────────────────────────────────┐
│ 5. Update notification record:       │
│    channels_sent = [...successful]   │
└─────────────────────────────────────┘
```

---

## UI Mockups

### Notification Bell (in app header)

```
┌───┐
│ 🔔│  ← Red circular badge with "3" (unread count)
└───┘
```

When clicked, opens NotificationDrawer.

### Notification Drawer (slide from right)

```
┌──────────────────────────────────┐
│ Notifications           [See All] │
├──────────────────────────────────┤
│ 🔔 Time to study React!          │
│    Your scheduled study time for  │
│    React Course is starting now.  │
│    2 minutes ago                  │
├──────────────────────────────────┤
│ ⚠️ Python ML risk is HIGH        │
│    Risk increased to HIGH.        │
│    Consider shorter daily...      │
│    1 hour ago                     │
├──────────────────────────────────┤
│ 🏆 Earned 7-Day Streak!          │
│    Congratulations! You maintained│
│    a 7-day study streak.          │
│    5 hours ago                    │
├──────────────────────────────────┤
│      [Mark All as Read]           │
└──────────────────────────────────┘
```

### Notification Center (full page `/notifications`)

```
┌─────────────────────────────────────────────────────┐
│ Notifications (3 unread)               [Mark All Read] │
│                                                        │
│ Filter: [All Types      v]  [x] Unread Only           │
├─────────────────────────────────────────────────────┤
│                                                        │
│ ○ 🔔 Time to study React Course!                      │
│   Your scheduled study time for React - The Complete   │
│   Guide is starting now. Your daily goal is 60 min.   │
│   2 min ago  *  via: in-app, push    [Mark Read] [x]  │
│                                                        │
├─────────────────────────────────────────────────────┤
│                                                        │
│ ○ ⚠️ Risk Alert: Python ML                            │
│   Risk increased to HIGH. Consider shorter daily       │
│   sessions to maintain consistency.                    │
│   1h ago  *  via: in-app, email, slack  [Mark Read] [x]│
│                                                        │
├─────────────────────────────────────────────────────┤
│                                                        │
│ ○ 🔥 Your 5-day streak is at risk!                    │
│   You haven't studied today. You have 2 streak         │
│   freezes remaining.                                   │
│   3h ago  *  via: in-app, push       [Mark Read] [x]  │
│                                                        │
├─────────────────────────────────────────────────────┤
│                                                        │
│ ● 🏆 Achievement Unlocked: First Session!             │
│   Congratulations! You completed your very first       │
│   study session.                                       │
│   2d ago  *  via: in-app                               │
│                                                        │
├─────────────────────────────────────────────────────┤
│                                                        │
│ ● 📊 Your weekly report is ready                      │
│   You studied 285 minutes across 6 sessions last week. │
│   3d ago  *  via: in-app, email                        │
│                                                        │
├─────────────────────────────────────────────────────┤
│                                                        │
│          (○ = unread, ● = read)                        │
│                                                        │
│           [Load More Notifications]                    │
└─────────────────────────────────────────────────────┘
```

### Reminder Schedule Form (in dialog)

```
┌─────────────────────────────────────────────────────┐
│ Create Study Reminder                          [x]   │
├─────────────────────────────────────────────────────┤
│                                                      │
│ Course *                                             │
│ ┌──────────────────────────────────────────────┐    │
│ │ React - The Complete Guide 2026           v  │    │
│ └──────────────────────────────────────────────┘    │
│                                                      │
│ Days *                                               │
│ [x] Mon  [x] Tue  [x] Wed  [x] Thu  [x] Fri       │
│ [ ] Sat  [ ] Sun                                     │
│                                                      │
│ Time *                                               │
│ ┌──────────────┐                                    │
│ │ 19:00        │  (in your timezone: America/NYC)   │
│ └──────────────┘                                    │
│                                                      │
│ Delivery Channels *                                  │
│ [x] In-App                                           │
│ [x] Push Notification                                │
│ [ ] Email                                            │
│ [ ] Slack  (Configure in Settings)                   │
│ [ ] Discord  (Configure in Settings)                 │
│                                                      │
│                                                      │
│             [Cancel]     [Save Reminder]             │
└─────────────────────────────────────────────────────┘
```

### Reminder List

```
┌─────────────────────────────────────────────────────┐
│ Study Reminders                     [+ Add Reminder] │
├─────────────────────────────────────────────────────┤
│                                                      │
│ [ON]  React - The Complete Guide          [Edit] [x] │
│       Mon, Tue, Wed, Thu, Fri at 7:00 PM            │
│       via: In-App, Push                              │
│                                                      │
├─────────────────────────────────────────────────────┤
│                                                      │
│ [OFF] AWS Solutions Architect             [Edit] [x] │
│       Sat, Sun at 10:00 AM                          │
│       via: In-App, Email                             │
│                                                      │
└─────────────────────────────────────────────────────┘
```

---

## Component Tree

```
NotificationCenterPage (server component -- fetches initial data)
├── PageHeader
│   ├── Title ("Notifications") + UnreadCount badge
│   └── MarkAllAsReadButton
├── NotificationFilters
│   ├── TypeSelect (shadcn Select)
│   └── UnreadOnlyToggle (shadcn Switch)
├── NotificationList (infinite scroll container)
│   └── NotificationItem (xN)
│       ├── NotificationTypeIcon
│       ├── ContentBlock
│       │   ├── Title (bold if unread)
│       │   ├── Message (truncated to 2 lines)
│       │   └── MetaRow (relative time + channel badges)
│       └── ActionButtons
│           ├── MarkAsReadButton (if unread)
│           └── DeleteButton
├── LoadMoreTrigger (intersection observer)
└── EmptyNotifications (if no notifications match filters)

NotificationBell (embedded in app shell header)
├── BellIconButton
│   └── UnreadBadge (red circle with count)
└── NotificationDrawer (conditionally rendered)
    ├── DrawerHeader ("Notifications" + "See All" link)
    ├── NotificationItem (x3 most recent)
    └── DrawerFooter ("Mark All as Read" button)

ReminderList (embedded in notification center or standalone section)
├── SectionHeader ("Study Reminders" + "Add Reminder" button)
├── ReminderItem (xN)
│   ├── EnableToggle (shadcn Switch)
│   ├── CourseTitle
│   ├── ScheduleDescription (days + time)
│   ├── ChannelBadges
│   ├── EditButton → opens ReminderForm dialog
│   └── DeleteButton (with confirmation dialog)
└── ReminderForm (shadcn Dialog)
    ├── CourseSelect
    ├── DaysOfWeekCheckboxGroup
    ├── TimeInput
    ├── ChannelCheckboxGroup
    └── FormActions (Cancel + Save)
```

---

## Realtime Subscriptions

### Notification Inserts

```typescript
// In use-unread-count.ts
const channel = supabase
  .channel('notifications-realtime')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'notifications',
      filter: `user_id=eq.${userId}`,
    },
    (payload) => {
      // Increment unread count
      queryClient.setQueryData(
        ['notifications', 'unread-count', userId],
        (prev: number) => (prev ?? 0) + 1,
      );

      // Optionally prepend to notification list cache
      queryClient.invalidateQueries({
        queryKey: ['notifications', userId],
      });
    },
  )
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'notifications',
      filter: `user_id=eq.${userId}`,
    },
    (payload) => {
      const oldRead = payload.old.read;
      const newRead = payload.new.read;

      if (!oldRead && newRead) {
        // Was unread, now read: decrement
        queryClient.setQueryData(
          ['notifications', 'unread-count', userId],
          (prev: number) => Math.max((prev ?? 1) - 1, 0),
        );
      }
    },
  )
  .subscribe();
```

### Cleanup

All Realtime subscriptions are cleaned up in the hook's `useEffect` return function:
```typescript
return () => {
  supabase.removeChannel(channel);
};
```

---

## State Management

| Concern | Solution |
|---|---|
| **Notification list** | React Query `useInfiniteQuery` with cursor-based pagination |
| **Unread count** | React Query + Supabase Realtime subscription for live updates |
| **Reminder list** | React Query with optimistic mutations for toggle/delete |
| **Mark as read** | Optimistic update: immediately update cache, revert on server error |
| **Mark all as read** | Optimistic update: set all cached notifications to `read: true`, invalidate unread count |
| **Delete notification** | Optimistic update: remove from cache immediately, revert on error |
| **Drawer open/close** | Local `useState` in NotificationBell |
| **Filter state** | URL search params via `useSearchParams` for shareable/bookmarkable state |
| **Reminder form** | Local form state with `react-hook-form` + Zod resolver |

---

## TypeScript Interfaces

All interfaces are defined within the block. Key types:

```typescript
// ─── Notification ─────────────────────────────────────────────────
interface NotificationItemData {
  id: string;
  type: 'reminder' | 'risk_alert' | 'achievement' | 'buddy_update' | 'weekly_report' | 'streak_warning';
  title: string;
  message: string;
  read: boolean;
  actionUrl: string | null;
  channelsSent: string[];
  metadata: Record<string, unknown> | null;
  createdAt: string;                 // ISO timestamp
}

interface NotificationListResponse {
  notifications: NotificationItemData[];
  nextCursor: string | null;
}

// ─── Reminder ─────────────────────────────────────────────────────
interface ReminderData {
  id: string;
  courseId: string | null;
  courseTitle: string;                // Joined from courses table
  daysOfWeek: string[];              // ["mon", "wed", "fri"]
  time: string;                      // "19:00"
  timezone: string;                  // "America/New_York"
  enabled: boolean;
  channels: string[];                // ["in_app", "push"]
  createdAt: string;
  updatedAt: string;
}

// ─── Delivery ─────────────────────────────────────────────────────
interface ChannelDeliveryResult {
  channel: string;
  success: boolean;
  messageId?: string;
  error?: string;
}

interface DeliverySummary {
  notificationId: string;
  channelsSent: string[];
  channelsFailed: { channel: string; error: string }[];
}

// ─── User Preferences (read from user_profiles or future preferences table) ─
interface NotificationPreferences {
  enabledTypes: Record<string, string[]>;  // { reminder: ["in_app", "push"], ... }
  quietHours: {
    enabled: boolean;
    start: string;                   // "22:00"
    end: string;                     // "08:00"
  };
  slackWebhookUrl: string | null;
  discordWebhookUrl: string | null;
  pushSubscription: PushSubscription | null;
}

// ─── Scheduler ────────────────────────────────────────────────────
interface SchedulerResult {
  processed: number;                 // Total schedules evaluated
  sent: number;                      // Notifications successfully created + delivered
  skipped: number;                   // Skipped (wrong day, already sent, outside window)
  errors: string[];                  // Error messages for failed deliveries
}

// ─── Filter state ─────────────────────────────────────────────────
interface NotificationFilterState {
  type: string | null;
  unreadOnly: boolean;
}
```

---

## Supabase Queries

### Fetch Paginated Notifications

```sql
SELECT id, type, title, message, read, action_url, channels_sent, metadata, created_at
FROM notifications
WHERE user_id = $1
  AND ($2::text IS NULL OR type = $2)
  AND ($3::boolean IS NULL OR read = NOT $3)
  AND ($4::timestamptz IS NULL OR created_at < $4)
ORDER BY created_at DESC
LIMIT $5;
```

### Unread Count

```sql
SELECT count(*)
FROM notifications
WHERE user_id = $1
  AND read = false;
```

### Mark All As Read

```sql
UPDATE notifications
SET read = true
WHERE user_id = $1
  AND read = false;
```

### Fetch Reminders With Course Title

```sql
SELECT
  rs.id, rs.course_id, rs.days_of_week, rs.time, rs.timezone,
  rs.enabled, rs.channels, rs.created_at, rs.updated_at,
  c.title as course_title
FROM reminder_schedules rs
LEFT JOIN courses c ON c.id = rs.course_id
WHERE rs.user_id = $1
ORDER BY rs.created_at DESC;
```

### Fetch Due Reminders (for scheduler)

```sql
SELECT
  rs.id, rs.user_id, rs.course_id, rs.days_of_week, rs.time,
  rs.timezone, rs.channels,
  up.timezone as user_timezone, up.email, up.daily_study_goal_minutes,
  c.title as course_title
FROM reminder_schedules rs
JOIN user_profiles up ON up.id = rs.user_id
LEFT JOIN courses c ON c.id = rs.course_id
WHERE rs.enabled = true;
```

### Check Duplicate Prevention (for scheduler)

```sql
SELECT id
FROM notifications
WHERE user_id = $1
  AND type = 'reminder'
  AND metadata->>'reminder_schedule_id' = $2
  AND created_at >= $3::date
  AND created_at < ($3::date + interval '1 day');
```

---

## Edge Cases & Error Handling

| Scenario | Behavior |
|---|---|
| **No notifications at all** | Show `EmptyNotifications` with message "You're all caught up!" |
| **Filters return empty** | Show `EmptyNotifications` with message "No notifications match your current filters." and a "Clear Filters" button |
| **All notifications read** | Unread badge disappears. "Mark All as Read" button is disabled. |
| **Notification for deleted course** | Display notification normally. `action_url` may lead to 404 -- handle gracefully in target page. |
| **Reminder for deleted course** | `ON DELETE CASCADE` removes the reminder. If course_id is null (generic reminder), it persists. |
| **Channel adapter failure** | Log error, continue with remaining channels. Do NOT retry (fire-and-forget for MVP). Mark failed channel in logs. |
| **Push subscription expired (410)** | Remove stored subscription. Disable push for user. Show "Re-enable push notifications" prompt in settings. |
| **Slack/Discord webhook invalid** | Log error. Next attempt will also fail. User needs to update webhook URL in settings. |
| **Quiet hours active** | Skip email, push, Slack, Discord. In-app notification still created. Exception: critical risk alerts bypass quiet hours. |
| **Duplicate reminder prevention** | Scheduler checks if a reminder notification with the same `reminder_schedule_id` was already created today. |
| **Timezone edge cases** | DST transitions: use IANA timezone database (via `date-fns-tz` or `Intl`). Schedule may fire slightly early/late during DST change. |
| **User deletes account** | `ON DELETE CASCADE` removes all notifications and reminder_schedules. |
| **Concurrent mark-as-read** | Idempotent: marking an already-read notification as read is a no-op. |
| **Very large notification count** | Infinite scroll with cursor pagination. Never load all at once. |
| **Realtime disconnection** | Hook detects disconnection. Falls back to polling (refetchInterval: 10000). Attempts to reconnect. |

---

## Accessibility

| Feature | Implementation |
|---|---|
| **Bell button** | `aria-label="Notifications, {count} unread"` (live region for count updates) |
| **Unread badge** | `aria-hidden="true"` (info already in bell's aria-label) |
| **Drawer** | `role="dialog"`, `aria-label="Recent notifications"`, focus trap when open |
| **Notification list** | `role="list"`, each item is `role="listitem"` |
| **Unread indicator** | Not color-only: uses bold text + dot icon + left border (multiple visual cues) |
| **Mark as Read** | `aria-label="Mark notification as read"` on each button |
| **Delete button** | Confirmation dialog before deletion, `aria-label="Delete notification"` |
| **Filter controls** | Labels associated via `htmlFor`, live region announces filter changes |
| **Reminder toggle** | `role="switch"`, `aria-checked`, `aria-label="Enable/disable reminder for {course}"` |
| **Time input** | Labeled with timezone context ("Time in America/New_York") |
| **Empty state** | Announced to screen readers when filter results in zero items |
| **Keyboard navigation** | Tab through notification items, Enter/Space to expand or action, Escape to close drawer |

---

## Performance Considerations

| Optimization | Detail |
|---|---|
| **Cursor pagination** | Uses `created_at` cursor instead of offset pagination for consistent performance on large datasets |
| **Index usage** | `idx_notifications_user_unread` for unread-first queries, `idx_notifications_user_type` for type filtering |
| **Realtime over polling** | Unread count uses Supabase Realtime (WebSocket) instead of polling, reducing server load |
| **Optimistic updates** | Mark-as-read and delete update the UI cache immediately without waiting for server response |
| **Lazy drawer** | NotificationDrawer content is only rendered when `isOpen = true` |
| **Debounced filters** | Type and unread filter changes are debounced (300ms) to prevent rapid re-fetching |
| **Channel delivery async** | External channel delivery (email, push, Slack, Discord) runs asynchronously after notification insert. User does not wait for delivery. |
| **Scheduler batch queries** | Reminder scheduler fetches all enabled schedules in one query, evaluates in-memory, then batch-inserts notifications |
| **Badge count cache** | Unread count is cached in React Query with Realtime increments/decrements, not re-queried on every render |

---

## Testing Plan

### Unit Tests

| Test | File | Description |
|---|---|---|
| Zod schemas | `notification-validation.test.ts` | Valid and invalid inputs for all schemas |
| `resolveTemplate` | `notification-sender.test.ts` | Template variable replacement, missing variables |
| `isInQuietHours` | `notification-sender.test.ts` | Regular hours, overnight hours, edge cases |
| `convertToUTC` | `reminder-scheduler.test.ts` | Multiple timezones, DST transitions |
| `isWithinWindow` | `reminder-scheduler.test.ts` | Inside window, outside window, boundary cases |
| Day-of-week check | `reminder-scheduler.test.ts` | Correct day in user's timezone, timezone offset causing day difference |
| Duplicate prevention | `reminder-scheduler.test.ts` | Already sent today, not sent today, midnight boundary |

### Component Tests

| Test | File | Description |
|---|---|---|
| NotificationItem render | `notification-item.test.tsx` | Unread styling, read styling, all notification types, channel badges |
| NotificationBell badge | `notification-bell.test.tsx` | Badge shows count, hides at 0, caps at "9+" |
| NotificationFilters | `notification-filters.test.tsx` | Type selection, unread toggle, filter clearing |
| ReminderForm validation | `reminder-form.test.tsx` | Required fields, day selection, time format, channel selection |
| ReminderItem toggle | `reminder-item.test.tsx` | Toggle calls onToggle, visual state reflects enabled |
| EmptyNotifications | `empty-notifications.test.tsx` | Correct message for filtered vs unfiltered |

### Integration Tests

| Test | Description |
|---|---|
| Mark as read flow | Click "Mark as Read" -> notification updates -> unread count decrements |
| Mark all as read flow | Click "Mark All as Read" -> all notifications updated -> badge clears |
| Delete notification | Click delete -> confirmation -> notification removed from list |
| Create reminder | Fill form -> submit -> reminder appears in list -> can toggle on/off |
| Edit reminder | Click edit -> form populated -> change values -> save -> list updated |
| Delete reminder | Click delete -> confirmation -> reminder removed from list |
| Filter notifications | Select type -> list filters -> clear filter -> full list restored |
| Infinite scroll | Scroll to bottom -> load more trigger fires -> next page loads |

### Channel Adapter Tests

| Test | Description |
|---|---|
| Email adapter | Mock Resend API: success response, error response, rate limit |
| Push adapter | Mock webpush: success, 410 expired, network error |
| Slack adapter | Mock fetch: 200 success, 400 invalid webhook, timeout |
| Discord adapter | Mock fetch: 204 success, 401 invalid webhook, rate limit |

### Scheduler Tests

| Test | Description |
|---|---|
| Process due reminders | Mock schedule at current time -> notification created + delivered |
| Skip wrong day | Mock schedule for Mon, current day is Sat -> skipped |
| Skip already sent | Mock existing notification for today -> skipped |
| Skip outside window | Mock schedule 2 hours from now -> skipped |
| Handle adapter failure | Mock channel failure -> notification still created, error logged |
| Multiple reminders | 3 due, 2 not due -> only 3 processed |

---

## Do Not Touch Boundaries

**CRITICAL: B6 does NOT create notifications from external triggers directly.**

| Rule | Detail |
|---|---|
| **No AI analysis triggers** | B4 (AI Engine) inserts `risk_alert` notification rows into the `notifications` table. B6 does NOT monitor `ai_analyses` and create notifications. |
| **No achievement triggers** | B8 (Achievements) inserts `achievement` notification rows. B6 does NOT monitor `achievements` and create notifications. |
| **No streak monitoring** | B3 (Progress) or a cron job inserts `streak_warning` notifications. B6 does NOT calculate streaks. |
| **No buddy activity triggers** | B7 (Social) inserts `buddy_update` notifications. B6 does NOT monitor study sessions of buddies. |
| **No weekly report triggers** | B4 (AI Engine) inserts `weekly_report` notifications. B6 does NOT generate reports. |
| **Only reminders are self-triggered** | The ONLY notification type that B6 creates on its own is `reminder`, via the reminder scheduler. |
| **No preference UI** | Notification preferences (which types, which channels, quiet hours) are managed in B1's Settings page. B6 only READS those preferences at delivery time. |
| **No cross-block imports** | B6 does NOT import code from any other block. All data exchange is through the database. |
| **No course CRUD** | B6 reads course titles for display purposes only. It does NOT create, update, or delete courses. |
| **No user profile writes** | B6 reads `user_profiles` for timezone and preferences. It does NOT update profiles. |

---

## Dependencies (npm packages used)

| Package | Purpose |
|---|---|
| `@supabase/supabase-js` | Database queries, Realtime subscriptions |
| `@tanstack/react-query` | Client-side data fetching, caching, infinite scroll, optimistic updates |
| `zod` | Input validation for server actions and form data |
| `react-hook-form` | Form state management for reminder form |
| `@hookform/resolvers/zod` | Zod integration with react-hook-form |
| `resend` | Email delivery API client |
| `web-push` | Web Push notification delivery |
| `date-fns` / `date-fns-tz` | Timezone conversion, date formatting, relative time |
| `lucide-react` | Icons for notification types, actions |
| `shadcn/ui` components | `Card`, `Button`, `Badge`, `Select`, `Switch`, `Checkbox`, `Dialog`, `Sheet`, `Popover`, `Separator`, `Skeleton` |

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `RESEND_API_KEY` | For email channel | Resend API key for sending emails |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | For push channel | VAPID public key for Web Push (client + server) |
| `VAPID_PRIVATE_KEY` | For push channel | VAPID private key for Web Push (server only) |
| `CRON_SECRET` | For scheduler | Secret token to authenticate cron job requests |
| `NEXT_PUBLIC_APP_URL` | For channel links | Base URL of the app (for action URLs in external channels) |

---

## Cross-Block Interaction Map

| Block | Interaction with B6 |
|---|---|
| **B1 (Auth/Profile)** | B1 manages notification preference UI in Settings. B6 reads those preferences. |
| **B2 (Courses)** | B6 reads `courses.title` for reminder messages. `ON DELETE CASCADE` cleans up reminders when course deleted. |
| **B3 (Progress)** | B3 inserts `streak_warning` notifications into `notifications` table. B6 displays + delivers them. |
| **B4 (AI Engine)** | B4 inserts `risk_alert` and `weekly_report` notifications. B6 displays + delivers them. |
| **B5 (Dashboard)** | B5 reads `notifications` table for preview bell. B5 may import `NotificationBell` component (exception to no-import rule -- shared UI component). |
| **B7 (Social)** | B7 inserts `buddy_update` notifications. B6 displays + delivers them. |
| **B8 (Achievements)** | B8 inserts `achievement` notifications. B6 displays + delivers them. |
