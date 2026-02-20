import { SocialTabs } from '@/blocks/b7-social/components/social-tabs';

export default function SocialLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Social</h1>
        <p className="text-sm text-muted-foreground">
          Connect with study buddies, earn achievements, and compete on the leaderboard.
        </p>
      </div>
      <SocialTabs />
      <div>{children}</div>
    </div>
  );
}
