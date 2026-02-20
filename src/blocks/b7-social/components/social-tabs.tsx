'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Users, Trophy, BarChart3 } from 'lucide-react';

const TABS = [
  { href: '/social/buddies', label: 'Buddies', icon: Users },
  { href: '/social/achievements', label: 'Achievements', icon: Trophy },
  { href: '/social/leaderboard', label: 'Leaderboard', icon: BarChart3 },
] as const;

export function SocialTabs() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 border-b">
      {TABS.map(({ href, label, icon: Icon }) => {
        const isActive = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px',
              isActive
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
