import { getAllUnits } from '@/utils/units';

// 静的エクスポート用にすべてのユニットIDとパートIDの組み合わせを事前生成
export function generateStaticParams() {
  const units = getAllUnits();
  const params: { unitId: string; partId: string }[] = [];
  for (const unit of units) {
    for (const part of unit.parts) {
      params.push({ unitId: unit.id, partId: part.id });
    }
  }
  return params;
}
