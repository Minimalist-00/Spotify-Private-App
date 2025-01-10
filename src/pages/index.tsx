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
    <div className="relative flex flex-col min-h-screen bg-gray-900 text-white">
      {/* ヘッダー: タイトルやログアウトボタンをまとめる */}
      <header className="flex items-center justify-between p-4 bg-gray-800">
        <h1 className="text-xl font-bold">
          Spotify History App
        </h1>
        {session && (
          <div className="flex items-center space-x-4">
            {/* ユーザーアイコン */}
            {session.user?.image && (
              <Image
                src={session.user.image}
                alt="Profile"
                width={40}
                height={40}
                className="w-10 h-10 rounded-full"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = '/fallback.png';
                }}
              />
            )}
            {/* ログアウトボタン */}
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
      <main className="flex-1 flex flex-col items-center justify-center p-4">
        {!session ? (
          // ===== ログイン前 =====
          <div className="text-center">
            <h2 className="text-4xl font-bold mb-6">
              Welcome to Spotify History App
            </h2>
            <p className="text-lg text-gray-400 mb-8">
              Discover your listening history and favorite tracks.
            </p>
            <button
              onClick={handleLogin}
              className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white text-lg font-semibold rounded-lg shadow-md transition-all"
            >
              Login with Spotify
            </button>
          </div>
        ) : (
          // ===== ログイン後 =====
          <div className="container mx-auto px-4 py-8 flex-1">
            <h1 className="text-3xl font-bold text-center mb-8">曲の分類</h1>
            <p className="text-gray-400 text-center mb-8">
              ここではあなたの楽曲を「お気に入り度」と「歌えるかどうか」で分類します。
            </p>
            <ul className="flex justify-center sm:grid-cols-2 md:grid-cols-3 gap-6">
              <li className="bg-gray-800 text-white rounded-lg shadow-lg p-6 text-center hover:bg-gray-700 transition-colors">
                <Link href="/library" className="text-lg font-semibold hover:underline">
                  ライブラリへ
                </Link>
              </li>
            </ul>
          </div>
        )}
      </main>

      {/* フッター */}
      <footer className="p-4 bg-gray-800 text-center text-sm text-gray-400">
        © {new Date().getFullYear()} Spotify History App. All rights reserved.
      </footer>
    </div>
  );
}
