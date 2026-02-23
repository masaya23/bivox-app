import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";

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
  themeColor: "#f97316",
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
    <html lang="ja" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <Providers>
          {children}
        </Providers>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                if (!('serviceWorker' in navigator)) return;
                const IS_PROD = ${isProd ? 'true' : 'false'};

                // 開発中はService WorkerがNext.jsの更新を邪魔しやすいので、既存SWとキャッシュを削除する
                if (!IS_PROD) {
                  Promise.all([
                    navigator.serviceWorker.getRegistrations().then((regs) => Promise.all(regs.map((r) => r.unregister()))),
                    (self.caches ? caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))) : Promise.resolve()),
                  ]).catch(() => {});
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
