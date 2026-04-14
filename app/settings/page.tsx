'use client';

import { useState, useRef, useEffect } from 'react';
import type { ReactNode, ButtonHTMLAttributes } from 'react';
import { useAppRouter } from '@/hooks/useAppRouter';
import MobileLayout from '@/components/MobileLayout';
import { BudouXText } from '@/components/BudouXText';
import PremiumSection from '@/components/subscription/PremiumSection';
import {
  downloadBackup,
  importData,
  resetAllLocalData,
  BackupData,
} from '@/utils/backup';
import { useSubscription, PLAN_NAMES } from '@/contexts/SubscriptionContext';
import { useAd } from '@/contexts/AdContext';
import { useUsageLimit, USAGE_LIMITS } from '@/contexts/UsageLimitContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLife } from '@/contexts/LifeContext';
import { useRevenueCat } from '@/hooks/useRevenueCat';
import { useAdMob } from '@/hooks/useAdMob';
import { clearTrialHistory } from '@/utils/trialPrevention';
import { isGuestUser } from '@/utils/guestAccess';
import HardNavLink from '@/components/HardNavLink';
import { changeEmail as firebaseChangeEmail, changePassword as firebaseChangePassword } from '@/lib/firebase';
import { TRIAL_CONFIG } from '@/types/auth';
import { LIFE_CONFIG, formatTimeRemaining } from '@/types/life';
// ────────────────────────────────────────────
// 共通UIパーツ（落ち着いたカードUI）
// ────────────────────────────────────────────

type IconProps = { className?: string };

const ICON_STROKE = 1.8;
const ICON_SIZE = 'w-6 h-6';
const ICON_BASE = 'text-[#6D4C41]';
const ICON_DANGER = 'text-red-500';

/** セクション見出し */
function SectionHeader({ title }: { title: string }) {
  return (
    <BudouXText
      as="p"
      text={title}
      className="px-4 pt-6 pb-2 text-[11px] font-semibold text-gray-500 tracking-wide"
    />
  );
}

/** セクション見出し（補足テキスト付き） */
function SectionFooter({ text }: { text: string }) {
  return (
    <BudouXText
      as="p"
      text={text}
      className="px-4 pt-2 pb-1 text-[11px] text-gray-400"
    />
  );
}

/** リストアイテム間の区切り線 */
function Divider() {
  return <div className="h-px bg-gray-200/80" />;
}

/** カードコンテナ */
function SectionCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`mx-4 rounded-2xl bg-white shadow-[0_4px_10px_rgba(0,0,0,0.05)] overflow-hidden ${className}`}>
      {children}
    </div>
  );
}

/** 行の左側（アイコン + テキスト） */
function RowLeading({
  icon,
  title,
  subtitle,
  titleClassName = 'text-gray-900',
}: {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  titleClassName?: string;
}) {
  return (
    <div className="flex items-center gap-3 min-w-0">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F8F6F4]">
        {icon}
      </div>
      <div className="min-w-0">
        <BudouXText as="p" text={title} className={`text-sm font-medium ${titleClassName}`} />
        {subtitle && <BudouXText as="p" text={subtitle} className="text-xs text-gray-500 truncate" />}
      </div>
    </div>
  );
}

/** ボタン行 */
function RowButton({
  children,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`w-full px-4 py-3 flex items-center justify-between text-left active:bg-gray-50 transition-colors ${className}`}
    >
      {children}
    </button>
  );
}

/** 固定表示行 */
function RowBase({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`px-4 py-3 flex items-center justify-between ${className}`}>
      {children}
    </div>
  );
}

/** リンク行 */
function RowLink({
  children,
  href,
  className = '',
}: {
  children: ReactNode;
  href: string;
  className?: string;
}) {
  return (
    <HardNavLink
      href={href}
      className={`block px-4 py-3 flex items-center justify-between text-left active:bg-gray-50 transition-colors ${className}`}
    >
      {children}
    </HardNavLink>
  );
}

/** Chevron Right アイコン */
function ChevronRight() {
  return (
    <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

function IconMail({ className = '' }: IconProps) {
  return (
    <svg className={`${ICON_SIZE} ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={ICON_STROKE} strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="6" width="16" height="12" rx="2" />
      <path d="M4 7l8 6 8-6" />
    </svg>
  );
}

function IconLock({ className = '' }: IconProps) {
  return (
    <svg className={`${ICON_SIZE} ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={ICON_STROKE} strokeLinecap="round" strokeLinejoin="round">
      <rect x="6" y="10" width="12" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 018 0v3" />
    </svg>
  );
}

function IconLogout({ className = '' }: IconProps) {
  return (
    <svg className={`${ICON_SIZE} ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={ICON_STROKE} strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 7H6a2 2 0 00-2 2v6a2 2 0 002 2h4" />
      <path d="M15 12h7" />
      <path d="M19 9l3 3-3 3" />
    </svg>
  );
}

function IconDatabase({ className = '' }: IconProps) {
  return (
    <svg className={`${ICON_SIZE} ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={ICON_STROKE} strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="6" rx="8" ry="3" />
      <path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6" />
      <path d="M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
    </svg>
  );
}

function IconDownload({ className = '' }: IconProps) {
  return (
    <svg className={`${ICON_SIZE} ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={ICON_STROKE} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v10" />
      <path d="M8 9l4 4 4-4" />
      <path d="M4 14v5h16v-5" />
    </svg>
  );
}

function IconUpload({ className = '' }: IconProps) {
  return (
    <svg className={`${ICON_SIZE} ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={ICON_STROKE} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21V11" />
      <path d="M8 15l4-4 4 4" />
      <path d="M4 10V5h16v5" />
    </svg>
  );
}

function IconChart({ className = '' }: IconProps) {
  return (
    <svg className={`${ICON_SIZE} ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={ICON_STROKE} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19h16" />
      <path d="M7 16v-6" />
      <path d="M12 19v-10" />
      <path d="M17 19v-4" />
    </svg>
  );
}

function IconBell({ className = '' }: IconProps) {
  return (
    <svg className={`${ICON_SIZE} ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={ICON_STROKE} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9a6 6 0 0112 0v3.2a2 2 0 00.6 1.4L20 16H4l1.4-2.4A2 2 0 006 12.2V9z" />
      <path d="M9 17a3 3 0 006 0" />
    </svg>
  );
}

function IconChat({ className = '' }: IconProps) {
  return (
    <svg className={`${ICON_SIZE} ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={ICON_STROKE} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6h16v10H7l-3 3V6z" />
    </svg>
  );
}

function IconRefresh({ className = '' }: IconProps) {
  return (
    <svg className={`${ICON_SIZE} ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={ICON_STROKE} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4v6h6" />
      <path d="M20 20v-6h-6" />
      <path d="M5 10a7 7 0 0112-3l3 3" />
      <path d="M19 14a7 7 0 01-12 3l-3-3" />
    </svg>
  );
}

function IconDocument({ className = '' }: IconProps) {
  return (
    <svg className={`${ICON_SIZE} ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={ICON_STROKE} strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 4h7l4 4v12a2 2 0 01-2 2H7a2 2 0 01-2-2V6a2 2 0 012-2z" />
      <path d="M14 4v4h4" />
      <path d="M9 12h6" />
      <path d="M9 16h6" />
    </svg>
  );
}

function IconShield({ className = '' }: IconProps) {
  return (
    <svg className={`${ICON_SIZE} ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={ICON_STROKE} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l7 4v5c0 5-3.5 8-7 9-3.5-1-7-4-7-9V7l7-4z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

function IconInfo({ className = '' }: IconProps) {
  return (
    <svg className={`${ICON_SIZE} ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={ICON_STROKE} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 10v6" />
      <path d="M12 7h.01" />
    </svg>
  );
}

function IconTrash({ className = '' }: IconProps) {
  return (
    <svg className={`${ICON_SIZE} ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={ICON_STROKE} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7h16" />
      <path d="M9 7V5h6v2" />
      <path d="M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12" />
    </svg>
  );
}

// ライフ設定のローカルストレージキー
const LIFE_SETTINGS_KEY = 'englishapp_life_settings';

interface LifeSettings {
  showOnStudyLog: boolean;
  notifyOnFull: boolean;
}

const DEFAULT_LIFE_SETTINGS: LifeSettings = {
  showOnStudyLog: true,
  notifyOnFull: false,
};

export default function SettingsPage() {
  const router = useAppRouter();
  const [importStatus, setImportStatus] = useState<string>('');
  const [storageSize, setStorageSize] = useState<number>(0);
  const [adminSecretKey, setAdminSecretKey] = useState<string>('');
  const [adminAuthMessage, setAdminAuthMessage] = useState<string>('');
  const [showExportConfirm, setShowExportConfirm] = useState(false);
  const [showExportSuccess, setShowExportSuccess] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeleteSuccess, setShowDeleteSuccess] = useState(false);
  const [showAccountDeleteConfirm, setShowAccountDeleteConfirm] = useState(false);
  const [accountDeletePassword, setAccountDeletePassword] = useState('');
  const [accountDeleteError, setAccountDeleteError] = useState('');
  const [accountDeleteLoading, setAccountDeleteLoading] = useState(false);
  const [lifeSettings, setLifeSettings] = useState<LifeSettings>(DEFAULT_LIFE_SETTINGS);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // メールアドレス・パスワード変更用のステート
  const [showEmailChangeModal, setShowEmailChangeModal] = useState(false);
  const [showPasswordChangeModal, setShowPasswordChangeModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [changeError, setChangeError] = useState('');
  const [changeSuccess, setChangeSuccess] = useState('');

  // コンテキストフック
  const {
    tier,
    trialStatus,
    isTrialPeriod,
    isMasterAccount,
    debugOverridePlan,
    setDebugOverridePlan,
    getEffectiveTier,
    syncNativeSubscription,
  } = useSubscription();
  const {
    shouldShowAds,
    debugForceShowBanner,
    setDebugForceShowBanner,
  } = useAd();
  const { dailyUsage, resetUsage } = useUsageLimit();
  const {
    user,
    isAuthenticated,
    isMaster,
    isAdminEmailMatch,
    activateMasterMode,
    deactivateMasterMode,
    resetAuth,
    startFreeTrial,
    signOut,
    deleteAccount,
    useFirebase
  } = useAuth();
  const isGuest = isGuestUser(user);
  const {
    currentLife,
    secondsToNextRecovery,
    isRecovering,
    isUnlimited,
    resetLife,
    refillLife,
    setLifeToZero,
    debugLifeMode,
    setDebugLifeMode
  } = useLife();

  const { restorePurchases, isLoading: isRestoringPurchase } = useRevenueCat();
  const { isNative, isInitialized, showBanner, hideBanner } = useAdMob();
  const hideAdsForSensitiveInput =
    showDeleteConfirm ||
    showDeleteSuccess ||
    showAccountDeleteConfirm ||
    showEmailChangeModal ||
    showPasswordChangeModal;

  // 購入復元のステート
  const [restoreStatus, setRestoreStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    const getStorageInfo = () => {
      let totalSize = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const value = localStorage.getItem(key);
          if (value) {
            totalSize += key.length + value.length;
          }
        }
      }
      return Math.round(totalSize / 1024);
    };

    setStorageSize(getStorageInfo());

    // ライフ設定を読み込む
    try {
      const saved = localStorage.getItem(LIFE_SETTINGS_KEY);
      if (saved) {
        setLifeSettings({ ...DEFAULT_LIFE_SETTINGS, ...JSON.parse(saved) });
      }
    } catch {
      // デフォルト設定を使用
    }
  }, []);

  useEffect(() => {
    if (!isNative || !isInitialized) return;

    if (hideAdsForSensitiveInput) {
      void hideBanner();
      return;
    }

    if (shouldShowAds) {
      void showBanner('BOTTOM');
    }
  }, [
    hideAdsForSensitiveInput,
    hideBanner,
    isInitialized,
    isNative,
    shouldShowAds,
    showBanner,
  ]);

  // ライフ設定を更新
  const updateLifeSettings = (updates: Partial<LifeSettings>) => {
    const newSettings = { ...lifeSettings, ...updates };
    setLifeSettings(newSettings);
    localStorage.setItem(LIFE_SETTINGS_KEY, JSON.stringify(newSettings));
  };

  const handleExport = () => {
    setShowExportConfirm(true);
  };

  const handleExportConfirm = async () => {
    setShowExportConfirm(false);
    await downloadBackup();
    setShowExportSuccess(true);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const backupData: BackupData = JSON.parse(text);

      if (!backupData.version || !backupData.exportDate) {
        setImportStatus('無効なバックアップファイルです');
        return;
      }

      const success = importData(backupData);
      if (success) {
        setImportStatus('データを復元しました。ページを再読み込みします...');
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        setImportStatus('データの復元に失敗しました');
      }
    } catch (error) {
      console.error('Import error:', error);
      setImportStatus('ファイルの読み込みに失敗しました');
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClearData = () => {
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = () => {
    setShowDeleteConfirm(false);
    resetAllLocalData();
    setShowDeleteSuccess(true);
  };

  // 管理者認証のハンドラー
  const handleAdminAuth = () => {
    if (!adminSecretKey.trim()) {
      setAdminAuthMessage('認証キーを入力してください。');
      return;
    }

    const result = activateMasterMode(adminSecretKey);
    setAdminAuthMessage(result.message);

    if (result.success) {
      setAdminSecretKey(''); // 成功したらクリア
    }
  };

  const handleAccountDelete = async () => {
    if (!accountDeletePassword.trim()) {
      setAccountDeleteError('パスワードを入力してください');
      return;
    }
    setAccountDeleteLoading(true);
    setAccountDeleteError('');
    try {
      const result = await deleteAccount(accountDeletePassword);
      if (result.success) {
        setShowAccountDeleteConfirm(false);
        setAccountDeletePassword('');
        resetAllLocalData();
        router.push('/auth/login');
      } else {
        setAccountDeleteError(result.error || 'アカウントの削除に失敗しました');
      }
    } catch {
      setAccountDeleteError('アカウントの削除に失敗しました');
    } finally {
      setAccountDeleteLoading(false);
    }
  };

  const handleDeactivateMaster = () => {
    deactivateMasterMode();
    setAdminAuthMessage('マスターモードを無効にしました。');
  };

  // メールアドレス変更ハンドラー
  const handleEmailChange = async () => {
    setChangeError('');
    setChangeSuccess('');

    if (!newEmail.trim()) {
      setChangeError('新しいメールアドレスを入力してください');
      return;
    }

    // メールアドレス形式チェック
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      setChangeError('有効なメールアドレスを入力してください');
      return;
    }

    if (!currentPassword.trim()) {
      setChangeError('現在のパスワードを入力してください');
      return;
    }

    if (useFirebase) {
      const result = await firebaseChangeEmail(currentPassword, newEmail);
      if (result.success) {
        setChangeSuccess('新しいメールアドレスに確認メールを送信しました。メール内のリンクをクリックすると変更が完了します。');
        setNewEmail('');
        setCurrentPassword('');

        setTimeout(() => {
          setShowEmailChangeModal(false);
          setChangeSuccess('');
        }, 3000);
      } else {
        setChangeError(result.error || 'メールアドレスの変更に失敗しました');
      }
    } else {
      const usersData = localStorage.getItem('englishapp_users');
      const users = usersData ? JSON.parse(usersData) : {};
      const currentUser = users[user?.email || ''];

      if (!currentUser || currentUser.password !== currentPassword) {
        setChangeError('パスワードが正しくありません');
        return;
      }

      if (users[newEmail]) {
        setChangeError('このメールアドレスは既に使用されています');
        return;
      }

      const updatedUser = { ...currentUser, email: newEmail };
      delete users[user?.email || ''];
      users[newEmail] = updatedUser;
      localStorage.setItem('englishapp_users', JSON.stringify(users));

      const authData = localStorage.getItem('englishapp_auth');
      if (authData) {
        const auth = JSON.parse(authData);
        auth.user.email = newEmail;
        localStorage.setItem('englishapp_auth', JSON.stringify(auth));
      }

      setChangeSuccess('メールアドレスを変更しました');
      setNewEmail('');
      setCurrentPassword('');

      setTimeout(() => {
        window.location.reload();
      }, 1500);
    }
  };

  // パスワード変更ハンドラー
  const handlePasswordChange = async () => {
    setChangeError('');
    setChangeSuccess('');

    if (!currentPassword.trim()) {
      setChangeError('現在のパスワードを入力してください');
      return;
    }

    if (!newPassword.trim()) {
      setChangeError('新しいパスワードを入力してください');
      return;
    }

    if (newPassword.length < 6) {
      setChangeError('パスワードは6文字以上で入力してください');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setChangeError('新しいパスワードが一致しません');
      return;
    }

    if (useFirebase) {
      const result = await firebaseChangePassword(currentPassword, newPassword);
      if (result.success) {
        setChangeSuccess('パスワードを変更しました');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');

        setTimeout(() => {
          setShowPasswordChangeModal(false);
          setChangeSuccess('');
        }, 1500);
      } else {
        setChangeError(result.error || 'パスワードの変更に失敗しました');
      }
    } else {
      const usersData = localStorage.getItem('englishapp_users');
      const users = usersData ? JSON.parse(usersData) : {};
      const currentUser = users[user?.email || ''];

      if (!currentUser || currentUser.password !== currentPassword) {
        setChangeError('現在のパスワードが正しくありません');
        return;
      }

      currentUser.password = newPassword;
      users[user?.email || ''] = currentUser;
      localStorage.setItem('englishapp_users', JSON.stringify(users));

      setChangeSuccess('パスワードを変更しました');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');

      setTimeout(() => {
        setShowPasswordChangeModal(false);
        setChangeSuccess('');
      }, 1500);
    }
  };

  // モーダルを閉じる時のリセット
  const resetChangeForm = () => {
    setNewEmail('');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
    setChangeError('');
    setChangeSuccess('');
  };

  return (
    <MobileLayout
      showBottomNav={true}
      showAds={!hideAdsForSensitiveInput}
      activeTab="settings"
      requireAuth={true}
    >
      {/* ──── ヘッダー（白背景・茶色文字） ──── */}
      <div className="bg-white px-4 py-4 sticky top-0 z-30 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <HardNavLink
            href="/"
            className="text-[#5D4037] font-semibold text-sm min-w-[60px]"
          >
            ← ホーム
          </HardNavLink>
          <BudouXText as="h1" text="設定" className="text-lg font-bold text-[#3E2723]" />
          <div className="min-w-[60px]" />
        </div>
      </div>

      <div className="bg-[#F5F7FA] pb-8">

        {/* ──────────────────────────────────── */}
        {/* セクション A: プレミアム会員証       */}
        {/* ──────────────────────────────────── */}
        <div className="px-4 pt-4">
          <PremiumSection />
        </div>

        {/* ──────────────────────────────────── */}
        {/* セクション B: アカウント             */}
        {/* ──────────────────────────────────── */}
        {isAuthenticated && !isGuest && (
          <>
            <SectionHeader title="アカウント" />
            <SectionCard>
              <RowButton
                onClick={() => { resetChangeForm(); setShowEmailChangeModal(true); }}
              >
                <RowLeading
                  icon={<IconMail className={ICON_BASE} />}
                  title="メールアドレス"
                  subtitle={user?.email || '未設定'}
                />
                <div className="flex items-center gap-1 text-xs text-gray-400 shrink-0">
                  <span>変更</span>
                  <ChevronRight />
                </div>
              </RowButton>
              <Divider />
              <RowButton
                onClick={() => { resetChangeForm(); setShowPasswordChangeModal(true); }}
              >
                <RowLeading
                  icon={<IconLock className={ICON_BASE} />}
                  title="パスワード"
                  subtitle="••••••••"
                />
                <div className="flex items-center gap-1 text-xs text-gray-400 shrink-0">
                  <span>変更</span>
                  <ChevronRight />
                </div>
              </RowButton>
              <Divider />
              <RowButton
                onClick={async () => { await signOut(); router.push('/'); }}
              >
                <RowLeading
                  icon={<IconLogout className={ICON_BASE} />}
                  title="ログアウト"
                  titleClassName="text-[#5D4037]"
                />
              </RowButton>
            </SectionCard>
            <SectionFooter text="ログアウトすると、再度ログインが必要になります。" />
          </>
        )}

        {/* ──────────────────────────────────── */}
        {/* セクション C: データ管理             */}
        {/* ──────────────────────────────────── */}
        {!isGuest && (
          <>
            <SectionHeader title="データ管理" />
            <SectionCard>
              <RowBase>
                <RowLeading
                  icon={<IconDatabase className={ICON_BASE} />}
                  title="ストレージ使用量"
                />
                <span className="text-sm text-gray-500">{storageSize} KB</span>
              </RowBase>
              <Divider />
              <RowButton
                onClick={handleExport}
              >
                <RowLeading
                  icon={<IconDownload className={ICON_BASE} />}
                  title="バックアップを作成"
                />
                <ChevronRight />
              </RowButton>
              <Divider />
              <RowButton
                onClick={handleImportClick}
              >
                <RowLeading
                  icon={<IconUpload className={ICON_BASE} />}
                  title="バックアップから復元"
                />
                <ChevronRight />
              </RowButton>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
              />
            </SectionCard>
            {importStatus && (
              <SectionFooter text={importStatus} />
            )}
          </>
        )}

        {/* ──────────────────────────────────── */}
        {/* スタミナ設定（無料プランのみ）       */}
        {/* ──────────────────────────────────── */}
        {tier === 'free' && (
          <>
            <SectionHeader title="スタミナ設定" />
            <SectionCard>
              <RowBase className="items-start">
                <RowLeading
                  icon={<IconChart className={ICON_BASE} />}
                  title="学習ログに表示"
                  subtitle="回復状況を学習ログに表示"
                />
                <button
                  onClick={() => updateLifeSettings({ showOnStudyLog: !lifeSettings.showOnStudyLog })}
                  className={`relative shrink-0 w-[51px] h-[31px] rounded-full transition-colors duration-200 ${
                    lifeSettings.showOnStudyLog ? 'bg-[#FCC800]' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`absolute left-0 top-[2px] w-[27px] h-[27px] bg-white rounded-full shadow-md transition-transform duration-200 ${
                      lifeSettings.showOnStudyLog ? 'translate-x-[22px]' : 'translate-x-[2px]'
                    }`}
                  />
                </button>
              </RowBase>
              <Divider />
              <RowBase className="items-start">
                <RowLeading
                  icon={<IconBell className={ICON_BASE} />}
                  title="満タン通知"
                  subtitle="スタミナが満タンになったら通知"
                />
                <button
                  onClick={() => updateLifeSettings({ notifyOnFull: !lifeSettings.notifyOnFull })}
                  className={`relative shrink-0 w-[51px] h-[31px] rounded-full transition-colors duration-200 ${
                    lifeSettings.notifyOnFull ? 'bg-[#FCC800]' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`absolute left-0 top-[2px] w-[27px] h-[27px] bg-white rounded-full shadow-md transition-transform duration-200 ${
                      lifeSettings.notifyOnFull ? 'translate-x-[22px]' : 'translate-x-[2px]'
                    }`}
                  />
                </button>
              </RowBase>
            </SectionCard>
            {lifeSettings.notifyOnFull && (
              <SectionFooter text="通知を受け取るにはブラウザまたはアプリの通知許可が必要です。" />
            )}
          </>
        )}

        {/* ──────────────────────────────────── */}
        {/* セクション D: サポート・その他       */}
        {/* ──────────────────────────────────── */}
        <SectionHeader title="サポート" />
        <SectionCard>
          <RowButton
            onClick={() => {
              const subject = encodeURIComponent('【Bivox】お問い合わせ');
              const body = encodeURIComponent(
                '＜お問い合わせ内容をご記入ください＞\n\n\n' +
                '---\n' +
                `端末: ${navigator.userAgent}\n`
              );
              window.location.href = `mailto:ztnrngtd2312@gmail.com?subject=${subject}&body=${body}`;
            }}
          >
            <RowLeading
              icon={<IconChat className={ICON_BASE} />}
              title="お問い合わせ"
            />
            <ChevronRight />
          </RowButton>
          <Divider />
          <RowButton
            onClick={async () => {
              setRestoreStatus('idle');
              const success = await restorePurchases();
              if (success) {
                await syncNativeSubscription();
              }
              setRestoreStatus(success ? 'success' : 'error');
            }}
            disabled={isRestoringPurchase}
            className="disabled:opacity-50"
          >
            <RowLeading
              icon={<IconRefresh className={ICON_BASE} />}
              title={isRestoringPurchase ? '復元中...' : '購入の復元'}
            />
            <ChevronRight />
          </RowButton>
          {restoreStatus !== 'idle' && (
            <>
              <Divider />
              <div className="px-4 py-2">
                <p className={`text-xs ${restoreStatus === 'success' ? 'text-green-600' : 'text-red-500'}`}>
                  {restoreStatus === 'success' ? '購入情報を復元しました' : '復元に失敗しました。再度お試しください。'}
                </p>
              </div>
            </>
          )}
          <Divider />
          <RowLink href="/terms">
            <RowLeading
              icon={<IconDocument className={ICON_BASE} />}
              title="利用規約"
            />
            <ChevronRight />
          </RowLink>
          <Divider />
          <RowLink href="/privacy">
            <RowLeading
              icon={<IconShield className={ICON_BASE} />}
              title="プライバシーポリシー"
            />
            <ChevronRight />
          </RowLink>
          <Divider />
          <RowLink href="/tokushoho">
            <RowLeading
              icon={<IconDocument className={ICON_BASE} />}
              title="特定商取引法に基づく表記"
            />
            <ChevronRight />
          </RowLink>
        </SectionCard>

        {/* ──────────────────────────────────── */}
        {/* アプリ情報                           */}
        {/* ──────────────────────────────────── */}
        <SectionHeader title="アプリ情報" />
        <SectionCard>
          <RowBase>
            <RowLeading
              icon={<IconInfo className={ICON_BASE} />}
              title="バージョン"
            />
            <span className="text-sm text-gray-500">1.0.0</span>
          </RowBase>
        </SectionCard>

        {/* ──────────────────────────────────── */}
        {/* セクション E: 危険な操作（最下部）   */}
        {/* ──────────────────────────────────── */}
        {!isGuest && (
          <>
            <SectionHeader title="危険な操作" />
            <SectionCard>
              <RowButton
                onClick={handleClearData}
              >
                <RowLeading
                  icon={<IconTrash className={ICON_DANGER} />}
                  title="全データを削除"
                  titleClassName="text-red-500"
                />
              </RowButton>
              {isAuthenticated && (
                <>
                  <Divider />
                  <RowButton
                    onClick={() => { setShowAccountDeleteConfirm(true); setAccountDeletePassword(''); setAccountDeleteError(''); }}
                  >
                    <RowLeading
                      icon={<IconTrash className={ICON_DANGER} />}
                      title="アカウントを削除"
                      titleClassName="text-red-500"
                    />
                  </RowButton>
                </>
              )}
            </SectionCard>
            <SectionFooter text="全ての学習データが削除されます。この操作は取り消せません。" />
          </>
        )}

        {isAdminEmailMatch && (
          <>
        {/* ──────────────────────────────────── */}
        {/* デバッグ情報（開発用）               */}
        {/* ──────────────────────────────────── */}
        <SectionHeader title="デバッグ（開発用）" />
        <SectionCard>
          {/* 認証情報 */}
          <div className="px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-gray-800">ログイン状態</span>
            <span className={`text-xs font-medium ${isAuthenticated ? 'text-green-600' : 'text-gray-400'}`}>
              {isAuthenticated ? 'ログイン中' : '未ログイン'}
            </span>
          </div>
          <Divider />
          {user && (
            <>
              <div className="px-4 py-3 flex items-center justify-between">
                <span className="text-sm text-gray-800">メール</span>
                <span className="text-xs text-gray-400 truncate max-w-[160px]">{user.email}</span>
              </div>
              <Divider />
              <div className="px-4 py-3 flex items-center justify-between">
                <span className="text-sm text-gray-800">認証方法</span>
                <span className="text-xs text-gray-400">{user.provider}</span>
              </div>
              <Divider />
              <div className="px-4 py-3 flex items-center justify-between">
                <span className="text-sm text-gray-800">マスターアカウント</span>
                <span className={`text-xs font-medium ${isMaster ? 'text-[#FCC800]' : 'text-gray-400'}`}>
                  {isMaster ? '有効' : '無効'}
                </span>
              </div>
              <Divider />
            </>
          )}
          <button
            onClick={() => { resetAuth(); router.push('/auth/login'); }}
            className="w-full px-4 py-3 text-center text-sm text-[#5D4037] font-medium active:bg-gray-50 transition-colors"
          >
            認証状態をリセット
          </button>
        </SectionCard>

        {/* トライアル情報 */}
        <SectionCard className="mt-2">
          <div className="px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-gray-800">トライアル状態</span>
            <span className={`text-xs font-medium ${
              isTrialPeriod ? 'text-green-600' :
              trialStatus.hasUsedTrial ? 'text-red-500' : 'text-gray-400'
            }`}>
              {isTrialPeriod ? 'トライアル中' :
               trialStatus.hasUsedTrial ? '利用済み' : '未使用'}
            </span>
          </div>
          {trialStatus.isCurrentlyInTrial && (
            <>
              <Divider />
              <div className="px-4 py-3 flex items-center justify-between">
                <span className="text-sm text-gray-800">残り日数</span>
                <span className="text-sm font-medium text-green-600">{trialStatus.daysRemaining}日</span>
              </div>
            </>
          )}
          <Divider />
          <div className="px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-gray-800">期間</span>
            <span className="text-xs text-gray-400">{TRIAL_CONFIG.DURATION_DAYS}日間</span>
          </div>
          <Divider />
          <div className="px-4 py-2 flex gap-2">
            {!trialStatus.hasUsedTrial && isAuthenticated && (
              <button
                onClick={() => startFreeTrial()}
                className="flex-1 py-2 text-xs font-medium text-[#5D4037] bg-[#FCC800]/10 rounded-lg active:bg-[#FCC800]/20"
              >
                トライアル開始
              </button>
            )}
            <button
              onClick={() => { clearTrialHistory(); window.location.reload(); }}
              className="flex-1 py-2 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg active:bg-gray-200"
            >
              履歴をリセット
            </button>
          </div>
        </SectionCard>

        {/* プラン情報 */}
        <SectionCard className="mt-2">
          <div className="px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-gray-800">現在のプラン</span>
            <span className={`text-xs font-medium ${
              tier === 'pro' ? 'text-[#5D4037]' :
              tier === 'plus' ? 'text-[#FCC800]' : 'text-gray-400'
            }`}>
              {PLAN_NAMES[tier]}{isTrialPeriod ? ' (トライアル)' : ''}
            </span>
          </div>
        </SectionCard>

        {/* 利用制限情報 */}
        <SectionCard className="mt-2">
          <div className="px-4 py-2">
            <BudouXText as="p" text="本日の利用状況" className="text-xs font-medium text-gray-400 mb-1" />
          </div>
          {tier !== 'free' && (
            <>
              <Divider />
              <div className="px-4 py-3 flex items-center justify-between">
                <span className="text-sm text-gray-800">スピーキング判定</span>
                <span className="text-xs text-gray-400">
                  {dailyUsage.speaking} / {tier === 'pro' ? '∞' : USAGE_LIMITS.PLUS_SPEAKING_DAILY_LIMIT}
                </span>
              </div>
            </>
          )}
          {tier === 'pro' && (
            <>
              <Divider />
              <div className="px-4 py-3 flex items-center justify-between">
                <span className="text-sm text-gray-800">AI機能</span>
                <span className="text-xs text-gray-400">
                  {dailyUsage.aiTotal} / {USAGE_LIMITS.PRO_AI_DAILY_LIMIT}
                </span>
              </div>
            </>
          )}
          <Divider />
          <button
            onClick={resetUsage}
            className="w-full px-4 py-2 text-center text-xs text-gray-600 active:bg-gray-50"
          >
            利用カウントをリセット
          </button>
        </SectionCard>

        {/* ライフ情報 */}
        <SectionCard className="mt-2">
          <div className="px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-gray-800">現在のライフ</span>
            <span className={`text-sm font-medium ${isUnlimited ? 'text-[#5D4037]' : 'text-red-500'}`}>
              {isUnlimited ? '∞ 無制限' : `${currentLife} / ${LIFE_CONFIG.MAX_LIFE}`}
            </span>
          </div>
          {!isUnlimited && isRecovering && (
            <>
              <Divider />
              <div className="px-4 py-3 flex items-center justify-between">
                <span className="text-sm text-gray-800">次の回復まで</span>
                <span className="text-sm text-[#FCC800] font-medium">
                  {formatTimeRemaining(secondsToNextRecovery)}
                </span>
              </div>
            </>
          )}
          <Divider />
          <div className="px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-gray-800">回復速度</span>
            <span className="text-xs text-gray-400">{LIFE_CONFIG.RECOVERY_INTERVAL_MINUTES}分ごとに1回復</span>
          </div>
          {!isUnlimited && (
            <>
              <Divider />
              <div className="px-4 py-2 flex gap-2">
                <button
                  onClick={resetLife}
                  className="flex-1 py-2 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg active:bg-gray-200"
                >
                  満タンにリセット
                </button>
                <button
                  onClick={() => refillLife(5)}
                  className="flex-1 py-2 text-xs font-medium text-[#5D4037] bg-[#FCC800]/10 rounded-lg active:bg-[#FCC800]/20"
                >
                  +5回復
                </button>
              </div>
            </>
          )}
        </SectionCard>

        {/* 設定定数 */}
        <SectionCard className="mt-2">
          <div className="px-4 py-3">
            <BudouXText as="p" text="設定定数" className="text-xs font-medium text-gray-400 mb-2" />
            <div className="space-y-1 text-xs text-gray-500">
              <p>Plus スピーキング上限: {USAGE_LIMITS.PLUS_SPEAKING_DAILY_LIMIT}回/日</p>
              <p>Pro AI機能上限: {USAGE_LIMITS.PRO_AI_DAILY_LIMIT}回/日</p>
              <p>会話履歴保持数: {USAGE_LIMITS.MAX_CONVERSATION_HISTORY}メッセージ</p>
            </div>
          </div>
        </SectionCard>
          </>
        )}

        {/* 管理者認証（メールが一致する場合のみ表示） */}
        {isAdminEmailMatch && (
          <SectionCard className="mt-2">
            <div className="px-4 py-3">
              <BudouXText as="p" text="管理者認証" className="text-xs font-medium text-gray-400 mb-2" />
              {isMaster ? (
                <div className="space-y-2">
                  <BudouXText as="p" text="マスターモードが有効です" className="text-xs text-green-600 font-medium" />
                  {useFirebase ? (
                    <BudouXText
                      as="p"
                      text="Firebase Custom Claims により管理者権限が付与されています。"
                      className="text-xs text-gray-500"
                    />
                  ) : (
                    <button
                      onClick={handleDeactivateMaster}
                      className="w-full py-2 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg active:bg-gray-200"
                    >
                      マスターモードを無効化
                    </button>
                  )}
                </div>
              ) : !useFirebase ? (
                <div className="space-y-2">
                  <input
                    type="password"
                    value={adminSecretKey}
                    onChange={(e) => setAdminSecretKey(e.target.value)}
                    placeholder="認証キー"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#FCC800] bg-gray-50"
                  />
                  <button
                    onClick={handleAdminAuth}
                    className="w-full py-2 text-xs font-medium text-[#5D4037] bg-[#FCC800]/10 rounded-lg active:bg-[#FCC800]/20"
                  >
                    認証
                  </button>
                </div>
              ) : (
                <BudouXText
                  as="p"
                  text="Firebase 側で admin Custom Claim が付与されたアカウントのみ有効になります。"
                  className="text-xs text-gray-500"
                />
              )}
              {adminAuthMessage && (
                <p className={`mt-2 text-xs ${
                  adminAuthMessage.includes('有効') ? 'text-green-600' : 'text-red-500'
                }`}>
                  {adminAuthMessage}
                </p>
              )}
            </div>
          </SectionCard>
        )}

        {/* デバッグパネル（マスターモード有効時のみ） */}
        {isMaster && (
          <SectionCard className="mt-2">
            <div className="px-4 py-3">
              <BudouXText as="p" text="デバッグパネル" className="text-xs font-medium text-gray-400 mb-3" />

              {/* A. プランの強制上書き */}
              <div className="mb-4">
                <BudouXText as="p" text="プランの強制上書き" className="text-xs font-medium text-gray-600 mb-2" />
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500">現在の擬似プラン:</span>
                  <span className="text-xs font-medium text-[#5D4037]">{PLAN_NAMES[getEffectiveTier()]}</span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {(['free', 'plus', 'pro'] as const).map((plan) => (
                    <button
                      key={plan}
                      onClick={() => setDebugOverridePlan(plan)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                        debugOverridePlan === plan
                          ? 'bg-[#5D4037] text-white'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {PLAN_NAMES[plan]}
                    </button>
                  ))}
                  <button
                    onClick={() => setDebugOverridePlan(null)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                      debugOverridePlan === null
                        ? 'bg-[#FCC800] text-[#5D4037]'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    リセット
                  </button>
                </div>
              </div>

              {/* B. ライフ操作 */}
              <div className="mb-4">
                <BudouXText as="p" text="ライフ操作" className="text-xs font-medium text-gray-600 mb-2" />
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500">現在のモード:</span>
                  <span className="text-xs font-medium text-[#5D4037]">
                    {debugLifeMode === 'unlimited' ? '∞ 無制限' :
                     debugLifeMode === 'zero' ? '0 ライフ切れ' : '通常'}
                  </span>
                </div>
                <div className="flex gap-2 flex-wrap mb-2">
                  <button
                    onClick={() => setDebugLifeMode('zero')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg ${
                      debugLifeMode === 'zero' ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    ライフを0に
                  </button>
                  <button
                    onClick={() => { setDebugLifeMode('normal'); resetLife(); }}
                    className="px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-lg"
                  >
                    全回復(30)
                  </button>
                  <button
                    onClick={() => setDebugLifeMode('unlimited')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg ${
                      debugLifeMode === 'unlimited' ? 'bg-[#5D4037] text-white' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    無限ライフ
                  </button>
                  <button
                    onClick={() => setDebugLifeMode('normal')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg ${
                      debugLifeMode === 'normal' ? 'bg-[#5D4037] text-white' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    通常モード
                  </button>
                </div>
                <p className="text-xs text-gray-400">
                  現在のライフ: {isUnlimited ? '∞' : `${currentLife}/${LIFE_CONFIG.MAX_LIFE}`}
                </p>
              </div>

              {/* C. 広告テスト */}
              <div>
                <BudouXText as="p" text="広告テスト" className="text-xs font-medium text-gray-600 mb-2" />
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500">バナー強制表示:</span>
                  <button
                    onClick={() => setDebugForceShowBanner(!debugForceShowBanner)}
                    className={`relative w-[51px] h-[31px] rounded-full transition-colors ${
                      debugForceShowBanner ? 'bg-[#FCC800]' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`absolute top-[2px] w-[27px] h-[27px] bg-white rounded-full shadow transition-transform ${
                        debugForceShowBanner ? 'translate-x-[22px]' : 'translate-x-[2px]'
                      }`}
                    />
                  </button>
                </div>
                <p className="mt-2 text-xs text-gray-400">
                  広告表示状態: {shouldShowAds ? '表示あり' : '表示なし'}
                </p>
              </div>
            </div>
          </SectionCard>
        )}

        {/* 最下部の余白 */}
        <div className="h-4" />
      </div>

      {/* ──── モーダル群 ──── */}

      {/* エクスポート確認モーダル */}
      {showExportConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-[400px] mx-4 rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-6">
              <div className="text-center mb-4">
                <BudouXText as="h3" text="バックアップに含まれるデータ" className="text-lg font-bold text-gray-800 mb-1" />
                <BudouXText as="p" text="以下のデータがエクスポートされます" className="text-gray-400 text-xs" />
              </div>

              <ul className="text-sm text-gray-700 space-y-2 mb-6 bg-gray-50 rounded-xl p-4">
                {['トレーニング履歴', '学習統計', '連続学習記録', 'SRSカード', 'アプリ設定'].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="text-[#FCC800]">✓</span>
                    <BudouXText as="span" text={item} />
                  </li>
                ))}
              </ul>

              <div className="space-y-2">
                <button
                  onClick={handleExportConfirm}
                  className="w-full py-3 bg-[#3E2723] text-white rounded-xl font-bold text-sm active:scale-[0.98] transition-transform"
                >
                  エクスポートする
                </button>
                <button
                  onClick={() => setShowExportConfirm(false)}
                  className="w-full py-3 text-gray-400 font-medium text-sm"
                >
                  キャンセル
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* エクスポート完了モーダル */}
      {showExportSuccess && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-[350px] mx-4 rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-6 text-center">
              <div className="w-14 h-14 bg-[#FCC800]/10 rounded-full mx-auto mb-4 flex items-center justify-center">
                <svg className="w-7 h-7 text-[#FCC800]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <BudouXText as="h3" text="エクスポート完了" className="text-lg font-bold text-gray-800 mb-1" />
              <BudouXText as="p" text="バックアップファイルを保存しました" className="text-gray-400 text-sm mb-6" />
              <button
                onClick={() => setShowExportSuccess(false)}
                className="w-full py-3 bg-[#3E2723] text-white rounded-xl font-bold text-sm active:scale-[0.98] transition-transform"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* データ削除確認モーダル */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-[400px] mx-4 rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-6">
              <div className="text-center mb-4">
                <div className="w-14 h-14 bg-red-50 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <svg className="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <BudouXText as="h3" text="全データを削除しますか？" className="text-lg font-bold text-gray-800 mb-1" />
                <BudouXText as="p" text="この操作は取り消せません" className="text-gray-400 text-sm" />
              </div>

              <div className="bg-red-50 rounded-xl p-4 mb-6">
                <ul className="text-sm text-red-600 space-y-1">
                  {['トレーニング履歴', '学習統計', '連続学習記録', 'SRSカード', 'アプリ設定'].map((item) => (
                    <li key={item}>
                      ・<BudouXText as="span" text={item} />
                    </li>
                  ))}
                </ul>
                <BudouXText as="p" text="全て削除されます" className="text-red-500 font-bold text-sm mt-2" />
              </div>

              <div className="space-y-2">
                <button
                  onClick={handleDeleteConfirm}
                  className="w-full py-3 bg-red-500 text-white rounded-xl font-bold text-sm active:scale-[0.98] transition-transform"
                >
                  削除する
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="w-full py-3 text-gray-400 font-medium text-sm"
                >
                  キャンセル
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* データ削除完了モーダル */}
      {showDeleteSuccess && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-[350px] mx-4 rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-6 text-center">
              <div className="w-14 h-14 bg-[#FCC800]/10 rounded-full mx-auto mb-4 flex items-center justify-center">
                <svg className="w-7 h-7 text-[#FCC800]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <BudouXText as="h3" text="削除完了" className="text-lg font-bold text-gray-800 mb-1" />
              <BudouXText as="p" text="全てのデータを削除しました" className="text-gray-400 text-sm mb-6" />
              <button
                onClick={() => { setShowDeleteSuccess(false); window.location.reload(); }}
                className="w-full py-3 bg-[#3E2723] text-white rounded-xl font-bold text-sm active:scale-[0.98] transition-transform"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* アカウント削除確認モーダル */}
      {showAccountDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-[400px] mx-4 rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-6">
              <div className="text-center mb-4">
                <div className="w-14 h-14 bg-red-50 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <svg className="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <BudouXText as="h3" text="アカウントを削除しますか？" className="text-lg font-bold text-gray-800 mb-1" />
                <BudouXText as="p" text="この操作は取り消せません。全ての学習データとアカウント情報が完全に削除されます。" className="text-gray-400 text-sm" />
              </div>

              <div className="mb-6">
                <label className="block text-sm text-gray-600 mb-1">確認のためパスワードを入力</label>
                <input
                  type="password"
                  value={accountDeletePassword}
                  onChange={(e) => { setAccountDeletePassword(e.target.value); setAccountDeleteError(''); }}
                  placeholder="パスワード"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-red-300"
                  onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                />
                {accountDeleteError && (
                  <p className="text-red-500 text-xs mt-1">{accountDeleteError}</p>
                )}
              </div>

              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => { setShowAccountDeleteConfirm(false); setAccountDeletePassword(''); setAccountDeleteError(''); }}
                  disabled={accountDeleteLoading}
                  className="w-full py-4 bg-gray-100 text-gray-700 rounded-xl font-bold text-base active:scale-[0.98] transition-transform disabled:opacity-50"
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  onClick={handleAccountDelete}
                  disabled={accountDeleteLoading}
                  className="w-full py-3 bg-red-500 text-white rounded-xl font-medium text-sm active:scale-[0.98] transition-transform disabled:opacity-50"
                >
                  {accountDeleteLoading ? '削除中...' : 'アカウントを削除する'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* メールアドレス変更モーダル */}
      {showEmailChangeModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-[400px] mx-4 rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-6">
              <div className="text-center mb-4">
                <BudouXText as="h3" text="メールアドレスの変更" className="text-lg font-bold text-gray-800 mb-1" />
                <p className="text-gray-400 text-xs">現在: {user?.email}</p>
              </div>

              <div className="space-y-3 mb-4">
                <div>
                  <BudouXText as="label" text="新しいメールアドレス" className="block text-xs font-medium text-gray-500 mb-1" />
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="example@email.com"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#FCC800] focus:bg-white transition-all"
                  />
                </div>
                <div>
                  <BudouXText as="label" text="現在のパスワード（確認用）" className="block text-xs font-medium text-gray-500 mb-1" />
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="パスワードを入力"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#FCC800] focus:bg-white transition-all"
                  />
                </div>
              </div>

              {changeError && (
                <div className="mb-4 p-3 bg-red-50 rounded-xl">
                  <p className="text-red-500 text-xs text-center">{changeError}</p>
                </div>
              )}

              {changeSuccess && (
                <div className="mb-4 p-3 bg-green-50 rounded-xl">
                  <p className="text-green-600 text-xs text-center">{changeSuccess}</p>
                </div>
              )}

              <div className="space-y-2">
                <button
                  onClick={handleEmailChange}
                  className="w-full py-3 bg-[#3E2723] text-white rounded-xl font-bold text-sm active:scale-[0.98] transition-transform"
                >
                  変更する
                </button>
                <button
                  onClick={() => { setShowEmailChangeModal(false); resetChangeForm(); }}
                  className="w-full py-3 text-gray-400 font-medium text-sm"
                >
                  キャンセル
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* パスワード変更モーダル */}
      {showPasswordChangeModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-[400px] mx-4 rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-6">
              <div className="text-center mb-4">
                <BudouXText as="h3" text="パスワードの変更" className="text-lg font-bold text-gray-800 mb-1" />
              </div>

              <div className="space-y-3 mb-4">
                <div>
                  <BudouXText as="label" text="現在のパスワード" className="block text-xs font-medium text-gray-500 mb-1" />
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="現在のパスワード"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#FCC800] focus:bg-white transition-all"
                  />
                </div>
                <div>
                  <BudouXText as="label" text="新しいパスワード" className="block text-xs font-medium text-gray-500 mb-1" />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="6文字以上"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#FCC800] focus:bg-white transition-all"
                  />
                </div>
                <div>
                  <BudouXText as="label" text="新しいパスワード（確認）" className="block text-xs font-medium text-gray-500 mb-1" />
                  <input
                    type="password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="もう一度入力"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#FCC800] focus:bg-white transition-all"
                  />
                </div>
              </div>

              {changeError && (
                <div className="mb-4 p-3 bg-red-50 rounded-xl">
                  <p className="text-red-500 text-xs text-center">{changeError}</p>
                </div>
              )}

              {changeSuccess && (
                <div className="mb-4 p-3 bg-green-50 rounded-xl">
                  <p className="text-green-600 text-xs text-center">{changeSuccess}</p>
                </div>
              )}

              <div className="space-y-2">
                <button
                  onClick={handlePasswordChange}
                  className="w-full py-3 bg-[#3E2723] text-white rounded-xl font-bold text-sm active:scale-[0.98] transition-transform"
                >
                  変更する
                </button>
                <button
                  onClick={() => { setShowPasswordChangeModal(false); resetChangeForm(); }}
                  className="w-full py-3 text-gray-400 font-medium text-sm"
                >
                  キャンセル
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </MobileLayout>
  );
}
