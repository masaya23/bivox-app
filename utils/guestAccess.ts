import type { AuthUser } from '@/types/auth';

export const GUEST_LOCK_LABEL = '無料登録';
export const GUEST_ALLOWED_GRADE = 'junior-high-1';
export const GUEST_ALLOWED_UNIT_ID = 'unit1';
export const GUEST_ALLOWED_MAX_PART = 3;

export function isGuestUser(user?: Pick<AuthUser, 'provider'> | null): boolean {
  return user?.provider === 'anonymous';
}

export function canGuestAccessGrade(grade: string): boolean {
  return grade === GUEST_ALLOWED_GRADE;
}

export function canGuestAccessUnit(unitId: string): boolean {
  return unitId === GUEST_ALLOWED_UNIT_ID;
}

export function canGuestAccessPart(unitId: string, partNumber: number): boolean {
  return canGuestAccessUnit(unitId) && partNumber <= GUEST_ALLOWED_MAX_PART;
}

export function canGuestAccessMode(mode: string): boolean {
  return mode === 'tutorial' || mode === 'shadowing';
}
