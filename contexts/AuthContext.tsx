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
  deleteAccount as firebaseDeleteAccount,
  onAuthStateChange,
  isFirebaseConfigured,
  resendVerificationEmail,
  getUserCustomClaims,
} from '@/lib/firebase';
import type { User as FirebaseUser } from 'firebase/auth';

// ローカルストレージキー
const AUTH_KEY = 'englishapp_auth';
const AUTH_USER_KEY = 'englishapp_auth_user';
const REGISTERED_EMAILS_KEY = 'englishapp_registered_emails';
const MASTER_MODE_KEY = 'englishapp_master_mode';
const GUEST_USER_KEY = 'englishapp_guest_user';

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
  signInAsGuest: () => Promise<{ success: boolean; error?: AuthError }>;
  signOut: () => Promise<void>;
  deleteAccount: (password: string) => Promise<{ success: boolean; error?: string }>;
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

  const syncFirebaseAdminState = useCallback(async (fbUser: FirebaseUser, baseUser: AuthUser) => {
    try {
      const claims = await getUserCustomClaims(fbUser);
      const hasAdminClaim = claims.admin === true || claims.master === true;
      const updatedUser = { ...baseUser, isMaster: hasAdminClaim };
      setUser(updatedUser);
      setIsMasterMode(hasAdminClaim);

      if (hasAdminClaim) {
        localStorage.setItem(MASTER_MODE_KEY, 'firebase-admin');
      } else {
        localStorage.removeItem(MASTER_MODE_KEY);
      }
    } catch {
      setUser(baseUser);
      setIsMasterMode(false);
      localStorage.removeItem(MASTER_MODE_KEY);
    }
  }, []);

  // Firebase認証状態の監視
  useEffect(() => {
    const firebaseEnabled = isFirebaseConfigured();
    setUseFirebase(firebaseEnabled);

    if (firebaseEnabled) {
      // Firebase認証を使用
      const unsubscribe = onAuthStateChange((fbUser) => {
        void (async () => {
          setIsLoading(true);

          if (fbUser) {
            // Firebaseユーザーがいる場合はゲスト情報をクリア
            localStorage.removeItem(GUEST_USER_KEY);
            setFirebaseUser(fbUser);

            // キャッシュが古い場合を考慮してサーバーから最新状態を取得
            try {
              await fbUser.reload();
            } catch {
              // ネットワークエラー時はキャッシュ値で続行
            }

            if (fbUser.emailVerified) {
              const authUser: AuthUser = {
                id: fbUser.uid,
                email: fbUser.email || '',
                emailHash: fbUser.uid,
                provider: 'email',
                createdAt: fbUser.metadata.creationTime || new Date().toISOString(),
                isEmailVerified: true,
                isMaster: false,
                linkedProviders: ['email'],
              };
              await syncFirebaseAdminState(fbUser, authUser);
            } else {
              // メール未認証の場合は認証済みとして扱わない
              setUser(null);
              setIsMasterMode(false);
            }
          } else {
            // Firebaseユーザーがいない場合、ゲストユーザーをチェック
            const guestData = localStorage.getItem(GUEST_USER_KEY);
            if (guestData) {
              try {
                const guestUser = JSON.parse(guestData) as AuthUser;
                setUser(guestUser);
                setFirebaseUser(null);
                setIsMasterMode(false);
              } catch {
                setUser(null);
                setFirebaseUser(null);
                setIsMasterMode(false);
                localStorage.removeItem(GUEST_USER_KEY);
              }
            } else {
              setUser(null);
              setFirebaseUser(null);
              setIsMasterMode(false);
              localStorage.removeItem(MASTER_MODE_KEY);
            }
          }

          setTrialStatus(getCurrentTrialStatus());
          setIsLoading(false);
        })();
      });

      return () => unsubscribe();
    } else {
      // ローカルストレージ認証（フォールバック）
      loadLocalUser();
    }
  }, [syncFirebaseAdminState]);

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
        // 最新のemailVerified状態をサーバーから取得
        try {
          await result.user.reload();
        } catch {
          // ネットワークエラー時はキャッシュ値で続行
        }

        logLogin('email');
        setUserId(result.user.uid);

        // メール未認証の場合
        if (!result.user.emailVerified) {
          return { success: true, needsVerification: true };
        }

        const authUser: AuthUser = {
          id: result.user.uid,
          email: result.user.email || '',
          emailHash: result.user.uid,
          provider: 'email',
          createdAt: result.user.metadata.creationTime || new Date().toISOString(),
          isEmailVerified: result.user.emailVerified,
          isMaster: false,
          linkedProviders: ['email'],
        };

        setFirebaseUser(result.user);
        await syncFirebaseAdminState(result.user, authUser);

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
  }, [useFirebase, saveLocalUser, syncFirebaseAdminState]);

  // ゲストログイン
  const signInAsGuest = useCallback(async (): Promise<{ success: boolean; error?: AuthError }> => {
    const guestUser: AuthUser = {
      id: `guest_${Date.now()}`,
      email: '',
      emailHash: '',
      provider: 'anonymous',
      createdAt: new Date().toISOString(),
      isEmailVerified: false,
      isMaster: false,
      linkedProviders: ['anonymous'],
    };

    localStorage.setItem(GUEST_USER_KEY, JSON.stringify(guestUser));
    setUser(guestUser);
    setFirebaseUser(null);
    setIsMasterMode(false);
    setTrialStatus(getCurrentTrialStatus());
    setUserId(guestUser.id);

    return { success: true };
  }, []);

  // サインアウト
  const signOut = useCallback(async () => {
    if (useFirebase) {
      await firebaseSignOut();
    }
    saveLocalUser(null);
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(MASTER_MODE_KEY);
    localStorage.removeItem(GUEST_USER_KEY);
    setUser(null);
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

    if (useFirebase) {
      return { success: false, message: 'Firebase Custom Claimsで管理してください。' };
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
    if (useFirebase) {
      return;
    }

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
  const deleteAccount = useCallback(async (password: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: 'ログインが必要です' };
    }

    await preserveTrialHistoryOnDeletion(user.email);

    if (useFirebase) {
      const result = await firebaseDeleteAccount(password);
      if (!result.success) {
        return result;
      }
    }

    saveLocalUser(null);
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(MASTER_MODE_KEY);
    setIsMasterMode(false);
    setUserId(null);

    return { success: true };
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
    signInAsGuest,
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
