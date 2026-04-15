import { NextResponse } from 'next/server';

// Capacitorビルド（静的エクスポート）時に必要
export const dynamic = 'force-static';

export async function GET() {
  return NextResponse.json({ ok: true });
}
