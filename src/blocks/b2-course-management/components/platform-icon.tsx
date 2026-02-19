'use client';

import {
  GraduationCap,
  BookOpen,
  Youtube,
  Palette,
  PlayCircle,
  Globe,
} from 'lucide-react';
import type { CoursePlatform } from '@/lib/types';
import { getPlatformConfig } from '../lib/platform-config';

interface PlatformIconProps {
  platform: CoursePlatform | null;
  size?: number;
  className?: string;
}

const ICON_MAP: Record<string, React.ElementType> = {
  'graduation-cap': GraduationCap,
  'book-open': BookOpen,
  'youtube': Youtube,
  'palette': Palette,
  'play-circle': PlayCircle,
  'globe': Globe,
};

export function PlatformIcon({ platform, size = 16, className }: PlatformIconProps) {
  const config = getPlatformConfig(platform);
  const IconComp = ICON_MAP[config.icon] ?? Globe;

  return (
    <IconComp
      size={size}
      className={className}
      style={{ color: config.color }}
    />
  );
}
