import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  initializeAuth,
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  verifyBeforeUpdateEmail,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  onAuthStateChanged,
  User,
  Auth,
} from 'firebase/auth';

// Firebase設定
// 注意: これらの値はFirebase Consoleから取得してください
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || '',
};

// Firebaseアプリの初期化（重複初期化を防ぐ）
let app: FirebaseApp;
let auth: Auth;

if (typeof window !== 'undefined') {
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
    // Capacitor WebView対応: localStorageベースの永続化を明示的に設定
    auth = initializeAuth(app, {
      persistence: browserLocalPersistence,
    });
  } else {
    app = getApps()[0];
    auth = getAuth(app);
  }
  // メールを日本語で送信
  auth.languageCode = 'ja';
}

// Firebase Authが設定されているかチェック
export const isFirebaseConfigured = (): boolean => {
  return !!(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN &&
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  );
};

// アプリのベースURL（開発環境と本番環境で切り替え）
const getAppBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return 'http://localhost:3000';
};

// 新規登録（メール認証付き）
export const signUpWithEmail = async (
  email: string,
  password: string
): Promise<{ success: boolean; user?: User; error?: string }> => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // 確認メール送信時にリダイレクトURLを設定
    const actionCodeSettings = {
      url: `${getAppBaseUrl()}/auth/login?verified=true`,
      handleCodeInApp: false,
    };
    await sendEmailVerification(user, actionCodeSettings);

    return { success: true, user };
  } catch (error: unknown) {
    const firebaseError = error as { code?: string; message?: string };
    let errorMessage = '登録に失敗しました';

    switch (firebaseError.code) {
      case 'auth/email-already-in-use':
        errorMessage = 'このメールアドレスは既に登録されています';
        break;
      case 'auth/invalid-email':
        errorMessage = '無効なメールアドレスです';
        break;
      case 'auth/weak-password':
        errorMessage = 'パスワードは6文字以上で入力してください';
        break;
      default:
        errorMessage = firebaseError.message || '登録に失敗しました';
    }

    return { success: false, error: errorMessage };
  }
};

// ログイン
export const signInWithEmail = async (
  email: string,
  password: string
): Promise<{ success: boolean; user?: User; error?: string; emailVerified?: boolean }> => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    return {
      success: true,
      user,
      emailVerified: user.emailVerified,
    };
  } catch (error: unknown) {
    const firebaseError = error as { code?: string; message?: string };
    let errorMessage = 'ログインに失敗しました';

    switch (firebaseError.code) {
      case 'auth/user-not-found':
        errorMessage = 'アカウントが見つかりません';
        break;
      case 'auth/wrong-password':
        errorMessage = 'パスワードが正しくありません';
        break;
      case 'auth/invalid-email':
        errorMessage = '無効なメールアドレスです';
        break;
      case 'auth/user-disabled':
        errorMessage = 'このアカウントは無効化されています';
        break;
      case 'auth/too-many-requests':
        errorMessage = 'ログイン試行回数が多すぎます。しばらく待ってから再試行してください';
        break;
      case 'auth/invalid-credential':
        errorMessage = 'メールアドレスまたはパスワードが正しくありません';
        break;
      default:
        errorMessage = firebaseError.message || 'ログインに失敗しました';
    }

    return { success: false, error: errorMessage };
  }
};

// ログアウト
export const signOut = async (): Promise<void> => {
  await firebaseSignOut(auth);
};

// 確認メール再送信
export const resendVerificationEmail = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      return { success: false, error: 'ログインが必要です' };
    }

    // 確認メール送信時にリダイレクトURLを設定
    const actionCodeSettings = {
      url: `${getAppBaseUrl()}/auth/login?verified=true`,
      handleCodeInApp: false,
    };
    await sendEmailVerification(user, actionCodeSettings);
    return { success: true };
  } catch (error: unknown) {
    const firebaseError = error as { code?: string; message?: string };
    return {
      success: false,
      error: firebaseError.message || '確認メールの送信に失敗しました',
    };
  }
};

// パスワードリセットメール送信
export const sendPasswordReset = async (
  email: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true };
  } catch (error: unknown) {
    const firebaseError = error as { code?: string; message?: string };
    let errorMessage = 'パスワードリセットメールの送信に失敗しました';

    switch (firebaseError.code) {
      case 'auth/user-not-found':
        errorMessage = 'このメールアドレスで登録されたアカウントが見つかりません';
        break;
      case 'auth/invalid-email':
        errorMessage = '無効なメールアドレスです';
        break;
      default:
        errorMessage = firebaseError.message || errorMessage;
    }

    return { success: false, error: errorMessage };
  }
};

// メールアドレス変更（再認証が必要、新しいメールに確認メールを送信）
export const changeEmail = async (
  currentPassword: string,
  newEmail: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const user = auth.currentUser;
    if (!user || !user.email) {
      return { success: false, error: 'ログインが必要です' };
    }

    // 再認証
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);

    // 新しいメールアドレスに確認メールを送信
    // ユーザーがメール内のリンクをクリックするとメールアドレスが更新される
    await verifyBeforeUpdateEmail(user, newEmail);

    return { success: true };
  } catch (error: unknown) {
    const firebaseError = error as { code?: string; message?: string };
    let errorMessage = 'メールアドレスの変更に失敗しました';

    switch (firebaseError.code) {
      case 'auth/wrong-password':
        errorMessage = 'パスワードが正しくありません';
        break;
      case 'auth/invalid-credential':
        errorMessage = 'パスワードが正しくありません';
        break;
      case 'auth/email-already-in-use':
        errorMessage = 'このメールアドレスは既に使用されています';
        break;
      case 'auth/invalid-email':
        errorMessage = '無効なメールアドレスです';
        break;
      case 'auth/requires-recent-login':
        errorMessage = 'セキュリティのため、再ログインが必要です';
        break;
      case 'auth/operation-not-allowed':
        errorMessage = 'この操作は許可されていません。Firebase Consoleで設定を確認してください';
        break;
      default:
        errorMessage = firebaseError.message || errorMessage;
    }

    return { success: false, error: errorMessage };
  }
};

// パスワード変更（再認証が必要）
export const changePassword = async (
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const user = auth.currentUser;
    if (!user || !user.email) {
      return { success: false, error: 'ログインが必要です' };
    }

    // 再認証
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);

    // パスワード更新
    await updatePassword(user, newPassword);

    return { success: true };
  } catch (error: unknown) {
    const firebaseError = error as { code?: string; message?: string };
    let errorMessage = 'パスワードの変更に失敗しました';

    switch (firebaseError.code) {
      case 'auth/wrong-password':
        errorMessage = '現在のパスワードが正しくありません';
        break;
      case 'auth/weak-password':
        errorMessage = '新しいパスワードは6文字以上で入力してください';
        break;
      case 'auth/requires-recent-login':
        errorMessage = 'セキュリティのため、再ログインが必要です';
        break;
      default:
        errorMessage = firebaseError.message || errorMessage;
    }

    return { success: false, error: errorMessage };
  }
};

// 認証状態の監視
export const onAuthStateChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

// 現在のユーザーを取得
export const getCurrentUser = (): User | null => {
  return auth?.currentUser || null;
};

// Authインスタンスをエクスポート
export { auth };
