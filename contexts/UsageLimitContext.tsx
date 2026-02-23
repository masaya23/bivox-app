'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useSubscription } from './SubscriptionContext';

// 利用制限の設定定数
export const USAGE_LIMITS = {
  // Speaking判定の1日あたりの上限（Plusプラン）
  PLUS_SPEAKING_DAILY_LIMIT: 50,
  // AI機能（AI応用ドリル + AIフリー英会話）の1日あたりの上限（Proプラン）
  PRO_AI_DAILY_LIMIT: 100,
  // 会話履歴の最大保持数（直近10往復 = 20メッセージ）
  MAX_CONVERSATION_HISTORY: 20,
} as const;

// 利用タイプ
export type UsageType = 'speaking' | 'ai-drill' | 'ai-conversation';

interface DailyUsage {
  speaking: number;
  aiTotal: number; // ai-drill + ai-conversation の合算
  date: string; // YYYY-MM-DD形式
}

interface UsageLimitState {
  dailyUsage: DailyUsage;
  isLoading: boolean;
}

interface UsageLimitContextType extends UsageLimitState {
  // 利用可能かチェック
  canUse: (type: UsageType) => boolean;
  // 利用回数を増やす
  incrementUsage: (type: UsageType) => boolean;
  // 残り回数を取得
  getRemainingCount: (type: UsageType) => number;
  // 上限を取得
  getLimit: (type: UsageType) => number;
  // 上限に達したかどうか
  isLimitReached: (type: UsageType) => boolean;
  // 利用状況をリセット（デバッグ用）
  resetUsage: () => void;
  // 上限到達ダイアログを表示すべきか
  showLimitDialog: boolean;
  // ダイアログを閉じる
  closeLimitDialog: () => void;
  // ダイアログのメッセージタイプ
  limitDialogType: UsageType | null;
}

const UsageLimitContext = createContext<UsageLimitContextType | undefined>(undefined);

const STORAGE_KEY = 'englishapp_daily_usage';

function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

function getDefaultUsage(): DailyUsage {
  return {
    speaking: 0,
    aiTotal: 0,
    date: getTodayString(),
  };
}

export function UsageLimitProvider({ children }: { children: ReactNode }) {
  const { tier, isMasterAccount } = useSubscription();

  const [state, setState] = useState<UsageLimitState>({
    dailyUsage: getDefaultUsage(),
    isLoading: true,
  });

  const [showLimitDialog, setShowLimitDialog] = useState(false);
  const [limitDialogType, setLimitDialogType] = useState<UsageType | null>(null);

  // ローカルストレージから状態を復元（日付が変わっていたらリセット）
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const today = getTodayString();

      if (stored) {
        const parsed: DailyUsage = JSON.parse(stored);
        // 日付が今日と異なる場合はリセット
        if (parsed.date !== today) {
          const newUsage = getDefaultUsage();
          localStorage.setItem(STORAGE_KEY, JSON.stringify(newUsage));
          setState({ dailyUsage: newUsage, isLoading: false });
        } else {
          setState({ dailyUsage: parsed, isLoading: false });
        }
      } else {
        const newUsage = getDefaultUsage();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newUsage));
        setState({ dailyUsage: newUsage, isLoading: false });
      }
    } catch {
      setState({ dailyUsage: getDefaultUsage(), isLoading: false });
    }
  }, []);

  // 状態をローカルストレージに保存
  const saveUsage = useCallback((usage: DailyUsage) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(usage));
  }, []);

  // プランに基づいて上限を取得
  const getLimit = useCallback((type: UsageType): number => {
    // マスターアカウントは全機能無制限
    if (isMasterAccount) return Infinity;

    switch (type) {
      case 'speaking':
        // Proは無制限、Plusは50回、Freeはアクセス不可
        if (tier === 'pro') return Infinity;
        if (tier === 'plus') return USAGE_LIMITS.PLUS_SPEAKING_DAILY_LIMIT;
        return 0;
      case 'ai-drill':
      case 'ai-conversation':
        // Proのみアクセス可能、合算で100回
        if (tier === 'pro') return USAGE_LIMITS.PRO_AI_DAILY_LIMIT;
        return 0;
      default:
        return 0;
    }
  }, [tier, isMasterAccount]);

  // 現在の使用量を取得
  const getCurrentUsage = useCallback((type: UsageType): number => {
    switch (type) {
      case 'speaking':
        return state.dailyUsage.speaking;
      case 'ai-drill':
      case 'ai-conversation':
        return state.dailyUsage.aiTotal;
      default:
        return 0;
    }
  }, [state.dailyUsage]);

  // 残り回数を取得
  const getRemainingCount = useCallback((type: UsageType): number => {
    const limit = getLimit(type);
    if (limit === Infinity) return Infinity;
    const current = getCurrentUsage(type);
    return Math.max(0, limit - current);
  }, [getLimit, getCurrentUsage]);

  // 上限に達したかどうか
  const isLimitReached = useCallback((type: UsageType): boolean => {
    const limit = getLimit(type);
    if (limit === Infinity) return false;
    if (limit === 0) return true; // アクセス権なし
    return getCurrentUsage(type) >= limit;
  }, [getLimit, getCurrentUsage]);

  // 利用可能かチェック
  const canUse = useCallback((type: UsageType): boolean => {
    return !isLimitReached(type);
  }, [isLimitReached]);

  // 利用回数を増やす
  const incrementUsage = useCallback((type: UsageType): boolean => {
    // 上限チェック
    if (isLimitReached(type)) {
      setLimitDialogType(type);
      setShowLimitDialog(true);
      return false;
    }

    setState(prev => {
      const newUsage = { ...prev.dailyUsage };

      switch (type) {
        case 'speaking':
          newUsage.speaking += 1;
          break;
        case 'ai-drill':
        case 'ai-conversation':
          newUsage.aiTotal += 1;
          break;
      }

      saveUsage(newUsage);
      return { ...prev, dailyUsage: newUsage };
    });

    return true;
  }, [isLimitReached, saveUsage]);

  // 利用状況をリセット（デバッグ用）
  const resetUsage = useCallback(() => {
    const newUsage = getDefaultUsage();
    setState(prev => ({ ...prev, dailyUsage: newUsage }));
    saveUsage(newUsage);
  }, [saveUsage]);

  // ダイアログを閉じる
  const closeLimitDialog = useCallback(() => {
    setShowLimitDialog(false);
    setLimitDialogType(null);
  }, []);

  const value: UsageLimitContextType = {
    ...state,
    canUse,
    incrementUsage,
    getRemainingCount,
    getLimit,
    isLimitReached,
    resetUsage,
    showLimitDialog,
    closeLimitDialog,
    limitDialogType,
  };

  return (
    <UsageLimitContext.Provider value={value}>
      {children}
    </UsageLimitContext.Provider>
  );
}

export function useUsageLimit(): UsageLimitContextType {
  const context = useContext(UsageLimitContext);
  if (context === undefined) {
    throw new Error('useUsageLimit must be used within a UsageLimitProvider');
  }
  return context;
}
