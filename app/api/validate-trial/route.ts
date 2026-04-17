import { NextRequest, NextResponse } from 'next/server';

// Capacitorビルド（静的エクスポート）時に必要
export const dynamic = 'force-dynamic';

// トライアル検証API
// 本番環境ではデータベースとの連携が必要

interface TrialValidationRequest {
  emailHash: string;
  action: 'check' | 'start' | 'preserve';
}

interface TrialHistoryRecord {
  emailHash: string;
  usedAt: string;
  provider: string;
  expiresAt: string;
}

// 開発用：インメモリストレージ（本番ではDB）
// ※サーバー再起動で消えるため、本番ではPostgreSQL/MongoDB等を使用
const trialHistoryStore = new Map<string, TrialHistoryRecord>();

// トライアル期間（日数）
const TRIAL_DURATION_DAYS = 7;

export async function POST(request: NextRequest) {
  try {
    const body: TrialValidationRequest = await request.json();
    const { emailHash, action } = body;

    if (!emailHash) {
      return NextResponse.json(
        { error: 'emailHash is required' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'check': {
        // トライアル履歴をチェック
        const existingTrial = trialHistoryStore.get(emailHash);

        if (existingTrial) {
          return NextResponse.json({
            canUseTrial: false,
            reason: 'このメールアドレスでは既に無料トライアルを利用済みです。',
            previousUsage: {
              usedAt: existingTrial.usedAt,
              expiresAt: existingTrial.expiresAt,
            },
          });
        }

        return NextResponse.json({
          canUseTrial: true,
        });
      }

      case 'start': {
        // 新規トライアル開始
        const existingTrial = trialHistoryStore.get(emailHash);

        if (existingTrial) {
          return NextResponse.json(
            {
              error: 'TRIAL_ALREADY_USED',
              message: 'このメールアドレスでは既に無料トライアルを利用済みです。',
            },
            { status: 409 }
          );
        }

        const now = new Date();
        const expiresAt = new Date(now);
        expiresAt.setDate(expiresAt.getDate() + TRIAL_DURATION_DAYS);

        const record: TrialHistoryRecord = {
          emailHash,
          usedAt: now.toISOString(),
          provider: 'email', // 本番では実際のプロバイダーを記録
          expiresAt: expiresAt.toISOString(),
        };

        trialHistoryStore.set(emailHash, record);

        return NextResponse.json({
          success: true,
          trial: {
            startDate: record.usedAt,
            endDate: record.expiresAt,
            daysRemaining: TRIAL_DURATION_DAYS,
          },
        });
      }

      case 'preserve': {
        // アカウント削除時にトライアル履歴を保持
        // すでに履歴がある場合は何もしない
        const existingTrial = trialHistoryStore.get(emailHash);

        if (!existingTrial) {
          // 履歴がない場合は「使用済み」として記録
          const now = new Date();
          const record: TrialHistoryRecord = {
            emailHash,
            usedAt: now.toISOString(),
            provider: 'deleted_account',
            expiresAt: now.toISOString(), // 即時終了
          };
          trialHistoryStore.set(emailHash, record);
        }

        return NextResponse.json({
          success: true,
          message: 'Trial history preserved',
        });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Trial validation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET: トライアル状態の確認
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const emailHash = searchParams.get('emailHash');

  if (!emailHash) {
    return NextResponse.json(
      { error: 'emailHash query parameter is required' },
      { status: 400 }
    );
  }

  const existingTrial = trialHistoryStore.get(emailHash);

  if (!existingTrial) {
    return NextResponse.json({
      hasUsedTrial: false,
      canUseTrial: true,
    });
  }

  const now = new Date();
  const expiresAt = new Date(existingTrial.expiresAt);
  const isExpired = now > expiresAt;
  const daysRemaining = isExpired
    ? 0
    : Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  return NextResponse.json({
    hasUsedTrial: true,
    canUseTrial: false,
    isCurrentlyInTrial: !isExpired,
    trialStartDate: existingTrial.usedAt,
    trialEndDate: existingTrial.expiresAt,
    daysRemaining,
  });
}
