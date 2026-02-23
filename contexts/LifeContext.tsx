'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import { useSubscription } from './SubscriptionContext';
import {
  LIFE_CONFIG,
  LifeState,
  LifeConsumeResult,
  calculateRecoveredLife,
  canConsumeLife,
} from '@/types/life';

// ローカルストレージキー
const LIFE_STORAGE_KEY = 'englishapp_life_state';

interface StoredLifeState {
  currentLife: number;
  lastUpdateAt: string;
}

// デバッグ用ライフモード
export type DebugLifeMode = 'normal' | 'zero' | 'unlimited';

interface LifeContextType extends LifeState {
  // ライフが無制限かどうか（有料プランまたはマスターアカウント）
  isUnlimited: boolean;
  // ライフを消費する（1問解くとき）
  consumeLife: () => LifeConsumeResult;
  // ライフを消費可能かチェック
  canConsume: () => boolean;
  // ライフをリセット（デバッグ用）
  resetLife: () => void;
  // ライフを満タンにする（リワード広告後など）
  refillLife: (amount?: number) => void;
  // ライフ切れダイアログを表示するか
  showLifeOutDialog: boolean;
  // ダイアログを閉じる
  closeLifeOutDialog: () => void;
  // ダイアログを開く
  openLifeOutDialog: () => void;
  // デバッグ用：ライフを0にする
  setLifeToZero: () => void;
  // デバッグ用：ライフモードを設定（マスターアカウントのみ）
  debugLifeMode: DebugLifeMode;
  setDebugLifeMode: (mode: DebugLifeMode) => void;
}

const LifeContext = createContext<LifeContextType | undefined>(undefined);

function getDefaultState(): StoredLifeState {
  return {
    currentLife: LIFE_CONFIG.MAX_LIFE,
    lastUpdateAt: new Date().toISOString(),
  };
}

export function LifeProvider({ children }: { children: ReactNode }) {
  const { tier, isMasterAccount, getEffectiveTier, debugOverridePlan } = useSubscription();

  // デバッグ用ライフモード
  const [debugLifeMode, setDebugLifeModeState] = useState<DebugLifeMode>('normal');

  // 有効なプランを取得（デバッグオーバーライド考慮）
  const effectiveTier = getEffectiveTier();

  // 有料プランまたはマスターアカウントはライフ無制限
  // ただし、デバッグモードがzeroの場合は制限あり、unlimitedの場合は無制限
  const isUnlimited = (() => {
    // デバッグライフモードが設定されている場合
    if (isMasterAccount && debugLifeMode === 'unlimited') return true;
    if (isMasterAccount && debugLifeMode === 'zero') return false;
    // デバッグプランオーバーライドが設定されている場合
    if (isMasterAccount && debugOverridePlan !== null) {
      return debugOverridePlan !== 'free';
    }
    // 通常のロジック
    return effectiveTier !== 'free' || isMasterAccount;
  })();

  const [state, setState] = useState<LifeState>({
    currentLife: LIFE_CONFIG.MAX_LIFE,
    lastUpdateAt: new Date().toISOString(),
    secondsToNextRecovery: 0,
    isRecovering: false,
  });

  const [showLifeOutDialog, setShowLifeOutDialog] = useState(false);

  // タイマー参照
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // ライフ状態を更新（回復を計算）
  const updateLifeState = useCallback((stored: StoredLifeState) => {
    const { newLife, newUpdateAt, secondsToNext } = calculateRecoveredLife(
      stored.currentLife,
      new Date(stored.lastUpdateAt)
    );

    const newState: LifeState = {
      currentLife: newLife,
      lastUpdateAt: newUpdateAt.toISOString(),
      secondsToNextRecovery: secondsToNext,
      isRecovering: newLife < LIFE_CONFIG.MAX_LIFE,
    };

    setState(newState);

    // ストレージに保存
    const toStore: StoredLifeState = {
      currentLife: newLife,
      lastUpdateAt: newUpdateAt.toISOString(),
    };
    localStorage.setItem(LIFE_STORAGE_KEY, JSON.stringify(toStore));

    return newState;
  }, []);

  // 初期化：ローカルストレージから状態を復元
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LIFE_STORAGE_KEY);
      if (stored) {
        const parsed: StoredLifeState = JSON.parse(stored);
        updateLifeState(parsed);
      } else {
        const defaultState = getDefaultState();
        localStorage.setItem(LIFE_STORAGE_KEY, JSON.stringify(defaultState));
        setState({
          ...defaultState,
          secondsToNextRecovery: 0,
          isRecovering: false,
        });
      }
    } catch {
      const defaultState = getDefaultState();
      localStorage.setItem(LIFE_STORAGE_KEY, JSON.stringify(defaultState));
      setState({
        ...defaultState,
        secondsToNextRecovery: 0,
        isRecovering: false,
      });
    }
  }, [updateLifeState]);

  // カウントダウンタイマー（毎秒更新）
  useEffect(() => {
    // 無制限の場合はタイマー不要
    if (isUnlimited) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    // 回復中でなければタイマー不要
    if (!state.isRecovering) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = setInterval(() => {
      setState(prev => {
        if (prev.secondsToNextRecovery <= 1) {
          // 回復タイミング：ライフ状態を再計算
          const stored: StoredLifeState = {
            currentLife: prev.currentLife,
            lastUpdateAt: prev.lastUpdateAt,
          };
          // 非同期で更新
          setTimeout(() => {
            const storedData = localStorage.getItem(LIFE_STORAGE_KEY);
            if (storedData) {
              updateLifeState(JSON.parse(storedData));
            }
          }, 0);
          return prev;
        }

        return {
          ...prev,
          secondsToNextRecovery: prev.secondsToNextRecovery - 1,
        };
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isUnlimited, state.isRecovering, updateLifeState]);

  // ライフを消費
  const consumeLife = useCallback((): LifeConsumeResult => {
    // 無制限の場合は常に成功
    if (isUnlimited) {
      return { success: true, remainingLife: Infinity };
    }

    // 現在の状態を取得して回復を計算
    const stored = localStorage.getItem(LIFE_STORAGE_KEY);
    if (!stored) {
      return { success: false, remainingLife: 0, message: 'ライフデータが見つかりません' };
    }

    const parsed: StoredLifeState = JSON.parse(stored);
    const { newLife, newUpdateAt, secondsToNext } = calculateRecoveredLife(
      parsed.currentLife,
      new Date(parsed.lastUpdateAt)
    );

    // ライフが足りるかチェック
    if (!canConsumeLife(newLife)) {
      setState({
        currentLife: newLife,
        lastUpdateAt: newUpdateAt.toISOString(),
        secondsToNextRecovery: secondsToNext,
        isRecovering: true,
      });
      return {
        success: false,
        remainingLife: newLife,
        message: 'ライフが足りません',
      };
    }

    // ライフを消費
    const consumedLife = newLife - LIFE_CONFIG.LIFE_PER_QUESTION;

    // 消費後の回復タイマーを計算
    // 既に回復中（MAX_LIFE未満）だった場合は既存のタイマーを継続
    // MAX_LIFEから初めて減った場合のみ新しいタイマーを開始（現在時刻を起点にする）
    const wasAlreadyRecovering = newLife < LIFE_CONFIG.MAX_LIFE;
    const effectiveUpdateAt = wasAlreadyRecovering
      ? newUpdateAt.toISOString()
      : new Date().toISOString(); // MAX_LIFEから消費時は現在時刻を起点にする
    const newSecondsToNext = consumedLife < LIFE_CONFIG.MAX_LIFE
      ? (wasAlreadyRecovering ? secondsToNext : LIFE_CONFIG.RECOVERY_INTERVAL_MINUTES * 60)
      : 0;

    const newState: StoredLifeState = {
      currentLife: consumedLife,
      lastUpdateAt: effectiveUpdateAt,
    };
    localStorage.setItem(LIFE_STORAGE_KEY, JSON.stringify(newState));

    setState({
      currentLife: consumedLife,
      lastUpdateAt: effectiveUpdateAt,
      secondsToNextRecovery: newSecondsToNext,
      isRecovering: consumedLife < LIFE_CONFIG.MAX_LIFE,
    });

    return { success: true, remainingLife: consumedLife };
  }, [isUnlimited]);

  // ライフを消費可能かチェック
  const canConsume = useCallback((): boolean => {
    if (isUnlimited) return true;
    return canConsumeLife(state.currentLife);
  }, [isUnlimited, state.currentLife]);

  // ライフをリセット（デバッグ用）
  const resetLife = useCallback(() => {
    const defaultState = getDefaultState();
    localStorage.setItem(LIFE_STORAGE_KEY, JSON.stringify(defaultState));
    setState({
      ...defaultState,
      secondsToNextRecovery: 0,
      isRecovering: false,
    });
  }, []);

  // ライフを回復（リワード広告後など）
  const refillLife = useCallback((amount: number = 1) => {
    const stored = localStorage.getItem(LIFE_STORAGE_KEY);
    if (!stored) return;

    const parsed: StoredLifeState = JSON.parse(stored);
    const { newLife, newUpdateAt } = calculateRecoveredLife(
      parsed.currentLife,
      new Date(parsed.lastUpdateAt)
    );

    const refilledLife = Math.min(newLife + amount, LIFE_CONFIG.MAX_LIFE);
    const newState: StoredLifeState = {
      currentLife: refilledLife,
      lastUpdateAt: newUpdateAt.toISOString(),
    };
    localStorage.setItem(LIFE_STORAGE_KEY, JSON.stringify(newState));

    const secondsToNext = refilledLife < LIFE_CONFIG.MAX_LIFE
      ? LIFE_CONFIG.RECOVERY_INTERVAL_MINUTES * 60
      : 0;

    setState({
      currentLife: refilledLife,
      lastUpdateAt: newUpdateAt.toISOString(),
      secondsToNextRecovery: secondsToNext,
      isRecovering: refilledLife < LIFE_CONFIG.MAX_LIFE,
    });
  }, []);

  // ダイアログ操作
  const closeLifeOutDialog = useCallback(() => {
    setShowLifeOutDialog(false);
  }, []);

  const openLifeOutDialog = useCallback(() => {
    setShowLifeOutDialog(true);
  }, []);

  // デバッグ用：ライフを0にする
  const setLifeToZero = useCallback(() => {
    const newState: StoredLifeState = {
      currentLife: 0,
      lastUpdateAt: new Date().toISOString(),
    };
    localStorage.setItem(LIFE_STORAGE_KEY, JSON.stringify(newState));

    setState({
      currentLife: 0,
      lastUpdateAt: newState.lastUpdateAt,
      secondsToNextRecovery: LIFE_CONFIG.RECOVERY_INTERVAL_MINUTES * 60,
      isRecovering: true,
    });
  }, []);

  // デバッグ用：ライフモードを設定
  const setDebugLifeMode = useCallback((mode: DebugLifeMode) => {
    setDebugLifeModeState(mode);
    // モードに応じてライフを調整
    if (mode === 'zero') {
      setLifeToZero();
    } else if (mode === 'normal') {
      // 通常モードに戻す場合は何もしない（現在の状態を維持）
    }
    // unlimitedの場合はisUnlimitedの計算で対応
  }, [setLifeToZero]);

  const value: LifeContextType = {
    ...state,
    isUnlimited,
    consumeLife,
    canConsume,
    resetLife,
    refillLife,
    showLifeOutDialog,
    closeLifeOutDialog,
    openLifeOutDialog,
    setLifeToZero,
    debugLifeMode,
    setDebugLifeMode,
  };

  return (
    <LifeContext.Provider value={value}>
      {children}
    </LifeContext.Provider>
  );
}

export function useLife(): LifeContextType {
  const context = useContext(LifeContext);
  if (context === undefined) {
    throw new Error('useLife must be used within a LifeProvider');
  }
  return context;
}
