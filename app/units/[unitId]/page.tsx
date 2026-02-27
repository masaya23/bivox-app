'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAppRouter } from '@/hooks/useAppRouter';
import { getUnitById } from '@/utils/units';

export default function UnitDetailPage() {
  const params = useParams();
  const router = useAppRouter();

  useEffect(() => {
    const unitId = params.unitId as string;
    const unit = getUnitById(unitId);
    const target = unit ? `/units?grade=${unit.grade}` : '/units';
    router.replace(target);
  }, [params, router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-gray-500">移動中...</div>
    </div>
  );
}
