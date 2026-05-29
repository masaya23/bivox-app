'use client';

import { ReactNode, useEffect, useState } from 'react';
import HardNavLink from '@/components/HardNavLink';
import LockIcon from '@/components/icons/LockIcon';
import PaywallScreen from '@/components/subscription/PaywallScreen';
import {
  MODE_NAMES,
  MODE_REQUIRED_PLAN,
  PLAN_NAMES,
  TrainingMode,
  useSubscription,
} from '@/contexts/SubscriptionContext';

interface ModeAccessGateProps {
  mode: TrainingMode;
  backLink: string;
  children: ReactNode;
}

export default function ModeAccessGate({ mode, backLink, children }: ModeAccessGateProps) {
  const { canAccessMode, isLoading, syncNativeSubscription } = useSubscription();
  const [isCheckingEntry, setIsCheckingEntry] = useState(MODE_REQUIRED_PLAN[mode] !== 'free');
  const [showPaywall, setShowPaywall] = useState(false);
  const isPaidMode = MODE_REQUIRED_PLAN[mode] !== 'free';

  useEffect(() => {
    if (!isPaidMode) {
      setIsCheckingEntry(false);
      return;
    }

    let cancelled = false;
    setIsCheckingEntry(true);

    void (async () => {
      try {
        await syncNativeSubscription({ forceRestore: false });
      } finally {
        if (!cancelled) {
          setIsCheckingEntry(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isPaidMode, mode, syncNativeSubscription]);

  if (!isPaidMode || (!isCheckingEntry && !isLoading && canAccessMode(mode))) {
    return <>{children}</>;
  }

  if (isCheckingEntry || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col max-w-[430px] mx-auto relative shadow-xl">
        <header className="bg-white px-4 py-3 sticky top-0 z-30 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <HardNavLink href={backLink} className="text-gray-600 hover:text-gray-800 font-semibold text-sm min-w-[60px]">
              ← 戻る
            </HardNavLink>
            <h1 className="text-lg font-black text-gray-800">{MODE_NAMES[mode]}</h1>
            <div className="min-w-[60px]" />
          </div>
        </header>

        <div className="flex-1 px-5 py-8 flex items-center justify-center">
          <div className="w-full rounded-3xl bg-white shadow-xl border border-blue-100 p-6 text-center">
            <div className="w-12 h-12 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <h2 className="text-lg font-black text-gray-800 mb-2">購読状態を確認しています</h2>
            <p className="text-sm text-gray-600 leading-6">
              {MODE_NAMES[mode]}を利用できるか確認しています。
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50 flex flex-col max-w-[430px] mx-auto relative shadow-xl">
        <header className="bg-white px-4 py-3 sticky top-0 z-30 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <HardNavLink href={backLink} className="text-gray-600 hover:text-gray-800 font-semibold text-sm min-w-[60px]">
              ← 戻る
            </HardNavLink>
            <h1 className="text-lg font-black text-gray-800">{MODE_NAMES[mode]}</h1>
            <div className="min-w-[60px]" />
          </div>
        </header>

        <div className="flex-1 px-5 py-8 flex items-center justify-center">
          <div className="w-full rounded-3xl bg-white shadow-xl border border-gray-100 p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-500 text-white flex items-center justify-center text-2xl font-black">
              <LockIcon size={28} />
            </div>
            <h2 className="text-xl font-black text-gray-800 mb-3">
              {PLAN_NAMES[MODE_REQUIRED_PLAN[mode]]}限定機能です
            </h2>
            <p className="text-sm text-gray-600 leading-6 mb-5">
              {MODE_NAMES[mode]}は{PLAN_NAMES[MODE_REQUIRED_PLAN[mode]]}でご利用いただけます。
            </p>
            <button
              onClick={() => setShowPaywall(true)}
              className="w-full py-3 rounded-2xl font-bold text-white bg-gradient-to-r from-blue-500 to-purple-500 active:scale-[0.98] transition-transform"
            >
              プレミアムを見る
            </button>
          </div>
        </div>
      </div>

      <PaywallScreen
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        highlightedMode={mode}
      />
    </>
  );
}
