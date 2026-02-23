'use client';

import { ReactNode } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { SubscriptionProvider } from '@/contexts/SubscriptionContext';
import { AdProvider } from '@/contexts/AdContext';
import { UsageLimitProvider } from '@/contexts/UsageLimitContext';
import { LifeProvider } from '@/contexts/LifeContext';
import UsageLimitDialog from '@/components/subscription/UsageLimitDialog';
import LifeOutDialog from '@/components/life/LifeOutDialog';

interface ProvidersProps {
  children: ReactNode;
}

export default function Providers({ children }: ProvidersProps) {
  return (
    <AuthProvider>
      <SubscriptionProvider>
        <AdProvider>
          <UsageLimitProvider>
            <LifeProvider>
              {children}
              {/* グローバルな利用制限ダイアログ */}
              <UsageLimitDialog />
              {/* グローバルなライフ切れダイアログ */}
              <LifeOutDialog />
            </LifeProvider>
          </UsageLimitProvider>
        </AdProvider>
      </SubscriptionProvider>
    </AuthProvider>
  );
}
