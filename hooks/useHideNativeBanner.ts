'use client';

import { useEffect } from 'react';
import { useAdMob } from '@/hooks/useAdMob';

export function useHideNativeBanner() {
  const { isNative, isInitialized, hideBanner } = useAdMob();

  useEffect(() => {
    if (!isNative || !isInitialized) {
      return;
    }

    void hideBanner();
  }, [hideBanner, isInitialized, isNative]);
}
