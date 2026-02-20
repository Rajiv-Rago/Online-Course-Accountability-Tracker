"use client";

import Link from "next/link";
import { Menu, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { NotificationBell } from "@/blocks/b6-notifications/components/notification-bell";

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-4 border-b border-border bg-background px-4 sm:px-6">
      <button
        type="button"
        className="lg:hidden -m-2.5 p-2.5 text-foreground"
        onClick={onMenuClick}
      >
        <Menu className="h-6 w-6" />
      </button>

      {/* Mobile logo */}
      <div className="flex lg:hidden items-center gap-2">
        <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
          <BookOpen className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="font-semibold">CourseTracker</span>
      </div>

      <div className="flex flex-1 justify-end gap-4">
        <NotificationBell />

        <Link
          href="/settings"
          className={cn(
            "flex items-center justify-center rounded-full h-8 w-8",
            "bg-muted text-muted-foreground text-sm font-medium"
          )}
        >
          U
        </Link>
      </div>
    </header>
  );
}
