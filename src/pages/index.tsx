// pages/index.tsx

import { signIn, signOut, useSession } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';

export default function Home() {
  const { data: session } = useSession();

  const handleLogin = () => {
    signIn('spotify');
  };

  const handleLogout = () => {
    signOut();
  };

  return (
    <div className="relative flex flex-col min-h-screen text-gray-800">
      {/* ヘッダー */}
      <header className="flex items-center justify-between p-4 bg-blue-600 text-white shadow-md">
        <h1 className="text-xl font-bold">実験 事前準備アプリ</h1>
        {session && (
          <div className="flex items-center space-x-4">
            {session.user?.image && (
              <Image
                src={session.user.image}
                alt="Profile"
                width={40}
                height={40}
                className="w-10 h-10 rounded-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = '/fallback.png';
                }}
              />
            )}
            <button
              onClick={handleLogout}
              className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-blue-700 rounded-md text-sm font-bold transition"
            >
              ログアウト
            </button>
          </div>
        )}
      </header>

      {/* メインコンテンツ */}
      <main className="flex-1 flex flex-col items-center justify-center bg-blue-50 p-6">
        {!session ? (
          // ===== ログイン前 =====
          <div className="w-full max-w-sm mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-2 text-blue-600">
              実験へのご協力
            </h2>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-blue-600">
              ありがとうございます！
            </h2>
            <p className="text-base md:text-lg text-gray-700 mb-6">
              下記のボタンから<br />Spotifyへログインを行なってください。<br /><br />
              あなたのライブラリ情報等を使用することに<br />同意いただく必要があります。
            </p>
            <button
              onClick={handleLogin}
              className="w-full px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white text-base md:text-lg font-semibold rounded-lg shadow-md transition-all"
            >
              Login with Spotify
            </button>
          </div>
        ) : (
          // ===== ログイン後 =====
          <div className="w-full max-w-md mx-auto flex flex-col items-center">
            <h1 className="text-2xl md:text-3xl font-bold text-center mb-4 text-blue-700">
              曲の分類
            </h1>
            <p className="text-gray-700 text-center mb-8">
              あなたの追加した楽曲を<br />「歌える自信」と「思い入れの強さ」<br />で分類しましょう！
            </p>
            {/* ライブラリへのリンク */}
            <Link href="/library" className="block w-full bg-white border border-blue-300 hover:bg-blue-100 text-blue-800 text-lg font-semibold text-center rounded-lg shadow p-4 transition-colors">
              分類をはじめる
            </Link>
          </div>
        )}
      </main>

      {/* フッター */}
      <footer className="p-4 bg-blue-100 text-center text-sm text-gray-600">
        © {new Date().getFullYear()} Spotify Study App. All rights reserved.
      </footer>
    </div>
  );
}
