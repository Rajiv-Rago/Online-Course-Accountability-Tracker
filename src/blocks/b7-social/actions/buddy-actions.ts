'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { ActionResult, BuddyWithProfile } from '@/lib/types';
import type { PublicBuddyActivity } from '../lib/buddy-privacy';
import { sendBuddyRequestSchema, respondToRequestSchema, removeBuddySchema, buddySearchSchema } from '../lib/buddy-validation';

// =============================================================================
// Types
// =============================================================================

export interface BuddiesData {
  accepted: BuddyWithProfile[];
  incoming: BuddyWithProfile[];
  outgoing: BuddyWithProfile[];
}

export interface SearchResult {
  id: string;
  display_name: string;
  avatar_url: string | null;
  relationship: 'none' | 'pending_outgoing' | 'pending_incoming' | 'accepted';
}

// =============================================================================
// getBuddies
// =============================================================================

export async function getBuddies(): Promise<ActionResult<BuddiesData>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { error: 'Unauthorized' };

    // Fetch all non-removed buddy rows involving this user
    const { data: buddyRows, error: buddyError } = await supabase
      .from('study_buddies')
      .select('*')
      .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .in('status', ['pending', 'accepted']);

    if (buddyError) return { error: buddyError.message };
    if (!buddyRows || buddyRows.length === 0) {
      return { data: { accepted: [], incoming: [], outgoing: [] } };
    }

    // Collect all other user IDs
    const otherIds = new Set<string>();
    for (const row of buddyRows) {
      otherIds.add(row.requester_id === user.id ? row.recipient_id : row.requester_id);
    }

    // Fetch profiles via admin client (cross-user read)
    const admin = createAdminClient();
    const { data: profiles } = await admin
      .from('user_profiles')
      .select('id, display_name, avatar_url')
      .in('id', Array.from(otherIds));

    const profileMap = new Map(
      (profiles ?? []).map((p: { id: string; display_name: string; avatar_url: string | null }) => [p.id, p])
    );

    const accepted: BuddyWithProfile[] = [];
    const incoming: BuddyWithProfile[] = [];
    const outgoing: BuddyWithProfile[] = [];

    for (const row of buddyRows) {
      const isRequester = row.requester_id === user.id;
      const otherUserId = isRequester ? row.recipient_id : row.requester_id;
      const profile = profileMap.get(otherUserId);

      const buddy: BuddyWithProfile = {
        id: row.id,
        buddy_user_id: otherUserId,
        status: row.status,
        display_name: profile?.display_name || 'Unknown User',
        avatar_url: profile?.avatar_url ?? null,
        created_at: row.created_at,
        is_requester: isRequester,
      };

      if (row.status === 'accepted') {
        accepted.push(buddy);
      } else if (row.status === 'pending') {
        if (isRequester) {
          outgoing.push(buddy);
        } else {
          incoming.push(buddy);
        }
      }
    }

    return { data: { accepted, incoming, outgoing } };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

// =============================================================================
// searchUsers
// =============================================================================

export async function searchUsers(query: string): Promise<ActionResult<SearchResult[]>> {
  try {
    const parsed = buddySearchSchema.safeParse({ query });
    if (!parsed.success) return { error: parsed.error.errors[0].message };

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { error: 'Unauthorized' };

    const admin = createAdminClient();
    const searchTerm = `%${parsed.data.query}%`;

    const { data: users, error: searchError } = await admin
      .from('user_profiles')
      .select('id, display_name, avatar_url, email')
      .or(`display_name.ilike.${searchTerm},email.ilike.${searchTerm}`)
      .neq('id', user.id)
      .eq('onboarding_completed', true)
      .limit(20);

    if (searchError) return { error: searchError.message };

    // Get existing relationships
    const { data: relationships } = await supabase
      .from('study_buddies')
      .select('requester_id, recipient_id, status')
      .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .in('status', ['pending', 'accepted']);

    const relationshipMap = new Map<string, 'pending_outgoing' | 'pending_incoming' | 'accepted'>();
    for (const rel of relationships ?? []) {
      const otherId = rel.requester_id === user.id ? rel.recipient_id : rel.requester_id;
      if (rel.status === 'accepted') {
        relationshipMap.set(otherId, 'accepted');
      } else if (rel.status === 'pending') {
        relationshipMap.set(otherId, rel.requester_id === user.id ? 'pending_outgoing' : 'pending_incoming');
      }
    }

    const results: SearchResult[] = (users ?? []).map((u: { id: string; display_name: string; avatar_url: string | null }) => ({
      id: u.id,
      display_name: u.display_name || 'Unknown User',
      avatar_url: u.avatar_url,
      relationship: relationshipMap.get(u.id) ?? 'none',
    }));

    return { data: results };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

// =============================================================================
// sendBuddyRequest
// =============================================================================

export async function sendBuddyRequest(recipientId: string): Promise<ActionResult<{ id: string }>> {
  try {
    const parsed = sendBuddyRequestSchema.safeParse({ recipientId });
    if (!parsed.success) return { error: parsed.error.errors[0].message };

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { error: 'Unauthorized' };

    if (user.id === recipientId) return { error: 'Cannot send request to yourself' };

    // Check for existing relationship
    const { data: existing } = await supabase
      .from('study_buddies')
      .select('id, status, updated_at')
      .eq('requester_id', user.id)
      .eq('recipient_id', recipientId)
      .maybeSingle();

    if (existing) {
      if (existing.status === 'accepted') return { error: 'Already connected' };
      if (existing.status === 'pending') return { error: 'Request already pending' };

      // Re-request after decline/remove: enforce 24h cooldown
      const cooldownMs = 24 * 60 * 60 * 1000;
      if (Date.now() - new Date(existing.updated_at).getTime() < cooldownMs) {
        return { error: 'Please wait before sending another request' };
      }

      // Update existing row back to pending
      const { error: updateError } = await supabase
        .from('study_buddies')
        .update({ status: 'pending', updated_at: new Date().toISOString() })
        .eq('id', existing.id);

      if (updateError) return { error: updateError.message };

      // Create notification for recipient
      await createBuddyNotification(supabase, recipientId, user.id, 'sent you a buddy request');

      return { data: { id: existing.id } };
    }

    // Also check reverse direction
    const { data: reverse } = await supabase
      .from('study_buddies')
      .select('id, status')
      .eq('requester_id', recipientId)
      .eq('recipient_id', user.id)
      .maybeSingle();

    if (reverse) {
      if (reverse.status === 'accepted') return { error: 'Already connected' };
      if (reverse.status === 'pending') return { error: 'This user already sent you a request' };
    }

    // Insert new request
    const { data: newRow, error: insertError } = await supabase
      .from('study_buddies')
      .insert({ requester_id: user.id, recipient_id: recipientId, status: 'pending' })
      .select('id')
      .single();

    if (insertError) return { error: insertError.message };

    await createBuddyNotification(supabase, recipientId, user.id, 'sent you a buddy request');

    return { data: { id: newRow.id } };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

// =============================================================================
// acceptRequest
// =============================================================================

export async function acceptRequest(relationshipId: string): Promise<ActionResult> {
  try {
    const parsed = respondToRequestSchema.safeParse({ relationshipId });
    if (!parsed.success) return { error: parsed.error.errors[0].message };

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { error: 'Unauthorized' };

    // Verify this user is the recipient
    const { data: row, error: fetchError } = await supabase
      .from('study_buddies')
      .select('requester_id, recipient_id, status')
      .eq('id', relationshipId)
      .single();

    if (fetchError || !row) return { error: 'Request not found' };
    if (row.recipient_id !== user.id) return { error: 'Not authorized to accept this request' };
    if (row.status !== 'pending') return { error: 'Request is no longer pending' };

    const { error: updateError } = await supabase
      .from('study_buddies')
      .update({ status: 'accepted', updated_at: new Date().toISOString() })
      .eq('id', relationshipId);

    if (updateError) return { error: updateError.message };

    await createBuddyNotification(supabase, row.requester_id, user.id, 'accepted your buddy request');

    return { data: undefined };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

// =============================================================================
// declineRequest
// =============================================================================

export async function declineRequest(relationshipId: string): Promise<ActionResult> {
  try {
    const parsed = respondToRequestSchema.safeParse({ relationshipId });
    if (!parsed.success) return { error: parsed.error.errors[0].message };

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { error: 'Unauthorized' };

    const { data: row, error: fetchError } = await supabase
      .from('study_buddies')
      .select('recipient_id, status')
      .eq('id', relationshipId)
      .single();

    if (fetchError || !row) return { error: 'Request not found' };
    if (row.recipient_id !== user.id) return { error: 'Not authorized to decline this request' };
    if (row.status !== 'pending') return { error: 'Request is no longer pending' };

    const { error: updateError } = await supabase
      .from('study_buddies')
      .update({ status: 'declined', updated_at: new Date().toISOString() })
      .eq('id', relationshipId);

    if (updateError) return { error: updateError.message };
    return { data: undefined };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

// =============================================================================
// removeBuddy
// =============================================================================

export async function removeBuddy(relationshipId: string): Promise<ActionResult> {
  try {
    const parsed = removeBuddySchema.safeParse({ relationshipId });
    if (!parsed.success) return { error: parsed.error.errors[0].message };

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { error: 'Unauthorized' };

    const { data: row, error: fetchError } = await supabase
      .from('study_buddies')
      .select('requester_id, recipient_id, status')
      .eq('id', relationshipId)
      .single();

    if (fetchError || !row) return { error: 'Relationship not found' };
    if (row.requester_id !== user.id && row.recipient_id !== user.id) {
      return { error: 'Not authorized to remove this buddy' };
    }
    if (row.status !== 'accepted') return { error: 'Not an active buddy connection' };

    const otherId = row.requester_id === user.id ? row.recipient_id : row.requester_id;

    const { error: updateError } = await supabase
      .from('study_buddies')
      .update({ status: 'removed', updated_at: new Date().toISOString() })
      .eq('id', relationshipId);

    if (updateError) return { error: updateError.message };

    await createBuddyNotification(supabase, otherId, user.id, 'removed you as a buddy');

    return { data: undefined };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

// =============================================================================
// getBuddyActivity
// =============================================================================

export async function getBuddyActivity(buddyUserId: string): Promise<ActionResult<PublicBuddyActivity>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { error: 'Unauthorized' };

    // Verify accepted buddy relationship
    const { data: relationship } = await supabase
      .from('study_buddies')
      .select('id')
      .eq('status', 'accepted')
      .or(
        `and(requester_id.eq.${user.id},recipient_id.eq.${buddyUserId}),and(requester_id.eq.${buddyUserId},recipient_id.eq.${user.id})`
      )
      .maybeSingle();

    if (!relationship) return { error: 'Not connected with this user' };

    const admin = createAdminClient();

    // Get week range for hours calculation
    const now = new Date();
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayOffset);
    monday.setHours(0, 0, 0, 0);
    const weekStart = monday.toISOString();

    const [profileResult, sessionsResult, dailyStatsResult, coursesResult, achievementsResult] = await Promise.all([
      admin
        .from('user_profiles')
        .select('id, display_name, avatar_url')
        .eq('id', buddyUserId)
        .single(),
      admin
        .from('study_sessions')
        .select('started_at, duration_minutes')
        .eq('user_id', buddyUserId)
        .gte('started_at', weekStart)
        .order('started_at', { ascending: false }),
      admin
        .from('daily_stats')
        .select('date, streak_day')
        .eq('user_id', buddyUserId)
        .order('date', { ascending: false })
        .limit(100),
      admin
        .from('courses')
        .select('id')
        .eq('user_id', buddyUserId)
        .in('status', ['in_progress', 'not_started']),
      admin
        .from('achievements')
        .select('achievement_type, earned_at, metadata')
        .eq('user_id', buddyUserId)
        .eq('shared', true)
        .order('earned_at', { ascending: false }),
    ]);

    if (profileResult.error) return { error: profileResult.error.message };

    // Calculate streak
    let streak = 0;
    for (const stat of dailyStatsResult.data ?? []) {
      if (stat.streak_day) streak++;
      else break;
    }

    // Calculate hours this week
    const weekMinutes = (sessionsResult.data ?? []).reduce(
      (sum: number, s: { duration_minutes: number }) => sum + s.duration_minutes, 0
    );

    // Last active
    const lastSession = (sessionsResult.data ?? [])[0];
    const lastActive = lastSession?.started_at ?? null;

    return {
      data: {
        profile: profileResult.data,
        streak,
        hoursThisWeek: Math.round((weekMinutes / 60) * 10) / 10,
        activeCoursesCount: (coursesResult.data ?? []).length,
        lastActive,
        sharedAchievements: (achievementsResult.data ?? []).map(
          (a: { achievement_type: string; earned_at: string; metadata: Record<string, unknown> | null }) => ({
            achievement_type: a.achievement_type,
            earned_at: a.earned_at,
            metadata: a.metadata,
          })
        ),
      },
    };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

// =============================================================================
// Helper: create buddy notification
// =============================================================================

async function createBuddyNotification(supabase: Awaited<ReturnType<typeof createClient>>, recipientId: string, actorId: string, action: string) {
  try {
    const admin = createAdminClient();
    const { data: actor } = await admin
      .from('user_profiles')
      .select('display_name')
      .eq('id', actorId)
      .single();

    const actorName = actor?.display_name || 'Someone';

    await supabase.from('notifications').insert({
      user_id: recipientId,
      type: 'buddy_update',
      title: 'Buddy Update',
      message: `${actorName} ${action}`,
      action_url: '/social/buddies',
      channels_sent: ['in_app'],
    });
  } catch {
    // Non-critical: don't fail the main action if notification fails
  }
}
