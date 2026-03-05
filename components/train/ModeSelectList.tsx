'use client';

import ModeSelectCard from './ModeSelectCard';

interface ModeSelectListProps {
  unitId: string;
  partId: string;
  shuffleMode: boolean;
  grade?: string;
}

export default function ModeSelectList({ unitId, partId, shuffleMode, grade }: ModeSelectListProps) {
  const gradeParam = grade ? `&grade=${grade}` : '';
  const baseHref = `/units/${unitId}/parts/${partId}?shuffle=${shuffleMode}${gradeParam}`;

  return (
    <div className="space-y-3">
      {/* ベーシックモード */}
      <ModeSelectCard
        mode="shadowing"
        href={`${baseHref}&mode=shadowing`}
        icon="BS"
        iconBg="bg-green-500"
        title="ベーシックモード"
        description="音声を聞いて真似する基本トレーニング"
        features={[
          '日本語 → 一時停止 → 英語音声',
          '一時停止の間に声に出して英作文する',
          '「分かる」から「出来る」に',
        ]}
        gradient="bg-gradient-to-r from-green-50 to-blue-50"
        borderColor="border-green-200"
        accentColor="text-green-600"
      />

      {/* スピーキングモード */}
      <ModeSelectCard
        mode="speaking"
        href={`${baseHref}&mode=speaking`}
        icon="SP"
        iconBg="bg-orange-500"
        title="スピーキングモード"
        description="音声入力で自動判定し間違いは解説してくれるモード"
        features={[
          '日本語 → 音声入力 → 自動判定',
          '間違いの分析と解説',
          'より理解力を深める',
        ]}
        gradient="bg-gradient-to-r from-orange-50 to-amber-50"
        borderColor="border-orange-200"
        accentColor="text-orange-600"
      />

      {/* AI応用ドリルモード */}
      <ModeSelectCard
        mode="ai-drill"
        href={`${baseHref}&mode=ai-drill`}
        icon="AI"
        iconBg="bg-purple-500"
        title="AI応用ドリル"
        description="AIが生成する問題で応用力を鍛える"
        features={[
          'スピーキングモードの応用',
          '同じ文法レベルで新問題生成',
          'AIの出題によりマンネリを防ぐ',
        ]}
        gradient="bg-gradient-to-r from-purple-50 to-pink-50"
        borderColor="border-purple-200"
        accentColor="text-purple-600"
      />
    </div>
  );
}
