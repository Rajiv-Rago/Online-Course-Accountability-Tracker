import { BuddyActivityView } from '@/blocks/b7-social/components/buddy-activity-view';

interface BuddyDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function BuddyDetailPage({ params }: BuddyDetailPageProps) {
  const { id } = await params;
  return <BuddyActivityView buddyUserId={id} />;
}
