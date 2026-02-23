import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import type { NextAuthConfig } from 'next-auth';

// ユーザータイプ定義
export interface AppUser {
  id: string;
  email: string;
  name?: string;
  image?: string;
  provider: string;
  isFirstLogin: boolean;
  createdAt: string;
  linkedProviders: string[];
}

// NextAuth設定
const config: NextAuthConfig = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Credentials({
      id: 'email',
      name: 'Email',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        // メール認証のロジック（後でデータベース連携）
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // デモ用: 簡易認証（本番ではDBと連携）
        const email = credentials.email as string;
        const password = credentials.password as string;

        // パスワードが6文字以上なら許可（デモ用）
        if (password.length >= 6) {
          return {
            id: email,
            email: email,
            name: email.split('@')[0],
          };
        }

        return null;
      },
    }),
  ],
  pages: {
    signIn: '/auth/login',
    newUser: '/tutorial',
    error: '/auth/error',
  },
  callbacks: {
    async signIn({ user, account }) {
      // ここでTrialHistory チェックなどを行う
      return true;
    },
    async jwt({ token, user, account, trigger }) {
      if (user) {
        token.id = user.id;
        token.provider = account?.provider || 'credentials';

        // 初回ログインかどうかをチェック
        const isFirstLogin = await checkIsFirstLogin(user.email || '');
        token.isFirstLogin = isFirstLogin;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).provider = token.provider;
        (session.user as any).isFirstLogin = token.isFirstLogin;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // 相対URLの場合はbaseUrlを追加
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      // 同一オリジンの場合はそのまま
      if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30日
  },
  trustHost: true,
};

// 初回ログインチェック（localStorageベースの簡易実装）
async function checkIsFirstLogin(email: string): Promise<boolean> {
  // サーバーサイドなのでDB/APIでチェック
  // ここでは常にfalseを返す（クライアントサイドでチェック）
  return false;
}

export const { handlers, auth, signIn, signOut } = NextAuth(config);
