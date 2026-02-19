import type { CoursePlatform } from '@/lib/types';

export interface PlatformConfig {
  label: string;
  icon: string;
  color: string;
  urlPattern?: RegExp;
}

export const PLATFORMS: Record<CoursePlatform, PlatformConfig> = {
  udemy: {
    label: 'Udemy',
    icon: 'graduation-cap',
    color: '#A435F0',
    urlPattern: /udemy\.com/,
  },
  coursera: {
    label: 'Coursera',
    icon: 'book-open',
    color: '#0056D2',
    urlPattern: /coursera\.org/,
  },
  youtube: {
    label: 'YouTube',
    icon: 'youtube',
    color: '#FF0000',
    urlPattern: /youtube\.com|youtu\.be/,
  },
  skillshare: {
    label: 'Skillshare',
    icon: 'palette',
    color: '#00FF84',
    urlPattern: /skillshare\.com/,
  },
  pluralsight: {
    label: 'Pluralsight',
    icon: 'play-circle',
    color: '#E80A89',
    urlPattern: /pluralsight\.com/,
  },
  custom: {
    label: 'Other',
    icon: 'globe',
    color: '#718096',
  },
};

export function getPlatformConfig(platform: CoursePlatform | null): PlatformConfig {
  if (!platform) return PLATFORMS.custom;
  return PLATFORMS[platform] ?? PLATFORMS.custom;
}

export function detectPlatformFromUrl(url: string): CoursePlatform | null {
  for (const [key, config] of Object.entries(PLATFORMS)) {
    if (config.urlPattern && config.urlPattern.test(url)) {
      return key as CoursePlatform;
    }
  }
  return null;
}
