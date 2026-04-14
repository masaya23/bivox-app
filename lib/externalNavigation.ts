'use client';

import { Capacitor, registerPlugin } from '@capacitor/core';

interface ExternalNavigationPlugin {
  openUrl(options: { url: string; packageName?: string }): Promise<{ opened: boolean; fallback?: boolean }>;
}

const ExternalNavigation = registerPlugin<ExternalNavigationPlugin>('ExternalNavigation');

export async function openExternalUrl(url: string, packageName?: string): Promise<boolean> {
  if (!url) {
    return false;
  }

  if (!Capacitor.isNativePlatform()) {
    window.location.href = url;
    return true;
  }

  try {
    await ExternalNavigation.openUrl({ url, packageName });
    return true;
  } catch (error) {
    console.error('Failed to open external URL via native plugin:', error);

    if (typeof window !== 'undefined') {
      window.location.href = url;
      return true;
    }

    return false;
  }
}
