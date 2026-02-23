'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import {
  AuthUser,
  AuthError,
  AuthErrorCode,
  TrialStatus,
  isAdminEmail,
  verifyAdminSecretKey,
} from '@/types/auth';
import {
  canUseTrial,
  startTrial,
  getCurrentTrialStatus,
  preserveTrialHistoryOnDeletion,
  isDisposableEmail,
} from '@/utils/trialPrevention';
import { logSignUp, logLogin, setUserId } from '@/utils/analytics';
import {
  signUpWithEmail,
  signInWithEmail,
  signOut as firebaseSignOut,
  onAuthStateChange,
  isFirebaseConfigured,
  resendVerificationEmail,
} from '@/lib/firebase';
import type { User as FirebaseUser } from 'firebase/auth';

// ローカルストレージキー
const AUTH_KEY = 'englishapp_auth';
const AUTH_USER_KEY = 'englishapp_auth_user';
const REGISTERED_EMAILS_KEY = 'englishapp_registered_emails';
const MASTER_MODE_KEY = 'englishapp_master_mode';

interface AuthContextType {
  // ユーザー状態
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isMaster: boolean;
  isAdminEmailMatch: boolean;
  isEmailVerified: boolean;

  // トライアル状態
  trialStatus: TrialStatus;

  // 認証アクション
  signUp: (email: string, password: string) => Promise<{ success: boolean; error?: AuthError; needsVerification?: boolean }>;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: AuthError; needsVerification?: boolean }>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  resendVerification: () => Promise<{ success: boolean; error?: string }>;

  // トライアル開始
  startFreeTrial: () => Promise<{ success: boolean; error?: AuthError }>;

  // マスターモード
  activateMasterMode: (secretKey: string) => { success: boolean; message: string };
  deactivateMasterMode: () => void;

  // デバッグ用
  resetAuth: () => void;

  // Firebase使用中かどうか
  useFirebase: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMasterMode, setIsMasterMode] = useState(false);
  const [useFirebase, setUseFirebase] = useState(false);
  const [trialStatus, setTrialStatus] = useState<TrialStatus>({
    hasUsedTrial: false,
    isCurrentlyInTrial: false,
    trialStartDate: null,
    trialEndDate: null,
    daysRemaining: 0,
  });

  // Firebase認証状態の監視
  useEffect(() => {
    const firebaseEnabled = isFirebaseConfigured();
    setUseFirebase(firebaseEnabled);

    if (firebaseEnabled) {
      // Firebase認証を使用
      const unsubscribe = onAuthStateChange((fbUser) => {
        if (fbUser) {
          const authUser: AuthUser = {
            id: fbUser.uid,
            email: fbUser.email || '',
            emailHash: fbUser.uid,
            provider: 'email',
            createdAt: fbUser.metadata.creationTime || new Date().toISOString(),
            isEmailVerified: fbUser.emailVerified,
            isMaster: false,
            linkedProviders: ['email'],
          };
          setUser(authUser);
          setFirebaseUser(fbUser);

          // マスターモードの復元
          const storedMasterMode = localStorage.getItem(MASTER_MODE_KEY);
          if (storedMasterMode === 'true' && isAdminEmail(authUser.email)) {
            setIsMasterMode(true);
          }
        } else {
          setUser(null);
          setFirebaseUser(null);
        }
        setTrialStatus(getCurrentTrialStatus());
        setIsLoading(false);
      });

      return () => unsubscribe();
    } else {
      // ローカルストレージ認証（フォールバック）
      loadLocalUser();
    }
  }, []);

  // ローカルストレージからユーザーを読み込む（フォールバック）
  const loadLocalUser = () => {
    try {
      const newAuthData = localStorage.getItem(AUTH_KEY);
      if (newAuthData) {
        const parsed = JSON.parse(newAuthData);
        if (parsed.isAuthenticated && parsed.user) {
          const authUser: AuthUser = {
            id: parsed.user.id,
            email: parsed.user.email,
            emailHash: parsed.user.email,
            provider: parsed.user.provider || 'email',
            createdAt: parsed.user.createdAt,
            isEmailVerified: true,
            isMaster: false,
            linkedProviders: parsed.user.linkedProviders || ['email'],
          };
          setUser(authUser);

          const storedMasterMode = localStorage.getItem(MASTER_MODE_KEY);
          if (storedMasterMode === 'true' && isAdminEmail(authUser.email)) {
            setIsMasterMode(true);
          }
        }
      } else {
        const stored = localStorage.getItem(AUTH_USER_KEY);
        if (stored) {
          const parsedUser = JSON.parse(stored);
          if (!parsedUser.linkedProviders) {
            parsedUser.linkedProviders = [parsedUser.provider || 'email'];
          }
          setUser(parsedUser);

          const storedMasterMode = localStorage.getItem(MASTER_MODE_KEY);
          if (storedMasterMode === 'true' && isAdminEmail(parsedUser.email)) {
            setIsMasterMode(true);
          }
        }
      }
      setTrialStatus(getCurrentTrialStatus());
    } catch {
      console.warn('Failed to load auth state');
    } finally {
      setIsLoading(false);
    }
  };

  // ユーザー保存（ローカルストレージ用）
  const saveLocalUser = useCallback((newUser: AuthUser | null) => {
    if (newUser) {
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(newUser));
    } else {
      localStorage.removeItem(AUTH_USER_KEY);
    }
    setUser(newUser);
  }, []);

  // サインアップ
  const signUp = useCallback(async (
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: AuthError; needsVerification?: boolean }> => {
    // 使い捨てメールチェック
    if (isDisposableEmail(email)) {
      return {
        success: false,
        error: {
          code: 'EMAIL_ALREADY_EXISTS' as AuthErrorCode,
          message: '使い捨てメールアドレスは使用できません。',
        },
      };
    }

    if (useFirebase) {
      // Firebase認証
      const result = await signUpWithEmail(email, password);
      if (result.success && result.user) {
        logSignUp('email');
        setUserId(result.user.uid);
        return { success: true, needsVerification: true };
      }
      return {
        success: false,
        error: {
          code: 'UNKNOWN' as AuthErrorCode,
          message: result.error || '登録に失敗しました',
        },
      };
    } else {
      // ローカルストレージ認証（フォールバック）
      const usersData = localStorage.getItem('englishapp_users');
      const users = usersData ? JSON.parse(usersData) : {};

      if (users[email]) {
        return {
          success: false,
          error: {
            code: 'EMAIL_ALREADY_EXISTS' as AuthErrorCode,
            message: 'このメールアドレスは既に登録されています。',
          },
        };
      }

      const newUser: AuthUser = {
        id: `user_${Date.now()}`,
        email,
        emailHash: email,
        provider: 'email',
        createdAt: new Date().toISOString(),
        isEmailVerified: true, // ローカルでは即座に認証済み
        isMaster: false,
        linkedProviders: ['email'],
      };

      // ユーザー情報を保存
      users[email] = { ...newUser, password };
      localStorage.setItem('englishapp_users', JSON.stringify(users));

      // 認証情報を保存
      const authData = {
        isAuthenticated: true,
        user: newUser,
        loginAt: new Date().toISOString(),
      };
      localStorage.setItem(AUTH_KEY, JSON.stringify(authData));

      saveLocalUser(newUser);
      logSignUp('email');
      setUserId(newUser.id);

      return { success: true };
    }
  }, [useFirebase, saveLocalUser]);

  // サインイン
  const signIn = useCallback(async (
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: AuthError; needsVerification?: boolean }> => {
    if (useFirebase) {
      // Firebase認証
      const result = await signInWithEmail(email, password);
      if (result.success && result.user) {
        logLogin('email');
        setUserId(result.user.uid);

        // メール未認証の場合
        if (!result.emailVerified) {
          return { success: true, needsVerification: true };
        }

        return { success: true };
      }
      return {
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS' as AuthErrorCode,
          message: result.error || 'ログインに失敗しました',
        },
      };
    } else {
      // ローカルストレージ認証（フォールバック）
      const usersData = localStorage.getItem('englishapp_users');
      const users = usersData ? JSON.parse(usersData) : {};
      const storedUser = users[email];

      if (!storedUser || storedUser.password !== password) {
        return {
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS' as AuthErrorCode,
            message: 'メールアドレスまたはパスワードが正しくありません。',
          },
        };
      }

      const authUser: AuthUser = {
        id: storedUser.id,
        email: storedUser.email,
        emailHash: storedUser.email,
        provider: 'email',
        createdAt: storedUser.createdAt,
        isEmailVerified: true,
        isMaster: false,
        linkedProviders: ['email'],
      };

      const authData = {
        isAuthenticated: true,
        user: authUser,
        loginAt: new Date().toISOString(),
      };
      localStorage.setItem(AUTH_KEY, JSON.stringify(authData));

      saveLocalUser(authUser);
      setTrialStatus(getCurrentTrialStatus());
      localStorage.removeItem(MASTER_MODE_KEY);
      setIsMasterMode(false);

      logLogin('email');
      setUserId(authUser.id);

      return { success: true };
    }
  }, [useFirebase, saveLocalUser]);

  // サインアウト
  const signOut = useCallback(async () => {
    if (useFirebase) {
      await firebaseSignOut();
    }
    saveLocalUser(null);
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(MASTER_MODE_KEY);
    setIsMasterMode(false);
    setUserId(null);
  }, [useFirebase, saveLocalUser]);

  // 確認メール再送信
  const resendVerification = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (useFirebase) {
      return await resendVerificationEmail();
    }
    return { success: true }; // ローカルでは不要
  }, [useFirebase]);

  // マスターモード有効化
  const activateMasterMode = useCallback((secretKey: string): { success: boolean; message: string } => {
    if (!user) {
      return { success: false, message: 'ログインが必要です。' };
    }

    if (!isAdminEmail(user.email)) {
      return { success: false, message: '管理者権限がありません。' };
    }

    if (!verifyAdminSecretKey(secretKey)) {
      return { success: false, message: '認証キーが正しくありません。' };
    }

    setIsMasterMode(true);
    localStorage.setItem(MASTER_MODE_KEY, 'true');

    const updatedUser = { ...user, isMaster: true };
    if (!useFirebase) {
      saveLocalUser(updatedUser);
    }
    setUser(updatedUser);

    return { success: true, message: 'マスターモードが有効になりました。' };
  }, [user, useFirebase, saveLocalUser]);

  // マスターモード無効化
  const deactivateMasterMode = useCallback(() => {
    setIsMasterMode(false);
    localStorage.removeItem(MASTER_MODE_KEY);

    if (user) {
      const updatedUser = { ...user, isMaster: false };
      if (!useFirebase) {
        saveLocalUser(updatedUser);
      }
      setUser(updatedUser);
    }
  }, [user, useFirebase, saveLocalUser]);

  // アカウント削除
  const deleteAccount = useCallback(async () => {
    if (user) {
      await preserveTrialHistoryOnDeletion(user.email);
      if (useFirebase) {
        // Firebase側の削除は別途実装が必要
        await firebaseSignOut();
      }
      saveLocalUser(null);
    }
  }, [user, useFirebase, saveLocalUser]);

  // 無料トライアル開始
  const startFreeTrial = useCallback(async (): Promise<{ success: boolean; error?: AuthError }> => {
    if (!user) {
      return {
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS' as AuthErrorCode,
          message: 'ログインが必要です。',
        },
      };
    }

    const { canUse, reason } = await canUseTrial(user.email);
    if (!canUse) {
      return {
        success: false,
        error: {
          code: 'TRIAL_ALREADY_USED' as AuthErrorCode,
          message: reason || 'トライアルは既に利用済みです。',
        },
      };
    }

    await startTrial(user.email, user.provider);
    setTrialStatus(getCurrentTrialStatus());

    return { success: true };
  }, [user]);

  // デバッグ用リセット
  const resetAuth = useCallback(() => {
    localStorage.removeItem(AUTH_USER_KEY);
    localStorage.removeItem(REGISTERED_EMAILS_KEY);
    localStorage.removeItem(MASTER_MODE_KEY);
    localStorage.removeItem(AUTH_KEY);
    setUser(null);
    setIsMasterMode(false);
    setTrialStatus({
      hasUsedTrial: false,
      isCurrentlyInTrial: false,
      trialStartDate: null,
      trialEndDate: null,
      daysRemaining: 0,
    });
  }, []);

  const isAdminEmailMatch = user ? isAdminEmail(user.email) : false;
  const isEmailVerified = useFirebase ? (firebaseUser?.emailVerified ?? false) : true;

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    isMaster: isMasterMode,
    isAdminEmailMatch,
    isEmailVerified,
    trialStatus,
    signUp,
    signIn,
    signOut,
    deleteAccount,
    resendVerification,
    startFreeTrial,
    activateMasterMode,
    deactivateMasterMode,
    resetAuth,
    useFirebase,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
