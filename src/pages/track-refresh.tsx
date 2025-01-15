import React, { useState } from 'react';
import { useSession } from 'next-auth/react';

export default function RefreshSelfDisclosure() {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleRefresh = async () => {
    if (!session?.user?.id) {
      setMessage('ログインしてください。');
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/track-refresh', {
        method: 'POST', // POSTリクエストで計算のみ行う
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId, // ログイン中のユーザーIDを送信
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to refresh self-disclosure levels: ${response.status}`);
      }

      setMessage('自己開示度Lv.を再計算しました！');
    } catch (error) {
      console.error(error);
      setMessage('再計算中にエラーが発生しました。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">自己開示度Lv.をリフレッシュ</h1>
      <button
        onClick={handleRefresh}
        className={`px-4 py-2 rounded ${
          loading ? 'bg-gray-400' : 'bg-blue-500 text-white hover:bg-blue-600'
        }`}
        disabled={loading}
      >
        {loading ? '再計算中...' : '再計算'}
      </button>
      {message && <p className="mt-4 text-sm">{message}</p>}
    </div>
  );
}
