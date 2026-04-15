import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";
import CapacitorLinkInterceptor from "@/components/CapacitorLinkInterceptor";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bivox - 瞬間英会話 -",
  description: "AIを活用した瞬間英会話トレーニングアプリ。音声認識で英語が口から飛び出す体験を。",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Bivox",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FCC800" },
    { media: "(prefers-color-scheme: dark)", color: "#FCC800" },
  ],
  // iOS Safari/Capacitor用のviewport-fit設定
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isProd = process.env.NODE_ENV === 'production';

  return (
    <html
      lang="ja"
      suppressHydrationWarning
      style={{ backgroundColor: '#ffffff', colorScheme: 'light' }}
    >
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
        style={{ backgroundColor: '#ffffff', colorScheme: 'light' }}
      >
        <Providers>
          <CapacitorLinkInterceptor />
          {children}
        </Providers>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                if (!('serviceWorker' in navigator)) return;
                var IS_PROD = ${isProd ? 'true' : 'false'};

                // Capacitor環境ではService Workerを使わない（キャッシュ失敗やナビゲーション干渉を防止）
                var isCapacitor = window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform();

                // 開発中またはCapacitor環境ではSWとキャッシュを削除する
                if (!IS_PROD || isCapacitor) {
                  Promise.all([
                    navigator.serviceWorker.getRegistrations().then(function(regs) { return Promise.all(regs.map(function(r) { return r.unregister(); })); }),
                    (self.caches ? caches.keys().then(function(keys) { return Promise.all(keys.map(function(k) { return caches.delete(k); })); }) : Promise.resolve()),
                  ]).catch(function() {});
                  return;
                }

                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(
                    function() {
                      console.log('ServiceWorker registration successful');
                    },
                    function(err) {
                      console.log('ServiceWorker registration failed: ', err);
                    }
                  );
                });
              })();
            `,
          }}
        />
      </body>
    </html>
  );
}
