// pages/phases/player.tsx

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/utils/supabaseClient';
import { signIn, useSession } from 'next-auth/react';

export default function PlayerPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { session_id, phase_id, phase_numbers, directions } = router.query;

  // phasesテーブルから select_tracks, select_tracks_user_id を取得
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);

  // 認証チェック
    useEffect(() => {
      // 未認証ならログイン促す（またはリダイレクト）
      if (status === 'unauthenticated') {
        signIn('spotify');
      }
    }, [status]);

  useEffect(() => {
    if (!phase_id) return;

    const fetchPhase = async () => {
      const { data, error } = await supabase
        .from('phases')
        .select('select_tracks, select_tracks_user_id')
        .eq('id', phase_id)
        .single();

      if (error || !data) {
        console.error('Failed to fetch phases:', error);
        return;
      }
      setSelectedTrackId(data.select_tracks);
    };
    fetchPhase();
  }, [phase_id]);

  const handleGotoDialogue = () => {
    // ページ下部に「対話セクションに移動する」ボタン → /phases/dialog
    router.push({
      pathname: '/phasesB/dialog',
      query: {
        session_id,
        phase_id,
        phase_numbers,
        directions
      }
    });
  };

  if (status === 'loading') {
    return <div>Loading...</div>;
  }
  if (!session) {
    return <div>Please login...</div>;
  }

  return (
    <div className="p-4">
      <h1>曲の再生ページ</h1>
      {selectedTrackId ? (
        <div className="mt-4">
          <p>選択されたTrackID: {selectedTrackId}</p>
          {/* iframe埋め込み 30秒プレビュー */}
          <iframe
            src={`https://open.spotify.com/embed/track/${selectedTrackId}`}
            width="100%"
            height="80"
            frameBorder="0"
            allow="encrypted-media"
          />
        </div>
      ) : (
        <p>まだ曲が選択されていません</p>
      )}

      <div className="mt-6">
        <button
          onClick={handleGotoDialogue}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          対話セクションに移動する
        </button>
      </div>
    </div>
  );
}
