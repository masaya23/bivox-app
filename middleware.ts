import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 認証が必要なパス
const protectedPaths = [
  '/home',
  '/units',
  '/train',
  '/conversation',
  '/settings',
  '/study-log',
  '/help',
];

// 認証済みユーザーがアクセスできないパス（ログイン・登録ページ）
const authPaths = [
  '/auth/login',
  '/auth/register',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // API ルートはスキップ
  if (pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  // 静的ファイルはスキップ
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // 注意: ミドルウェアではlocalStorageにアクセスできないため、
  // クライアントサイドでの認証チェックが必要
  // このミドルウェアは主にサーバーサイドのセッション管理用

  // NextAuth.jsのセッションをチェックする場合は以下のようにする
  // const session = await auth();
  // ただし、現在はlocalStorageベースの認証を使用しているため、
  // クライアントサイドでのリダイレクトを行う

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};
