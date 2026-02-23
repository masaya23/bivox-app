import { FirebaseAnalytics } from '@capacitor-firebase/analytics';
import { Capacitor } from '@capacitor/core';

const isNative = Capacitor.isNativePlatform();

/**
 * Firebase Analytics ユーティリティ
 * ネイティブ環境でのみ動作し、Web環境では何もしない
 */

// 画面遷移を記録
export const logScreenView = async (screenName: string, screenClass?: string) => {
  if (!isNative) return;

  try {
    await FirebaseAnalytics.logEvent({
      name: 'screen_view',
      params: {
        screen_name: screenName,
        screen_class: screenClass || screenName,
      },
    });
  } catch (error) {
    console.error('Analytics screen_view error:', error);
  }
};

// ユーザーIDを設定
export const setUserId = async (userId: string | null) => {
  if (!isNative) return;

  try {
    await FirebaseAnalytics.setUserId({ userId });
  } catch (error) {
    console.error('Analytics setUserId error:', error);
  }
};

// ユーザープロパティを設定
export const setUserProperty = async (key: string, value: string) => {
  if (!isNative) return;

  try {
    await FirebaseAnalytics.setUserProperty({ key, value });
  } catch (error) {
    console.error('Analytics setUserProperty error:', error);
  }
};

// 新規登録イベント
export const logSignUp = async (method: 'email' | 'google' | 'apple') => {
  if (!isNative) return;

  try {
    await FirebaseAnalytics.logEvent({
      name: 'sign_up',
      params: { method },
    });
  } catch (error) {
    console.error('Analytics sign_up error:', error);
  }
};

// ログインイベント
export const logLogin = async (method: 'email' | 'google' | 'apple') => {
  if (!isNative) return;

  try {
    await FirebaseAnalytics.logEvent({
      name: 'login',
      params: { method },
    });
  } catch (error) {
    console.error('Analytics login error:', error);
  }
};

// サブスクリプション開始イベント
export const logSubscriptionStart = async (
  plan: 'plus' | 'pro',
  billingPeriod: 'monthly' | 'annual',
  price?: number
) => {
  if (!isNative) return;

  try {
    await FirebaseAnalytics.logEvent({
      name: 'subscription_start',
      params: {
        plan,
        billing_period: billingPeriod,
        price: price || 0,
      },
    });
  } catch (error) {
    console.error('Analytics subscription_start error:', error);
  }
};

// サブスクリプション解約イベント
export const logSubscriptionCancel = async (
  plan: 'plus' | 'pro',
  reason?: string
) => {
  if (!isNative) return;

  try {
    await FirebaseAnalytics.logEvent({
      name: 'subscription_cancel',
      params: {
        plan,
        reason: reason || 'not_specified',
      },
    });
  } catch (error) {
    console.error('Analytics subscription_cancel error:', error);
  }
};

// 学習完了イベント
export const logTrainingComplete = async (
  mode: 'shadowing' | 'speaking' | 'ai_drill',
  questionCount: number,
  unitId?: string
) => {
  if (!isNative) return;

  try {
    await FirebaseAnalytics.logEvent({
      name: 'training_complete',
      params: {
        mode,
        question_count: questionCount,
        unit_id: unitId || 'unknown',
      },
    });
  } catch (error) {
    console.error('Analytics training_complete error:', error);
  }
};

// チュートリアル完了イベント
export const logTutorialComplete = async () => {
  if (!isNative) return;

  try {
    await FirebaseAnalytics.logEvent({
      name: 'tutorial_complete',
      params: {},
    });
  } catch (error) {
    console.error('Analytics tutorial_complete error:', error);
  }
};

// カスタムイベント（汎用）
export const logCustomEvent = async (
  eventName: string,
  params?: Record<string, string | number | boolean>
) => {
  if (!isNative) return;

  try {
    await FirebaseAnalytics.logEvent({
      name: eventName,
      params: params || {},
    });
  } catch (error) {
    console.error(`Analytics ${eventName} error:`, error);
  }
};

// Analytics コレクションの有効/無効
export const setAnalyticsEnabled = async (enabled: boolean) => {
  if (!isNative) return;

  try {
    await FirebaseAnalytics.setEnabled({ enabled });
  } catch (error) {
    console.error('Analytics setEnabled error:', error);
  }
};

// Firebase App Instance ID を取得（RevenueCat連携用）
export const getAppInstanceId = async (): Promise<string | null> => {
  if (!isNative) return null;

  try {
    const result = await FirebaseAnalytics.getAppInstanceId();
    return result.appInstanceId ?? null;
  } catch (error) {
    console.error('Analytics getAppInstanceId error:', error);
    return null;
  }
};
