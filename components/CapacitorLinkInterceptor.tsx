'use client';

import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

/**
 * Capacitor環境で全ての<a>タグのクリックをインターセプトし、
 * 内部リンクに.html拡張子を自動付与するグローバルハンドラー。
 *
 * Capacitorの内蔵WebViewサーバーは /auth/register のようなパスを
 * auth/register.html に自動解決できないため、このコンポーネントが
 * 全てのリンクを自動変換する。
 */
export default function CapacitorLinkInterceptor() {
  useEffect(() => {
    let isNative = false;
    try {
      isNative = Capacitor.isNativePlatform();
    } catch {
      // Capacitor not available
    }
    if (!isNative) return;

    function handleClick(e: MouseEvent) {
      // <a> タグを探す（クリックされた要素またはその親）
      const anchor = (e.target as Element).closest('a');
      if (!anchor) return;

      // 修飾キー付きクリック（新規タブ等）はスキップ
      if (e.button !== 0 || e.metaKey || e.altKey || e.ctrlKey || e.shiftKey) return;

      // すでにpreventDefaultされていたらスキップ
      if (e.defaultPrevented) return;

      const href = anchor.getAttribute('href');
      if (!href) return;

      // 外部リンク（http://、https://、mailto:、tel: 等）はスキップ
      if (/^(https?:|mailto:|tel:|#)/.test(href)) return;

      // すでに拡張子がある場合はスキップ（.html, .png, .js 等）
      if (/\.[a-zA-Z0-9]+(\?|#|$)/.test(href)) return;

      // ルートパスはスキップ（Capacitorが自動でindex.htmlを返す）
      if (href === '/' || href === '') return;

      // .html拡張子を付与してナビゲーション
      e.preventDefault();
      let targetHref: string;
      const qIndex = href.indexOf('?');
      const hIndex = href.indexOf('#');
      const splitIndex = qIndex !== -1 ? qIndex : hIndex !== -1 ? hIndex : -1;

      if (splitIndex !== -1) {
        targetHref = href.substring(0, splitIndex) + '.html' + href.substring(splitIndex);
      } else {
        targetHref = href + '.html';
      }

      window.location.assign(targetHref);
    }

    // キャプチャフェーズで登録（他のhandlerより先に実行）
    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, []);

  return null;
}
