import type { TabFilter } from '@/types/unit';

type GradeTheme = {
  label: string;
  gradient: string;
};

export const GRADE_THEMES: Record<TabFilter, GradeTheme> = {
  'junior-high-1': { label: 'Unit 1', gradient: 'from-[#1E90FF] to-[#1E90FF]' },
  'junior-high-2': { label: 'Unit 2', gradient: 'from-[#2ECC71] to-[#2ECC71]' },
  'junior-high-3': { label: 'Unit 3', gradient: 'from-[#FF4757] to-[#FF4757]' },
  all: { label: '全てのUnit', gradient: 'from-[#3949AB] to-[#3949AB]' },
};

export const GRADE_TABS: { id: TabFilter; label: string; gradient: string }[] = [
  { id: 'junior-high-1', ...GRADE_THEMES['junior-high-1'] },
  { id: 'junior-high-2', ...GRADE_THEMES['junior-high-2'] },
  { id: 'junior-high-3', ...GRADE_THEMES['junior-high-3'] },
  { id: 'all', ...GRADE_THEMES.all },
];

export const isGradeId = (grade: string | null): grade is TabFilter => {
  return grade !== null && Object.prototype.hasOwnProperty.call(GRADE_THEMES, grade);
};

export const getGradeIdFromPartId = (partId?: string | null): TabFilter | null => {
  if (!partId) return null;
  if (partId.startsWith('unit1')) return 'junior-high-1';
  if (partId.startsWith('unit2')) return 'junior-high-2';
  if (partId.startsWith('unit3')) return 'junior-high-3';
  return null;
};

const resolveGradeId = (gradeId?: string | null, partId?: string | null): TabFilter => {
  if (gradeId && isGradeId(gradeId)) return gradeId;
  const inferred = getGradeIdFromPartId(partId);
  return inferred || 'all';
};

export const getGradeGradient = (gradeId?: string | null, partId?: string | null): string => {
  return GRADE_THEMES[resolveGradeId(gradeId, partId)].gradient;
};

export const getPartBadgeClassName = (gradeId?: string | null, partId?: string | null): string => {
  const gradient = getGradeGradient(gradeId, partId);
  return `px-2 py-0.5 bg-gradient-to-r ${gradient} text-white text-xs font-bold rounded-full`;
};

export const getLessonPartBadgeClassName = (): string => {
  return 'px-2 py-0.5 bg-[#E3F2FD] text-[#1E90FF] text-xs font-bold rounded-full';
};
