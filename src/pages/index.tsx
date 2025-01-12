// pages/index.tsx

import { useSession, signIn, signOut } from 'next-auth/react';
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
      <header className="flex items-center justify-between p-4 bg-green-600 text-white shadow-md">
        <h1 className="text-xl font-bold">My Track History App</h1>
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
              className="px-3 py-1 bg-red-500 hover:bg-red-600 rounded-md text-sm"
            >
              Logout
            </button>
          </div>
        )}
      </header>

      {/* メインコンテンツ */}
      <main className="flex-1 flex flex-col items-center justify-center bg-green-50 p-6">
        {!session ? (
          // ===== ログイン前 =====
          <div className="w-full max-w-sm mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-green-600">
              実験へのご協力
            </h2>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-green-600">
              ありがとうございます！
            </h2>
            <p className="text-base md:text-lg text-gray-700 mb-6">
              下記のボタンから<br/>Spotifyへログインを行なってください。<br/><br/>
              ログイン時に実験で使用するサービスで<br/>あなたのライブラリ情報等を使用することに<br/>同意いただく必要があります。
            </p>
            <button
              onClick={handleLogin}
              className="w-full px-6 py-3 bg-green-500 hover:bg-green-600 text-white text-base md:text-lg font-semibold rounded-lg shadow-md transition-all"
            >
              Login with Spotify
            </button>
          </div>
        ) : (
          // ===== ログイン後 =====
          <div className="w-full max-w-md mx-auto flex flex-col items-center">
            <h1 className="text-2xl md:text-3xl font-bold text-center mb-4 text-green-700">
              曲の分類
            </h1>
            <p className="text-gray-700 text-center mb-8">
              あなたの楽曲を<br/>「お気に入り度」と「歌いやすさ」<br/>で分類しましょう。
            </p>
            {/* ライブラリへのリンク */}
            <Link href="/library" className="block w-full bg-white border border-green-300 hover:bg-green-100 text-green-800 text-lg font-semibold text-center rounded-lg shadow p-4 transition-colors">
                ライブラリへ
            </Link>
          </div>
        )}
      </main>

      {/* フッター */}
      <footer className="p-4 bg-green-100 text-center text-sm text-gray-600">
        © {new Date().getFullYear()} My Track History App. All rights reserved.
      </footer>
    </div>
  );
}
