import { getAllUnits } from '@/utils/units';

// 静的エクスポート用にすべてのユニットIDを事前生成
export function generateStaticParams() {
  const units = getAllUnits();
  return units.map((unit) => ({
    unitId: unit.id,
  }));
}

export default function UnitLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
