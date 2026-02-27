'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useMemo } from 'react';
import { Capacitor } from '@capacitor/core';

/**
 * Capacitor静的環境でのパス変換
 * Capacitorの内蔵WebViewサーバーは拡張子なしのパスを解決できないため、
 * .html拡張子を付与して正しいファイルにルーティングする
 */
function toCapacitorPath(path: string): string {
  // ルートパスはそのまま（Capacitorがindex.htmlを自動で返す）
  if (path === '/' || path === '') return '/';
  // すでに拡張子がある場合はそのまま
  if (path.includes('.')) return path;
  // クエリパラメータがある場合はパス部分のみに.htmlを追加
  const qIndex = path.indexOf('?');
  if (qIndex !== -1) {
    return path.substring(0, qIndex) + '.html' + path.substring(qIndex);
  }
  // ハッシュがある場合
  const hIndex = path.indexOf('#');
  if (hIndex !== -1) {
    return path.substring(0, hIndex) + '.html' + path.substring(hIndex);
  }
  return path + '.html';
}

/**
 * Capacitor環境対応のルーターフック
 * ネイティブ環境ではwindow.locationを使い、Web環境ではNext.jsルーターを使う
 */
export function useAppRouter() {
  const nextRouter = useRouter();

  const isNative = useMemo(() => {
    if (typeof window === 'undefined') return false;
    try {
      return Capacitor.isNativePlatform();
    } catch {
      return false;
    }
  }, []);

  const push = useCallback((path: string) => {
    if (isNative) {
      window.location.assign(toCapacitorPath(path));
    } else {
      nextRouter.push(path);
    }
  }, [isNative, nextRouter]);

  const replace = useCallback((path: string) => {
    if (isNative) {
      window.location.replace(toCapacitorPath(path));
    } else {
      nextRouter.replace(path);
    }
  }, [isNative, nextRouter]);

  const back = useCallback(() => {
    if (isNative) {
      window.history.back();
    } else {
      nextRouter.back();
    }
  }, [isNative, nextRouter]);

  return { push, replace, back };
}
