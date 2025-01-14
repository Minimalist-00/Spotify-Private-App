// pages/phases/index.tsx

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/utils/supabaseClient';

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

  // useState で session情報 や userA を管理
  const [userA, setUserA] = useState<string | null>(null); // sessions.user_a
  const [userB, setUserB] = useState<string | null>(null); // sessions.user_b

  // userA の曲一覧
  const [myTracks, setMyTracks] = useState<TrackData[]>([]);
  // 選択されたトラックID
  const [selectedTrack, setSelectedTrack] = useState<string>('');

  // ================================
  // 1) session_id が変化したら sessionsテーブルから userA, userB を取得
  // ================================
  useEffect(() => {
    if (!session_id) return;

    const fetchSessionUsers = async () => {
      const { data: sessData, error: sessError } = await supabase
        .from('sessions')
        .select('user_a, user_b')
        .eq('id', session_id)
        .single();

      if (sessError || !sessData) {
        console.error('Failed to fetch session user_a', sessError);
        return;
      }
      setUserA(sessData.user_a);
      setUserB(sessData.user_b);
    };

    fetchSessionUsers();
  }, [session_id]);

  // ================================
  // 2) userA が確定して、さらに directions===1 (自分が先のとき) に tracksをfetch
  // ================================
  useEffect(() => {
    console.log(userA)
    if (!userA) return;          // userAが取得できていない場合は動作しない
    if (directionNum !== 1) return;  // 自分が先の場合のみフェッチ

    const fetchMyTracks = async () => {
      // tracks の user_id = userA の曲を取得
      const { data, error } = await supabase
        .from('tracks')
        .select('*')
        .eq('user_id', userA);

      if (error) {
        console.error('fetch tracks error', error);
        return;
      }
      console.log(data.length)
      if (data) {
        setMyTracks(data as TrackData[]);
      }
      console.log(myTracks.length)
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

    // userA の "spotify_user_id" を usersテーブルから取得
    // userA (sessions.user_a) は "users.id" を指す想定
    const { data: userAData, error: userAError } = await supabase
      .from('users')
      .select('spotify_user_id')
      .eq('spotify_user_id', userA) // userA は users.id 
      .single();

    if (userAError || !userAData) {
      alert('自分のspotify_user_idが取得できません');
      return;
    }
    const userASpotifyId = userAData.spotify_user_id;

    // phases UPDATE
    const { error: upError } = await supabase
      .from('phases')
      .update({
        select_tracks: selectedTrack,
        select_tracks_user_id: userASpotifyId,
      })
      .eq('id', phase_id);

    if (upError) {
      console.error('Error updating phases:', upError);
      alert('曲の決定に失敗しました');
      return;
    }
    alert('曲を決定しました');
  };

  // ================================
  // UI
  // ================================
  if (directionNum === 0) {
    // 相手が先 => "相手の選択を待ってください"
    return (
      <div className="p-4">
        <h1>{phaseNumbersNum} フェーズ目です</h1>
        <p>相手の選択を待ってください。</p>
      </div>
    );
  }

  // directionNum===1 => 自分が先に選曲
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
            {track.name} (ID: {track.spotify_track_id})
          </label>
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
