// pages/index.tsx

import Dashboard from '@/components/dashboard';
import { useSession, signIn, signOut } from 'next-auth/react';
import Image from 'next/image';

export default function Home() {
  const { data: session } = useSession();

  const handleLogin = () => {
    signIn('spotify');
  };

  const handleLogout = () => {
    signOut();
  };

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
      {/* ユーザーアイコンを右上に表示するためのコンテナ */}
      {session && (
        <div className="absolute top-4 right-4 flex items-center space-x-2">
          {/* ユーザーアイコン */}
          {session.user?.image && (
            <Image
              src={session.user.image}
              alt="Profile"
              width={50}
              height={50}
              className="w-10 h-10 rounded-full"
            />
          )}
          {/* ログアウトボタンをアイコン付近に置く場合 */}
          <button
            onClick={handleLogout}
            className="px-3 py-1 bg-red-500 hover:bg-red-600 rounded-md text-sm"
          >
            Logout
          </button>
        </div>
      )}

      {!session ? (
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-6">
            Welcome to Spotify History App
          </h1>
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
        <div className="text-center mt-10">
          <h1 className="text-4xl font-bold mb-6">
            Hello, {session.user?.name || 'User'}!
          </h1>
          <p className="text-lg text-gray-400 mb-8">
            You are logged in. Let&apos;s explore your Spotify history!
          </p>
          <Dashboard />
        </div>
      )}

      <footer className="mt-10 text-gray-600 text-sm">
        © {new Date().getFullYear()} Spotify History App. All rights reserved.
      </footer>
    </div>
  );
}
