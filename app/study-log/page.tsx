'use client';

import { useEffect, useState } from 'react';
import MobileLayout, { PageHeader } from '@/components/MobileLayout';
import { getStreakData, getStudiedDates, StreakData } from '@/utils/streak';
import StreakCalendar from '@/components/log/StreakCalendar';
import LearningTimeWidget from '@/components/log/LearningTimeWidget';
import LifeRecoveryWidget from '@/components/life/LifeRecoveryWidget';
import { getTodaySessionLogs, SessionLogItem } from '@/utils/sessionLog';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useAuth } from '@/contexts/AuthContext';
import { useAppRouter } from '@/hooks/useAppRouter';
import { isGuestUser } from '@/utils/guestAccess';

// ライフ設定のローカルストレージキー
const LIFE_SETTINGS_KEY = 'englishapp_life_settings';

export default function StudyLogPage() {
  const router = useAppRouter();
  const { user } = useAuth();
  const [streakData, setStreakData] = useState<StreakData | null>(null);
  const [studiedDates, setStudiedDates] = useState<Date[]>([]);
  const [todaySessions, setTodaySessions] = useState<SessionLogItem[]>([]);
  const [showLifeWidget, setShowLifeWidget] = useState(true);
  const { tier } = useSubscription();
  const isGuest = isGuestUser(user);

  // データ読み込み関数
  const loadData = () => {
    setStreakData(getStreakData());
    setStudiedDates(getStudiedDates());
    setTodaySessions(getTodaySessionLogs());

    // ライフ設定を読み込む
    try {
      const saved = localStorage.getItem(LIFE_SETTINGS_KEY);
      if (saved) {
        const settings = JSON.parse(saved);
        setShowLifeWidget(settings.showOnStudyLog !== false);
      }
    } catch {
      // デフォルト設定を使用
    }
  };

  // 初回マウント時 + ページ復帰時にデータを再読み込み
  useEffect(() => {
    if (isGuest) {
      router.replace('/auth/register');
      return;
    }

    loadData();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadData();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isGuest, router]);

  if (isGuest) {
    return null;
  }

  return (
    <MobileLayout showBottomNav={true} activeTab="study-log" requireAuth={true}>
      <PageHeader
        title="学習ログ"
        backLink="/"
        backLabel="ホーム"
        gradient="bg-white border-b border-gray-100"
        titleClassName="text-[#3E2723]"
        backLinkClassName="text-[#5D4037] hover:text-[#3E2723]"
      />

      <div className="px-4 pt-4">
        {/* 学習時間ウィジェット */}
        <div className="mb-4">
          <LearningTimeWidget />
        </div>

        {/* スタミナ回復ウィジェット（無料プランかつ設定でONの場合） */}
        {tier === 'free' && showLifeWidget && (
          <div className="mb-4">
            <LifeRecoveryWidget />
          </div>
        )}

        {/* 統計カード（2x2グリッド） */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {/* 連続学習日数 */}
          <div className="bg-white rounded-2xl shadow-lg p-4 border-l-4 border-orange-400">
            <p className="text-sm text-gray-500 mb-1">連続学習日数</p>
            <p className="text-xs text-gray-400 mb-2">最長 {streakData?.longestStreak || 0}日</p>
            <div className="flex items-baseline justify-end">
              <span className="text-4xl font-black text-gray-800">{streakData?.currentStreak || 0}</span>
              <span className="text-lg text-gray-500 ml-1">日</span>
            </div>
          </div>

          {/* 学習日数 */}
          <div className="bg-white rounded-2xl shadow-lg p-4 border-l-4 border-teal-400">
            <p className="text-sm text-gray-500 mb-1">学習日数</p>
            <p className="text-xs text-gray-400 mb-2">&nbsp;</p>
            <div className="flex items-baseline justify-end">
              <span className="text-4xl font-black text-gray-800">{streakData?.history?.length || 0}</span>
              <span className="text-lg text-gray-500 ml-1">日</span>
            </div>
          </div>

          {/* 本日の問題数 */}
          <div className="bg-white rounded-2xl shadow-lg p-4 border-l-4 border-blue-400">
            <p className="text-sm text-gray-500 mb-1">本日の問題数</p>
            <div className="flex items-baseline justify-end mt-4">
              <span className="text-4xl font-black text-gray-800">{streakData?.todayQuestions || 0}</span>
              <span className="text-lg text-gray-500 ml-1">問</span>
            </div>
          </div>

          {/* 合計問題数 */}
          <div className="bg-white rounded-2xl shadow-lg p-4 border-l-4 border-purple-400">
            <p className="text-sm text-gray-500 mb-1">合計問題数</p>
            <div className="flex items-baseline justify-end mt-4">
              <span className="text-4xl font-black text-gray-800">{streakData?.totalQuestions || 0}</span>
              <span className="text-lg text-gray-500 ml-1">問</span>
            </div>
          </div>

          {/* 本日のセッション */}
          <div className="bg-white rounded-2xl shadow-lg p-4 border-l-4 border-green-400">
            <p className="text-sm text-gray-500 mb-1">本日のセッション</p>
            <div className="flex items-baseline justify-end mt-4">
              <span className="text-4xl font-black text-gray-800">{streakData?.todaySessions || 0}</span>
              <span className="text-lg text-gray-500 ml-1">回</span>
            </div>
          </div>

          {/* 合計セッション */}
          <div className="bg-white rounded-2xl shadow-lg p-4 border-l-4 border-pink-400">
            <p className="text-sm text-gray-500 mb-1">合計セッション</p>
            <div className="flex items-baseline justify-end mt-4">
              <span className="text-4xl font-black text-gray-800">{streakData?.totalSessions || 0}</span>
              <span className="text-lg text-gray-500 ml-1">回</span>
            </div>
          </div>
        </div>

        {/* ストリークカレンダー */}
        <div className="mb-4">
          <StreakCalendar studiedDates={studiedDates} />
        </div>

        {/* 本日の学習 */}
        <div className="bg-white rounded-2xl shadow-lg p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-700">本日の学習</h2>
            <a href="/study-log/history" className="text-teal-500 text-sm font-semibold">
              すべてみる
            </a>
          </div>
          {todaySessions.length === 0 ? (
            <p className="text-center text-gray-400 py-8">学習記録がありません</p>
          ) : (
            <div className="space-y-2">
              {todaySessions.map((session, index) => {
                const isMinutes = session.unit === 'minutes';
                // 表示テキストを構築: "中学1年 Part1 ベーシック" or "AIとフリー英会話"
                const parts: string[] = [];
                if (session.grade) parts.push(session.grade);
                if (session.partLabel) parts.push(session.partLabel);
                parts.push(session.mode);
                const label = parts.join('  ');
                const countText = isMinutes
                  ? `${session.questions}分`
                  : `${session.questions}問`;

                return (
                  <div
                    key={`${session.date}-${index}`}
                    className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5"
                  >
                    <span className="text-sm font-semibold text-gray-700">{label}</span>
                    <span className="text-sm font-semibold text-gray-500 ml-2 shrink-0">{countText}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </MobileLayout>
  );
}
