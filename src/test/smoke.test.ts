import { describe, it, expect } from 'vitest';
import { buildCourse, buildProfile, buildSession } from './factories';

describe('Test infrastructure smoke test', () => {
  it('factories produce valid objects', () => {
    const profile = buildProfile();
    expect(profile.email).toBe('test@example.com');

    const course = buildCourse({ title: 'My Course' });
    expect(course.title).toBe('My Course');
    expect(course.status).toBe('in_progress');

    const session = buildSession({ duration_minutes: 30 });
    expect(session.duration_minutes).toBe(30);
  });

  it('path alias @/ resolves', async () => {
    const { COURSE_STATUS } = await import('@/lib/types/enums');
    expect(COURSE_STATUS.IN_PROGRESS).toBe('in_progress');
  });
});
