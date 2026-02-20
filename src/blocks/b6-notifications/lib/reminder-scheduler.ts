import { createAdminClient } from '@/lib/supabase/admin';
import { sendToChannels } from './notification-sender';

interface SchedulerResult {
  processed: number;
  sent: number;
  skipped: number;
  errors: string[];
}

interface ScheduleJoinRow {
  id: string;
  user_id: string;
  course_id: string | null;
  days_of_week: string[];
  time: string;
  timezone: string;
  channels: string[];
  user_profiles: {
    timezone: string;
    email: string;
    daily_study_goal_mins: number;
  } | null;
  courses: { title: string } | null;
}

export async function processReminders(): Promise<SchedulerResult> {
  const supabase = createAdminClient();
  const now = new Date();
  const errors: string[] = [];
  let processed = 0;
  let sent = 0;
  let skipped = 0;

  // 1. Fetch all enabled reminder schedules with user + course data
  const { data: schedules, error } = await supabase
    .from('reminder_schedules')
    .select(`
      id, user_id, course_id, days_of_week, time, timezone, channels,
      user_profiles!inner(timezone, email, daily_study_goal_mins),
      courses(title)
    `)
    .eq('enabled', true);

  if (error) {
    return { processed: 0, sent: 0, skipped: 0, errors: [error.message] };
  }

  if (!schedules || schedules.length === 0) {
    return { processed: 0, sent: 0, skipped: 0, errors: [] };
  }

  for (const raw of schedules) {
    processed++;

    const schedule = raw as unknown as ScheduleJoinRow;
    const userTimezone =
      schedule.timezone || schedule.user_profiles?.timezone || 'UTC';
    const courseTitle = schedule.courses?.title ?? 'your course';
    const dailyGoal = schedule.user_profiles?.daily_study_goal_mins ?? 60;

    // 2. Check if today's day of week (in user's timezone) matches
    const todayDay = getDayOfWeekInTimezone(now, userTimezone as string);
    const daysOfWeek = schedule.days_of_week;
    if (!daysOfWeek.includes(todayDay)) {
      skipped++;
      continue;
    }

    // 3. Check if schedule time falls within the 15-minute window
    const scheduleTime = normalizeTime(schedule.time);
    if (!isWithinWindow(scheduleTime, now, userTimezone as string, 15)) {
      skipped++;
      continue;
    }

    // 4. Check duplicate prevention - already sent today?
    const todayStart = getTodayStartUTC(userTimezone as string);
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);

    const { data: existing } = await supabase
      .from('notifications')
      .select('id')
      .eq('user_id', schedule.user_id)
      .eq('type', 'reminder')
      .gte('created_at', todayStart.toISOString())
      .lt('created_at', tomorrowStart.toISOString())
      .contains('metadata', { reminder_schedule_id: schedule.id })
      .limit(1);

    if (existing && existing.length > 0) {
      skipped++;
      continue;
    }

    // 5. Create notification
    const { data: notification, error: insertErr } = await supabase
      .from('notifications')
      .insert({
        user_id: schedule.user_id,
        type: 'reminder',
        title: `Time to study ${courseTitle}!`,
        message: `Your scheduled study time for ${courseTitle} is starting now. Your daily goal is ${dailyGoal} minutes.`,
        action_url: schedule.course_id
          ? `/progress?course=${schedule.course_id}`
          : '/progress',
        channels_sent: ['in_app'],
        metadata: {
          reminder_schedule_id: schedule.id,
          course_id: schedule.course_id,
        },
      })
      .select()
      .single();

    if (insertErr) {
      errors.push(`Failed to create notification for schedule ${schedule.id}: ${insertErr.message}`);
      continue;
    }

    // 6. Send via configured channels
    try {
      await sendToChannels(notification);
      sent++;
    } catch (err) {
      errors.push(`Delivery error for schedule ${schedule.id}: ${String(err)}`);
      sent++; // in-app was already created
    }
  }

  return { processed, sent, skipped, errors };
}

/**
 * Get the short day-of-week name in a given timezone
 */
function getDayOfWeekInTimezone(date: Date, timezone: string): string {
  try {
    const weekday = new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      timeZone: timezone,
    })
      .format(date)
      .toLowerCase();

    const map: Record<string, string> = {
      sun: 'sun', mon: 'mon', tue: 'tue', wed: 'wed',
      thu: 'thu', fri: 'fri', sat: 'sat',
    };
    return map[weekday] ?? 'mon';
  } catch {
    const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    return days[date.getDay()];
  }
}

/**
 * Check if a schedule time in the user's timezone falls within a window
 * of the current time.
 */
function isWithinWindow(
  scheduleTime: string,
  now: Date,
  timezone: string,
  windowMinutes: number
): boolean {
  try {
    // Get current time in user's timezone as HH:MM
    const currentTimeStr = new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: timezone,
    }).format(now);

    const [schedH, schedM] = scheduleTime.split(':').map(Number);
    const [currH, currM] = currentTimeStr.split(':').map(Number);

    const schedMinutes = schedH * 60 + schedM;
    const currMinutes = currH * 60 + currM;

    const diff = Math.abs(schedMinutes - currMinutes);
    // Handle midnight wrap-around
    const wrappedDiff = Math.min(diff, 1440 - diff);
    return wrappedDiff <= windowMinutes / 2;
  } catch {
    return false;
  }
}

/**
 * Normalize time string from "HH:MM:SS" or "HH:MM" to "HH:MM"
 */
function normalizeTime(time: string): string {
  return time.substring(0, 5);
}

/**
 * Get start of "today" in a timezone as a UTC Date.
 */
function getTodayStartUTC(timezone: string): Date {
  try {
    const nowStr = new Intl.DateTimeFormat('en-CA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: timezone,
    }).format(new Date());
    return new Date(nowStr + 'T00:00:00Z');
  } catch {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    return d;
  }
}
