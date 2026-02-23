'use client';

import Image from 'next/image';

interface MascotCommentProps {
  accuracyRate: number;
  className?: string;
}

interface MascotData {
  image: string;
  comment: string;
}

function getMascotData(accuracyRate: number): MascotData {
  if (accuracyRate === 100) {
    return {
      image: '/images/mascot/fox_perfect.png',
      comment: 'パーフェクト！完璧だね！この調子！',
    };
  }
  if (accuracyRate >= 80) {
    return {
      image: '/images/mascot/fox_great.png',
      comment: 'すばらしい！あと少しで満点！次も頑張ろう！',
    };
  }
  if (accuracyRate >= 60) {
    return {
      image: '/images/mascot/fox_good.png',
      comment: 'いい感じ！もう少しで満点だよ！',
    };
  }
  return {
    image: '/images/mascot/fox_nicetry.png',
    comment: 'ナイストライ！復習して次に繋げよう！',
  };
}

export default function MascotComment({ accuracyRate, className = '' }: MascotCommentProps) {
  const { image, comment } = getMascotData(accuracyRate);

  return (
    <div className={`flex items-end gap-3 ${className}`}>
      {/* キャラクター画像 */}
      <div className="flex-shrink-0 w-20 h-20 relative">
        <Image
          src={image}
          alt="マスコットキャラクター"
          fill
          className="object-contain"
          priority
        />
      </div>

      {/* 吹き出し */}
      <div className="relative bg-white rounded-2xl px-4 py-3 shadow-md border border-gray-100 max-w-[300px]">
        {/* 吹き出しの三角形 */}
        <div className="absolute left-[-8px] bottom-4 w-0 h-0 border-t-[8px] border-t-transparent border-r-[10px] border-r-white border-b-[8px] border-b-transparent" />
        <div className="absolute left-[-10px] bottom-4 w-0 h-0 border-t-[8px] border-t-transparent border-r-[10px] border-r-gray-100 border-b-[8px] border-b-transparent" style={{ zIndex: -1 }} />

        <p className="text-sm text-gray-700 font-medium leading-relaxed">
          {comment}
        </p>
      </div>
    </div>
  );
}
