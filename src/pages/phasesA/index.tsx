// pages/phases/index.tsx

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/utils/supabaseClient';
import Link from 'next/link';

type TrackData = {
  spotify_track_id: string;
  user_id: string;
  name: string;
  artist_name?: string;
  album_name?: string;
  image_url?: string;
  can_singing?: number | null;
  song_favorite_level?: number | null;
};

export default function PhasesPage() {
  const router = useRouter();
  const { session_id, phase_id, phase_numbers, directions } = router.query;

  const phaseNumbersNum = phase_numbers ? Number(phase_numbers) : 0;
  const directionNum = directions ? Number(directions) : 0;

  // sessionsテーブルから userA, userB 取得
  const [userA, setUserA] = useState<string | null>(null);

  // userA の曲一覧
  const [myTracks, setMyTracks] = useState<TrackData[]>([]);
  // 選択されたトラックID
  const [selectedTrack, setSelectedTrack] = useState('');

  // ================================
  // 1) session_id が変化したら sessionsテーブルから userA, userB を取得
  // ================================
  useEffect(() => {
    if (!session_id) return;

    const fetchSessionUsers = async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select('user_a, user_b')
        .eq('id', session_id)
        .single();

      if (error || !data) {
        console.error('Failed to fetch session user_a', error);
        return;
      }
      setUserA(data.user_a);
    };

    fetchSessionUsers();
  }, [session_id]);

  // ================================
  // 2) userA が確定 && directions===1 => userAの曲を fetch
  // ================================
  useEffect(() => {
    if (!userA) return;
    if (directionNum !== 1) return;

    const fetchMyTracks = async () => {
      const { data, error } = await supabase
        .from('tracks')
        .select('*')
        .eq('user_id', userA);
      if (error) {
        console.error('Error fetching tracks:', error);
        return;
      }
      if (data) {
        setMyTracks(data as TrackData[]);
      }
    };
    fetchMyTracks();
  }, [userA, directionNum]);

  // ================================
  // 3) 「曲を決定する」ボタン
  // ================================
  const handleSelectTrack = async () => {
    if (!phase_id || !selectedTrack) {
      alert('曲が選択されていません');
      return;
    }

    // userA の "spotify_user_id" を usersから取得
    const { data: userAData, error: userAError } = await supabase
      .from('users')
      .select('spotify_user_id')
      .eq('spotify_user_id', userA) 
      .single();
    if (userAError || !userAData) {
      alert('userAのspotify_user_id 取得失敗');
      return;
    }
    const userASpotifyId = userAData.spotify_user_id;

    // phases update
    const { error: upError } = await supabase
      .from('phases')
      .update({
        select_tracks: selectedTrack,
        select_tracks_user_id: userASpotifyId,
      })
      .eq('id', phase_id);

    if (upError) {
      console.error('phases update error:', upError);
      alert('曲の決定に失敗しました');
      return;
    }
    alert('曲を決定しました');
    // player画面へ
    router.push({
      pathname: '/phasesA/player',
      query: {
        session_id,
        phase_id,
        phase_numbers,
        directions,
      },
    });
  };

  const handleGotoDialogue = () => {
    // ページ下部に「対話セクションに移動する」ボタン → /phases/dialog
    router.push({
      pathname: '/phasesA/dialog',
      query: {
        session_id,
        phase_id,
        phase_numbers,
        directions
      }
    });
  };

  // ================================
  // 追加: phase_numbers=9 のとき => 終了画面
  // ================================
  if (phaseNumbersNum === 9) {
    return (
      <div className="p-4 text-center">
        <h1 className="text-2xl font-bold mb-4">ご協力ありがとうございました</h1>
        <Link href="/" className="text-blue-500 underline">
          トップに戻る
        </Link>
      </div>
    );
  }

  // ================================
  // UI分岐
  // ================================
  if (directionNum === 0) {
    return (
      <div className="p-4">
        <h1>{phaseNumbersNum} フェーズ目です</h1>
        <p>相手の選択した楽曲を聴きましょう。</p>
        <button
          onClick={handleGotoDialogue}
          className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
        >
          対話セクションに移動する
        </button>
      </div>
    );
  }

  // directionNum=1 => 自分が先行
  return (
    <div className="p-4">
      <h1>{phaseNumbersNum} フェーズ目です</h1>
      <p>あなたが先に曲を選びます。お気に入りの曲を選択してください。</p>

      {myTracks.map((track) => (
        <div key={track.spotify_track_id} className="mb-2 border-b pb-2">
          <label>
            <input
              type="radio"
              name="selectedTrack"
              value={track.spotify_track_id}
              checked={selectedTrack === track.spotify_track_id}
              onChange={() => setSelectedTrack(track.spotify_track_id)}
            />
            {track.name}
          </label>
          <p>{track.artist_name}</p>
        </div>
      ))}

      <button
        onClick={handleSelectTrack}
        className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
      >
        曲を決定する
      </button>
    </div>
  );
}
